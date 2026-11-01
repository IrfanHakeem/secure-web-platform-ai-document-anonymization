# Secura — OWASP Top 10 Security Hardening Report

## Overview

Secura is a FastAPI + React platform for automated AI document anonymization with
PII detection, role-based access control, Fernet-encrypted file storage, and a
full audit trail. This report documents the security audit performed against the
OWASP Top 10 and the hardening changes applied as a result.

## Threat Model

Three roles with strict separation of duties:

| Role | Capabilities |
|---|---|
| **User** | Upload, anonymize, share documents within department, request original files |
| **Security Officer** | Review original files via approval workflow, monitor audit logs and alerts |
| **Administrator** | User/department management, password resets |

Core security invariants:
- Original documents are Fernet-encrypted at rest and SHA-256 integrity-verified on every decrypt.
- PII never leaves as original — anonymization replaces it with synthetic Faker data.
- Every action is audit-logged with user ID, resource ID, and source IP.

---

## OWASP Top 10 Mapping

### A01 — Broken Access Control
**Status: Compliant (hardened)**

- `get_current_user` + `require_role` dependency guards every endpoint.
- Object-level authorization (`owner_id != current_user.id`) enforced on all document operations.
- **Fix applied:** `request_original_file` previously allowed any `User` to request an
  original file for any document ID (auto-increment → brute-forceable), leaking existence
  and filename of private documents. Now requires a `DocumentShare` relation between the
  document and the requester's department before a request is accepted.

### A02 — Cryptographic Failures
**Status: Compliant**

- bcrypt for password hashing (constant-time, salted).
- Fernet (AES-128-CBC + HMAC-SHA256) for file encryption at rest.
- SHA-256 integrity hash verified on every decrypt and before security approval.
- Secrets loaded from environment with hard `RuntimeError` on missing keys.
- `.env` confirmed git-ignored (verified via `git check-ignore`).

### A03 — Injection
**Status: Compliant**

- All database access via SQLAlchemy ORM / `select()` — no string-concatenated SQL.
- No shell command execution or interpolation.
- File paths generated server-side (`uuid4().hex`), never from user input — no path traversal.

### A04 — Insecure Design
**Status: Compliant (hardened)**

- Coherent threat model with synthetic-data-first design.
- OTP flow invalidates prior OTPs and caps verification attempts at 5.
- **Fix applied:** Added rate limiting to `/auth/login` (10/min/IP) and
  `/auth/admin-forgot-password` (3/min/IP) to prevent brute-force and email bombing.

### A05 — Security Misconfiguration
**Status: Compliant (hardened)**

- CORS locked to explicit localhost origins.
- **Fix applied:** Global exception handler now logs full tracebacks server-side while
  returning a generic `{"detail": "Internal server error"}` to clients — no internals leak.

### A06 — Vulnerable Components
**Status: Compliant (hardened)**

- All 20 dependencies pinned to exact versions in `requirements.txt`.
- `pip-audit` found **23 known vulnerabilities** in `pyjwt` (2) and `pypdf` (21).
- **Fix applied:** Upgraded `pyjwt 2.14.0 → 2.15.0` and `pypdf 6.18.1 → 6.21.4`.
  Re-audit result: **"No known vulnerabilities found."**

### A07 — Identification & Auth Failures
**Status: Compliant (hardened)**

- JWT with 60-minute expiry, bcrypt password hashing, constant-time OTP comparison.
- **Fix applied:** Password strength policy — minimum 12 characters, must contain
  lowercase, uppercase, digit, and special character. Enforced on admin user creation,
  admin password reset, and admin-triggered password reset.

### A08 — Software & Data Integrity Failures
**Status: Compliant**

- SHA-256 verified on every decrypt.
- Integrity re-checked before security approval (`SECURITY_APPROVAL_BLOCKED_INTEGRITY`).
- Fernet HMAC catches any ciphertext tampering.

### A09 — Logging & Monitoring
**Status: Compliant**

- Every login, upload, share, access denial, download, and admin action is audit-logged
  with user ID, resource ID, and IP address.
- Failed logins and unauthorized access attempts logged with source IP.

### A10 — SSRF
**Status: Not applicable**

- The "AI" component is local regex-based PII detection (`detect_pii`) — no outbound
  URL fetches exist. No user input reaches a URL fetch. No SSRF surface.

---

## Hardening Changes Summary

| # | Change | Files | Vulnerability Addressed |
|---|---|---|---|
| 1 | Sliding-window rate limiter (in-memory) | `app/core/rate_limit.py`, `app/api/auth.py` | A04, A07 (brute-force, email bombing) |
| 2 | Global exception handler (traceback suppression) | `app/main.py` | A05 (information disclosure) |
| 3 | Password strength validator (12+ chars, 4 classes) | `app/core/security.py`, `app/api/auth.py`, `app/api/admin_users.py` | A07 (weak passwords) |
| 4 | Dependency pinning + CVE remediation | `requirements.txt` | A06 (vulnerable components) |
| 5 | IDOR fix (original-file request requires department share) | `app/api/original_file_requests.py` | A01 (broken access control) |
| 6 | Download bounding (3 downloads / 30-min window) | `app/api/original_file_requests.py`, `app/models/original_file_request.py`, `migrate_add_original_download_limits.py` | A01 (unbounded exfiltration) |
| 7 | `get_client_ip` deduplication (10 → 1 shared helper) | `app/core/client.py`, 10 API routers | Code quality / maintainability |

---

## Verification

A `test_security.ps1` suite exercises the fixes against the running server:

| Test | Result |
|---|---|
| Login rate limiting (10/min) → 429 on 11th attempt | PASS |
| OTP rate limiting (3/min) → 429 on 4th attempt | PASS |
| Password strength policy → 400 on weak password | PASS |
| IDOR protection → 403 on existing-but-unshared document | PASS |
| Exception handler → no traceback in error responses | PASS |

Run with:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_security.ps1
```

---

## Remaining Recommendations (out of scope)

1. **Multi-worker deployment:** The rate limiter is in-memory and resets on restart.
   For production with multiple Uvicorn workers, swap the backing store to Redis.
2. **TrustedHostMiddleware:** Add for production to prevent host-header attacks.
3. **Automated dependency scanning in CI:** Schedule `pip-audit` to catch new CVEs.
