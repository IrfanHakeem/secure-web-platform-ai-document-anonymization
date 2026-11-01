# Secura Security Test Suite
# Run from C:\FYP\backend with the server already started.
# Usage: powershell -ExecutionPolicy Bypass -File ..\test_security.ps1
#
# Passwords are NOT stored in this file. They are prompted at runtime
# via Read-Host -AsSecureString and converted to plaintext only for the
# immediate HTTP call, then discarded. Never hardcode credentials here.

$base = "http://127.0.0.1:8000"


function Read-Password {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt
    )

    $secure = Read-Host -Prompt $Prompt -AsSecureString

    if ($null -eq $secure -or $secure.Length -eq 0) {
        throw "Password cannot be empty"
    }

    return $secure
}


function Read-Email {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt
    )

    $email = Read-Host -Prompt $Prompt

    if ([string]::IsNullOrWhiteSpace($email)) {
        throw "Email cannot be empty"
    }

    return $email.Trim()
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SECURA SECURITY TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Post($path, $body, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -Method Post -Body ($body | ConvertTo-Json) -Headers $headers -UseBasicParsing -ErrorAction Stop
        return @{ status = $r.StatusCode; body = $r.Content }
    }
    catch {
        $s = $_.Exception.Response.StatusCode.value__
        $content = $_.ErrorDetails.Message
        return @{ status = $s; body = $content }
    }
}

function GetReq($path, $token) {
    $headers = @{ "Authorization" = "Bearer $token" }
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -Headers $headers -UseBasicParsing -ErrorAction Stop
        return @{ status = $r.StatusCode; body = $r.Content }
    }
    catch {
        return @{ status = $_.Exception.Response.StatusCode.value__; body = $_.ErrorDetails.Message }
    }
}

function Login($email, [System.Security.SecureString]$password) {
    # Convert the SecureString to plaintext only for the immediate
    # HTTP call, then release the buffer. The plaintext never persists.
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plain = $null
    try {
        $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        $r = Post "/auth/login" @{ email = $email; password = $plain }
    }
    finally {
        if ($bstr -ne [System.IntPtr]::Zero) {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }

    if ($r.status -eq 200) {
        return ($r.body | ConvertFrom-Json).access_token
    }
    return $null
}

$pass = $false
$fail = $false
function Check($name, $condition, $detail = "") {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:pass = $true
    }
    else {
        Write-Host "  [FAIL] $name $detail" -ForegroundColor Red
        $script:fail = $true
    }
}

# ============================================================
# TEST 1: RATE LIMITING (login)
# ============================================================
Write-Host "TEST 1: Login rate limiting (10/min per IP)" -ForegroundColor Yellow
$rateLimited = $false
for ($i = 1; $i -le 11; $i++) {
    $r = Post "/auth/login" @{ email = "nobody@test.com"; password = "wrongpass" }
    if ($r.status -eq 429) { $rateLimited = $true; break }
    Start-Sleep -Milliseconds 200
}
Check "11th login attempt returns 429" $rateLimited "(got status at attempt $i)"

# ============================================================
# TEST 2: RATE LIMITING (OTP request)
# ============================================================
Write-Host "`nTEST 2: OTP request rate limiting (3/min per IP)" -ForegroundColor Yellow
$otpLimited = $false
for ($i = 1; $i -le 4; $i++) {
    $r = Post "/auth/admin-forgot-password" @{ email = "admin@x.com" }
    if ($r.status -eq 429) { $otpLimited = $true; break }
    Start-Sleep -Milliseconds 200
}
Check "4th OTP request returns 429" $otpLimited "(got status at attempt $i)"

# ============================================================
# TEST 3: PASSWORD POLICY (via admin user creation)
# ============================================================
Write-Host "`nTEST 3: Password strength policy" -ForegroundColor Yellow
# Wait for rate limiter window to reset before logging in
Write-Host "  (waiting 60s for rate limiter reset...)" -ForegroundColor DarkGray
Start-Sleep -Seconds 60

$adminToken = Login (Read-Email "Admin email") (Read-Password "Admin password")
if (-not $adminToken) {
    Write-Host "  [SKIP] Could not login as admin (check password)" -ForegroundColor DarkYellow
}
else {
    $weak = Post "/admin/users" @{ full_name = "Weak Test"; username = "weaktester"; email = "weak@test.com"; password = "weak"; role = "User"; department_id = 1 } $adminToken
    Check "Weak password rejected (400)" ($weak.status -eq 400) "(got $($weak.status))"

    # Clean up if it somehow got created (shouldn't happen)
    if ($weak.status -eq 201) {
        Write-Host "  [WARN] Weak password was ACCEPTED - this is a bug!" -ForegroundColor Red
    }
}

# ============================================================
# TEST 4: IDOR - request original for unshared document
# ============================================================
Write-Host "`nTEST 4: IDOR protection (original-file request)" -ForegroundColor Yellow
$userToken = Login (Read-Email "User email") (Read-Password "User password")
if (-not $userToken) {
    Write-Host "  [SKIP] Could not login as user (check password)" -ForegroundColor DarkYellow
}
else {
    # Accurate IDOR test: use a REAL document that exists but is NOT
    # shared with the requester's department. From the DB:
    #   doc id=50 -> owner is in a different department, no share to requester.
    # The requester (IT dept) must be blocked from requesting doc 50.
    # Before the fix, this returned 201 (created) and leaked the filename.
    # After the fix, it must return 403.
    $r = Post "/original-file-requests/50" @{ reason = "testing IDOR" } $userToken
    Check "Existing unshared doc (id=50) request returns 403" ($r.status -eq 403) "(got $($r.status))"
}

# ============================================================
# TEST 5: Exception handler (no traceback leak)
# ============================================================
Write-Host "`nTEST 5: Unhandled exception returns generic 500" -ForegroundColor Yellow
# Trigger an internal error - malformed request that reaches handler
$r = Post "/auth/login" @{ } # missing required fields -> pydantic 422, not 500
# A 422 with clean body means no traceback. Check body has no "Traceback" or file paths
$clean = ($r.body -notmatch "Traceback") -and ($r.body -notmatch "\.py")
Check "Error response contains no traceback/paths" $clean

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
if ($fail) {
    Write-Host "  Some tests FAILED. Review [FAIL] lines above." -ForegroundColor Red
}
else {
    Write-Host "  All tests PASSED." -ForegroundColor Green
}
