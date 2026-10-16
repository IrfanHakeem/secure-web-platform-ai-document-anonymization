import { useEffect, useState } from 'react'
import { LoaderCircle, ShieldCheck, RefreshCw } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// SECURA V15.7.1 — Refresh UX only.
// Authentication is NEVER bypassed. Protected pages still wait for /auth/verify.
// A quiet theme-matched background replaces the old white-screen flash.
function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [showStatus, setShowStatus] = useState(false)
  const [takingLong, setTakingLong] = useState(false)

  useEffect(() => {
    if (!loading) return undefined

    // Fast session verification will not show a distracting loader.
    const statusTimer = window.setTimeout(() => setShowStatus(true), 550)
    const slowTimer = window.setTimeout(() => setTakingLong(true), 9000)

    return () => {
      window.clearTimeout(statusTimer)
      window.clearTimeout(slowTimer)
    }
  }, [loading])

  if (loading) {
    return (
      <>
        <style>{`
          .secura-verify-screen {
            min-height: 100vh;
            min-height: 100dvh;
            display: grid;
            place-items: center;
            position: relative;
            overflow: hidden;
            padding: 30px;
            background: #0d1020;
            color: #f4f2ff;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system,
              BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .secura-verify-screen::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(ellipse at 14% 8%, rgba(128, 80, 225, .12), transparent 39%),
              radial-gradient(ellipse at 90% 92%, rgba(65, 145, 217, .06), transparent 42%);
          }
          .secura-verify-inner {
            position: relative;
            z-index: 1;
            display: grid;
            justify-items: center;
            gap: 12px;
            text-align: center;
            max-width: 340px;
            animation: secura-verify-enter .25s ease-out both;
          }
          .secura-verify-emblem {
            width: 53px;
            height: 53px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(192, 160, 255, .33);
            border-radius: 17px;
            background: rgba(126, 84, 212, .15);
            color: #bca1ff;
          }
          .secura-verify-title {
            margin: 2px 0 0;
            font-size: 13px;
            font-weight: 750;
            letter-spacing: .005em;
          }
          .secura-verify-description {
            margin: 0;
            color: #a6aec6;
            font-size: 11px;
            line-height: 1.7;
          }
          .secura-verify-spinner {
            display: inline-block;
            margin: 2px 0;
            color: #b28bff;
            animation: secura-verify-spin 1.4s linear infinite;
          }
          .secura-verify-retry {
            margin-top: 7px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(126, 84, 212, .14);
            color: inherit;
            border: 1px solid rgba(180, 153, 255, .36);
            border-radius: 10px;
            padding: 9px 13px;
            font-size: 11px;
            font-weight: 750;
            cursor: pointer;
          }
          .secura-verify-retry:hover { border-color: #ab87f8; }
          .secura-verify-retry:focus-visible {
            outline: 3px solid #a98df9;
            outline-offset: 3px;
          }
          html[data-theme="light"] .secura-verify-screen {
            background: #f5f6fc;
            color: #22253b;
          }
          html[data-theme="light"] .secura-verify-emblem {
            color: #8056de;
            background: #ede9fc;
            border-color: #d9cef9;
          }
          html[data-theme="light"] .secura-verify-description { color: #6c7592; }
          html[data-theme="light"] .secura-verify-retry {
            background: #fff;
            border-color: #d9d2f1;
          }
          @keyframes secura-verify-spin { to { transform: rotate(360deg); } }
          @keyframes secura-verify-enter {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .secura-verify-inner, .secura-verify-spinner { animation: none !important; }
          }
        `}</style>
        <div className="secura-verify-screen" aria-busy="true">
          {showStatus && (
            <div className="secura-verify-inner" role="status" aria-live="polite">
              <span className="secura-verify-emblem"><ShieldCheck size={27} /></span>
              <LoaderCircle className="secura-verify-spinner" size={17} aria-hidden="true" />
              <p className="secura-verify-title">
                {takingLong ? 'Secure connection is taking longer' : 'Restoring your workspace'}
              </p>
              <p className="secura-verify-description">
                {takingLong
                  ? 'SECURA is still verifying your session. Check that the FastAPI backend is running.'
                  : 'Verifying your session securely.'}
              </p>
              {takingLong && (
                <button type="button" className="secura-verify-retry"
                  onClick={() => window.location.reload()}>
                  <RefreshCw size={14} aria-hidden="true" /> Try again
                </button>
              )}
            </div>
          )}
        </div>
      </>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

export default ProtectedRoute
