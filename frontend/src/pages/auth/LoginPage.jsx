import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  FileLock2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { ROLES } from '../../utils/roles'
import './LoginNeo.css'

function getDashboardPath(role) {
  if (role === ROLES.ADMINISTRATOR) return '/admin/dashboard'
  if (role === ROLES.SECURITY_OFFICER) return '/security/dashboard'
  return '/user/dashboard'
}

function getInitialTheme() {
  if (typeof document === 'undefined') return 'dark'
  const active = document.documentElement.dataset.theme
  if (active === 'light' || active === 'dark') return active
  try {
    return window.localStorage.getItem('secura-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const changeTheme = (event) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const html = document.documentElement
    const applyTheme = () => {
      html.dataset.theme = next
      try {
        window.localStorage.setItem('secura-theme', next)
      } catch {
        // Theme remains usable if local storage is unavailable.
      }
      setTheme(next)
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || prefersReducedMotion) {
      applyTheme()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    html.style.setProperty('--secura-login-wave-x', `${x}px`)
    html.style.setProperty('--secura-login-wave-y', `${y}px`)
    html.classList.add('secura-login-theme-wave')
    const transition = document.startViewTransition(applyTheme)
    transition.finished.finally(() => html.classList.remove('secura-login-theme-wave'))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter your work email and password.')
      return
    }

    setSubmitting(true)
    try {
      const authenticatedUser = await login(cleanEmail, password)
      navigate(getDashboardPath(authenticatedUser.role), { replace: true })
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Invalid email or password. Please try again.'
          : 'Unable to sign in. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="secura-neo-login" data-login-theme={theme}>
      <div className="secura-neo-login__layout">
        <section className="secura-neo-login__story" aria-label="About SECURA">
          <div className="secura-neo-login__story-glow" aria-hidden="true" />
          <div className="secura-neo-login__story-grid" aria-hidden="true" />
          <div className="secura-neo-login__story-inner">
            <div className="secura-neo-login__brand">
              <span className="secura-neo-login__brand-logo"><ShieldCheck size={23} strokeWidth={1.8} /></span>
              <span className="secura-neo-login__brand-copy">
                <b>SECURA<span>.</span></b>
                <small>SMART SECURITY WORKSPACE</small>
              </span>
            </div>

            <div className="secura-neo-login__story-content">
              <div className="secura-neo-login__pill"><span className="secura-neo-login__pill-dot" /> AI-ASSISTED DOCUMENT PRIVACY</div>
              <h1>Protect what matters.<br /><span>Share with confidence.</span></h1>
              <p>Detect sensitive details, anonymize documents and share information safely — all in one simple workspace for your team.</p>

              <div className="secura-neo-login__visual" aria-hidden="true">
                <div className="secura-neo-login__visual-orbit secura-neo-login__visual-orbit--outer" />
                <div className="secura-neo-login__visual-orbit secura-neo-login__visual-orbit--inner" />
                <div className="secura-neo-login__visual-sheen" />
                <div className="secura-neo-login__visual-shield"><ShieldCheck size={69} strokeWidth={1.3} /></div>
                <div className="secura-neo-login__visual-file secura-neo-login__visual-file--left">
                  <div className="secura-neo-login__file-heading"><FileLock2 size={15} /> ORIGINAL FILE</div>
                  <span className="secura-neo-login__file-line is-long" />
                  <span className="secura-neo-login__file-line is-sensitive" />
                  <span className="secura-neo-login__file-line is-medium" />
                  <span className="secura-neo-login__file-line is-sensitive is-short" />
                </div>
                <div className="secura-neo-login__visual-file secura-neo-login__visual-file--right">
                  <div className="secura-neo-login__file-heading"><FileCheck2 size={15} /> PROTECTED COPY</div>
                  <span className="secura-neo-login__file-line is-long" />
                  <span className="secura-neo-login__file-line is-protected" />
                  <span className="secura-neo-login__file-line is-medium" />
                  <span className="secura-neo-login__file-line is-protected is-short" />
                </div>
                <div className="secura-neo-login__visual-toast"><Check size={16} /><span>Sensitive data protected</span></div>
                <span className="secura-neo-login__visual-spark secura-neo-login__visual-spark--one"><Sparkles size={22} /></span>
                <span className="secura-neo-login__visual-spark secura-neo-login__visual-spark--two"><Sparkles size={16} /></span>
              </div>

            </div>

            <p className="secura-neo-login__story-footer">SECURA <span>·</span> Designed for secure everyday work</p>
          </div>
        </section>

        <section className="secura-neo-login__entry" aria-label="Sign in">
          <div className="secura-neo-login__entry-top">
            <div className="secura-neo-login__mobile-brand">
              <span className="secura-neo-login__brand-logo"><ShieldCheck size={21} /></span>
              <b>SECURA<span>.</span></b>
            </div>
            <button type="button" className="secura-neo-login__mode" onClick={changeTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="secura-neo-login__mode-switch" aria-hidden="true"><span /></span>
            </button>
          </div>

          <div className="secura-neo-login__entry-center">
            <div className="secura-neo-login__entry-head">
              <div className="secura-neo-login__entry-mark"><LockKeyhole size={22} /></div>
              <p className="secura-neo-login__eyebrow">WELCOME BACK</p>
              <h2>Sign in to <span>SECURA.</span></h2>
              <p>Enter your work credentials to continue to your secure workspace.</p>
            </div>

            <form className="secura-neo-login__form" onSubmit={handleSubmit} noValidate>
              <div className="secura-neo-login__field-group">
                <label htmlFor="secura-login-email">Work email address</label>
                <div className="secura-neo-login__field">
                  <Mail size={19} aria-hidden="true" />
                  <input id="secura-login-email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.com" value={email} disabled={submitting} onChange={(event) => { setEmail(event.target.value); if (error) setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'secura-login-error' : undefined} required />
                </div>
              </div>
              <div className="secura-neo-login__field-group">
                <div className="secura-neo-login__label-row">
                  <label htmlFor="secura-login-password">Password</label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
                <div className="secura-neo-login__field">
                  <KeyRound size={19} aria-hidden="true" />
                  <input id="secura-login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} disabled={submitting} onChange={(event) => { setPassword(event.target.value); if (error) setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'secura-login-error' : undefined} required />
                  <button type="button" className="secura-neo-login__reveal" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && <div className="secura-neo-login__error" id="secura-login-error" role="alert"><LockKeyhole size={17} /><span>{error}</span></div>}

              <button className="secura-neo-login__submit" type="submit" disabled={submitting}>
                {submitting ? <><LoaderCircle size={18} className="secura-neo-login__loading" /> Signing in...</> : <>Access my workspace <ArrowRight size={19} /></>}
              </button>
            </form>

            <div className="secura-neo-login__safe-note"><ShieldCheck size={17} /><span>Only authorized SECURA members can access this platform.</span></div>
          </div>

          <p className="secura-neo-login__entry-bottom">Protected workspace <span aria-hidden="true">·</span> Simple, secure document handling</p>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
