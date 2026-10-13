import { useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  FileLock2,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import SecuraLogoMark from '../../components/SecuraLogoMark'
import { useAuth } from '../../context/useAuth'
import { ROLES } from '../../utils/roles'
import './LoginPage.css'

function getDashboardPath(role) {
  if (role === ROLES.ADMINISTRATOR) return '/admin/dashboard'
  if (role === ROLES.SECURITY_OFFICER) return '/security/dashboard'
  return '/user/dashboard'
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const visualRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleStoryPointerMove = (event) => {
    const visual = visualRef.current
    if (!visual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    visual.style.setProperty('--slx-shift-x', `${(x * 16).toFixed(1)}px`)
    visual.style.setProperty('--slx-shift-y', `${(y * 12).toFixed(1)}px`)
  }

  const resetStoryPointer = () => {
    visualRef.current?.style.setProperty('--slx-shift-x', '0px')
    visualRef.current?.style.setProperty('--slx-shift-y', '0px')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      const authenticatedUser = await login(cleanEmail, password)
      navigate(getDashboardPath(authenticatedUser.role), { replace: true })
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.')
      } else if (err.response?.status === 403) {
        setError('This account is inactive or access is restricted.')
      } else {
        setError('Unable to sign in. Please check the server connection and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="slx-login">
      <div className="slx-login__ambient slx-login__ambient--one" aria-hidden="true" />
      <div className="slx-login__ambient slx-login__ambient--two" aria-hidden="true" />

      <div className="slx-login__layout">
        <section
          className="slx-story"
          aria-label="Secura secure document workspace"
          onPointerMove={handleStoryPointerMove}
          onPointerLeave={resetStoryPointer}
        >
          <div className="slx-story__grid" aria-hidden="true" />
          <div className="slx-story__glow slx-story__glow--top" aria-hidden="true" />
          <div className="slx-story__glow slx-story__glow--bottom" aria-hidden="true" />
          <div className="slx-story__sweep" aria-hidden="true" />

          <div className="slx-brand">
            <SecuraLogoMark />
            <span className="slx-brand__copy">
              <strong>Secura</strong>
              <small>DOCUMENT PRIVACY WORKSPACE</small>
            </span>
          </div>

          <div className="slx-story__content">
            <span className="slx-story__eyebrow">
              <span className="slx-story__eyebrow-dot" />
              SECURE DOCUMENT WORKSPACE
            </span>
            <h1>
              Protect the <span>original.</span>
              <br />
              Share the <em>essential.</em>
            </h1>
            <p>
              Turn sensitive documents into privacy-ready files with AI anonymization,
              controlled original access and traceable approvals.
            </p>

            <div className="slx-story__features" aria-label="Platform capabilities">
              <span><Sparkles size={15} /> AI anonymization</span>
              <span><LockKeyhole size={15} /> Controlled access</span>
              <span><FileCheck2 size={15} /> Verified originals</span>
            </div>
          </div>

          <div className="slx-visual" ref={visualRef} aria-hidden="true">
            <div className="slx-visual__halo" />
            <div className="slx-visual__orbit slx-visual__orbit--outer" />
            <div className="slx-visual__orbit slx-visual__orbit--inner" />
            <div className="slx-visual__trace slx-visual__trace--one" />
            <div className="slx-visual__trace slx-visual__trace--two" />
            <div className="slx-visual__spark slx-visual__spark--one" />
            <div className="slx-visual__spark slx-visual__spark--two" />
            <div className="slx-visual__spark slx-visual__spark--three" />
            <div className="slx-visual__document slx-visual__document--back">
              <span /> <span /> <span />
            </div>
            <div className="slx-visual__document slx-visual__document--mid">
              <span /> <span /> <span />
            </div>
            <div className="slx-visual__document slx-visual__document--front">
              <div className="slx-visual__document-head">
                <FileLock2 size={31} strokeWidth={1.6} />
                <span><Check size={13} strokeWidth={3} /></span>
              </div>
              <div className="slx-visual__document-lines"><i /><i /><i /></div>
              <div className="slx-visual__scan" />
            </div>
            <div className="slx-visual__tag slx-visual__tag--top">
              <span><Fingerprint size={16} /></span>
              <b>SENSITIVE DATA</b>
              <small>Detected &amp; protected</small>
            </div>
            <div className="slx-visual__tag slx-visual__tag--bottom">
              <span><ShieldCheck size={16} /></span>
              <b>SECURE ACCESS</b>
              <small>Approval controlled</small>
            </div>
          </div>

          <div className="slx-story__footer">
            <span className="slx-story__footer-mark" />
            Privacy at every step. Built for responsible document handling.
          </div>
        </section>

        <section className="slx-auth" aria-labelledby="slx-login-title">
          <div className="slx-auth__mobile-brand">
            <SecuraLogoMark />
            <span><strong>Secura</strong><small>DOCUMENT PRIVACY WORKSPACE</small></span>
          </div>

          <div className="slx-auth__card">
            <div className="slx-auth__card-top">
              <span className="slx-auth__icon"><LockKeyhole size={24} strokeWidth={1.8} /></span>
              <span className="slx-auth__eyebrow">WELCOME BACK</span>
              <h2 id="slx-login-title">Sign in to <span>Secura.</span></h2>
              <p>Enter your credentials to continue to your secure workspace.</p>
            </div>

            <form className="slx-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="slx-email">Email address</label>
              <div className="slx-form__field">
                <Mail size={19} aria-hidden="true" />
                <input
                  id="slx-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  name="email"
                  placeholder="name@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="slx-form__password-top">
                <label htmlFor="slx-password">Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <div className="slx-form__field">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  id="slx-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  name="password"
                  placeholder="Enter your password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="slx-form__eye"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {error && <p className="slx-form__error" role="alert">{error}</p>}

              <button className="slx-form__submit" type="submit" disabled={submitting}>
                {submitting ? <LoaderCircle size={18} className="slx-spin" /> : <span className="slx-form__submit-icon"><ShieldCheck size={18} /></span>}
                <span>{submitting ? 'Signing you in...' : 'Sign in securely'}</span>
                {!submitting && <ArrowRight className="slx-form__submit-arrow" size={18} />}
              </button>
            </form>

            <div className="slx-auth__separator"><span>PROTECTED ACCESS</span></div>
            <div className="slx-auth__notice">
              <ShieldCheck size={18} aria-hidden="true" />
              <p>Only authorized users can access this platform. Permissions are enforced by account role.</p>
            </div>
          </div>

          <p className="slx-auth__bottom">SECURA <span /> SECURE WEB PLATFORM FOR AI DOCUMENT ANONYMIZATION</p>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
