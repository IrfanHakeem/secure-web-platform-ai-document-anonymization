import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import api from '../../api/client'
import SecuraLogoMark from '../../components/SecuraLogoMark'
import './LoginPage.css'
import './AdminPasswordRecovery.css'

const emptyOtp = () => Array(6).fill('')

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

function maskEmail(address) {
  const [local, domain] = address.split('@')
  if (!local || !domain) return address
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

const journey = [
  { key: 'email', number: '01', label: 'Your email', icon: Mail },
  { key: 'otp', number: '02', label: 'Verify identity', icon: Fingerprint },
  { key: 'password', number: '03', label: 'New password', icon: LockKeyhole },
]

function AdminPasswordRecovery() {
  const navigate = useNavigate()
  const otpRefs = useRef([])

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(emptyOtp)
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return undefined
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000)
    return () => window.clearInterval(timer)
  }, [step, countdown])

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus()
  }, [step])

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const requestOtp = async () => {
    if (loading) return
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setError('Administrator email is required.')
      return
    }
    setLoading(true)
    clearFeedback()
    try {
      await api.post('/auth/admin-forgot-password', { email: normalized })
      setEmail(normalized)
      setOtp(emptyOtp())
      setResetToken('')
      setCountdown(30)
      setStep('otp')
      setMessage('If this is the registered Administrator email, a verification code has been sent.')
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to request the verification code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, raw) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length > 1) {
      const next = emptyOtp()
      digits.slice(0, 6).split('').forEach((digit, position) => { next[position] = digit })
      setOtp(next)
      otpRefs.current[Math.min(digits.length, 5)]?.focus()
      return
    }
    setOtp((current) => {
      const next = [...current]
      next[index] = digits
      return next
    })
    if (digits && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = emptyOtp()
    digits.split('').forEach((digit, index) => { next[index] = digit })
    setOtp(next)
    otpRefs.current[Math.min(digits.length, 5)]?.focus()
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    if (loading) return
    const otpValue = otp.join('')
    if (otpValue.length !== 6) {
      setError('Enter the complete 6-digit OTP.')
      return
    }
    setLoading(true)
    clearFeedback()
    try {
      const response = await api.post('/auth/admin-verify-otp', { email, otp: otpValue })
      if (!response.data?.reset_token) throw new Error('Missing reset token')
      setResetToken(response.data.reset_token)
      setStep('password')
      setMessage('Verification successful. Create a new Administrator password.')
    } catch (verifyError) {
      setError(getApiError(verifyError, 'Unable to verify the code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    if (loading) return
    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.')
      return
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError('Password exceeds the supported length (72 bytes).')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }
    if (!resetToken) {
      setError('Your reset session expired. Request a new verification code.')
      return
    }
    setLoading(true)
    clearFeedback()
    try {
      await api.post('/auth/admin-reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      })
      setResetToken('')
      setOtp(emptyOtp())
      setNewPassword('')
      setConfirmPassword('')
      setStep('success')
    } catch (resetError) {
      setError(getApiError(resetError, 'Unable to update your password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = step === 'success' ? 3 : journey.findIndex((item) => item.key === step)

  return (
    <main className="slx-login srx-recovery">
      <div className="slx-login__layout">
        <section className="slx-story srx-story" aria-label="Secura account recovery">
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

          <div className="srx-story__copy">
            <span className="slx-story__eyebrow"><span className="slx-story__eyebrow-dot" />ACCOUNT RECOVERY</span>
            <h1>Back to your <span>workspace.</span></h1>
            <p>Recover Administrator access with a verification code and a new password.</p>

            <div className="srx-journey" aria-label="Recovery stages">
              {journey.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.key} className={`srx-journey__step ${index < stepIndex ? 'is-complete' : ''} ${index === stepIndex ? 'is-current' : ''}`}>
                    <span className="srx-journey__number">{index < stepIndex ? <Check size={17} /> : <Icon size={17} />}</span>
                    <span><small>STEP {item.number}</small><b>{item.label}</b></span>
                    {index < stepIndex && <CheckCircle2 className="srx-journey__check" size={17} />}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="srx-story__art" aria-hidden="true">
            <span className="srx-story__ring srx-story__ring--outer" />
            <span className="srx-story__ring srx-story__ring--inner" />
            <span className="srx-story__spark srx-story__spark--one" />
            <span className="srx-story__spark srx-story__spark--two" />
            <span className="srx-story__art-core"><KeyRound size={38} /></span>
          </div>

          <p className="srx-story__footer">Restricted to the registered Administrator account.</p>
        </section>

        <section className="slx-auth srx-auth" aria-label="Administrator password recovery form">
          <div className="slx-auth__mobile-brand">
            <SecuraLogoMark />
            <span><strong>Secura</strong><small>DOCUMENT PRIVACY WORKSPACE</small></span>
          </div>

          <div className="slx-auth__card srx-card" key={step}>
            <span className={`srx-card__icon ${step === 'success' ? 'srx-card__icon--success' : ''}`}>
              {step === 'email' && <Mail size={25} />}
              {step === 'otp' && <Fingerprint size={25} />}
              {step === 'password' && <LockKeyhole size={25} />}
              {step === 'success' && <CheckCircle2 size={27} />}
            </span>
            <span className="slx-auth__eyebrow">
              {step === 'email' && 'ADMINISTRATOR RECOVERY'}
              {step === 'otp' && 'VERIFY YOUR IDENTITY'}
              {step === 'password' && 'SECURE YOUR ACCOUNT'}
              {step === 'success' && 'RECOVERY COMPLETE'}
            </span>

            {step === 'email' && (
              <>
                <h1 className="srx-card__title">Forgot your <span>password?</span></h1>
                <p className="srx-card__description">Enter your registered Administrator email to begin the recovery process.</p>
                <form noValidate className="slx-form srx-form" onSubmit={(event) => { event.preventDefault(); requestOtp() }}>
                  <label htmlFor="srx-email">Administrator email</label>
                  <div className="slx-form__field">
                    <Mail size={19} aria-hidden="true" />
                    <input id="srx-email" type="email" autoComplete="email" value={email} placeholder="name@example.com" onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  {error && <p role="alert" className="slx-form__error">{error}</p>}
                  <button type="submit" disabled={loading} className="slx-form__submit">
                    {loading ? <LoaderCircle size={18} className="slx-spin" /> : <Mail size={18} />}
                    <span>{loading ? 'Requesting code...' : 'Send verification code'}</span>
                    {!loading && <ArrowRight size={18} className="slx-form__submit-arrow" />}
                  </button>
                </form>
                <p className="srx-card__hint"><ShieldCheck size={17} /> Only the registered Administrator can use this process.</p>
              </>
            )}

            {step === 'otp' && (
              <>
                <h1 className="srx-card__title">Check your <span>email.</span></h1>
                <p className="srx-card__description">Enter the six-digit verification code sent to <strong>{maskEmail(email)}</strong>.</p>
                {message && <p className="srx-message srx-message--info" role="status">{message}</p>}
                <form noValidate className="slx-form srx-form" onSubmit={verifyOtp}>
                  <label htmlFor="srx-digit-0">Verification code</label>
                  <div className="srx-otp" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`srx-digit-${index}`}
                        ref={(element) => { otpRefs.current[index] = element }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={`OTP digit ${index + 1}`}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      />
                    ))}
                  </div>
                  {error && <p role="alert" className="slx-form__error">{error}</p>}
                  <div className="srx-otp__resend">
                    <span>Didn't get the code?</span>
                    <button type="button" onClick={requestOtp} disabled={loading || countdown > 0}>
                      <RefreshCw size={14} /> {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="slx-form__submit">
                    {loading ? <LoaderCircle size={18} className="slx-spin" /> : <Fingerprint size={18} />}
                    <span>{loading ? 'Verifying...' : 'Verify code'}</span>
                    {!loading && <ArrowRight size={18} className="slx-form__submit-arrow" />}
                  </button>
                </form>
              </>
            )}

            {step === 'password' && (
              <>
                <h1 className="srx-card__title">Create new <span>password.</span></h1>
                <p className="srx-card__description">Your code has been verified. Choose a new Administrator password.</p>
                <p className="srx-message srx-message--success" role="status"><CheckCircle2 size={18} /> Identity verified successfully</p>
                <form noValidate className="slx-form srx-form" onSubmit={resetPassword}>
                  <label htmlFor="srx-password">New password</label>
                  <div className="slx-form__field">
                    <LockKeyhole size={19} aria-hidden="true" />
                    <input id="srx-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} placeholder="Minimum 8 characters" onChange={(event) => setNewPassword(event.target.value)} />
                    <button className="slx-form__eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                  </div>
                  <p className="srx-password-hint">At least 8 characters; maximum 72 bytes.</p>
                  <label htmlFor="srx-confirm">Confirm password</label>
                  <div className="slx-form__field">
                    <LockKeyhole size={19} aria-hidden="true" />
                    <input id="srx-confirm" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} placeholder="Repeat your new password" onChange={(event) => setConfirmPassword(event.target.value)} />
                    <button className="slx-form__eye" type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                  </div>
                  {error && <p role="alert" className="slx-form__error">{error}</p>}
                  <button type="submit" disabled={loading} className="slx-form__submit">
                    {loading ? <LoaderCircle size={18} className="slx-spin" /> : <LockKeyhole size={18} />}
                    <span>{loading ? 'Updating password...' : 'Update password'}</span>
                    {!loading && <ArrowRight size={18} className="slx-form__submit-arrow" />}
                  </button>
                </form>
              </>
            )}

            {step === 'success' && (
              <div className="srx-complete">
                <h1 className="srx-card__title">You're <span>all set.</span></h1>
                <p className="srx-card__description">Your Administrator password has been updated. Sign in using your new password.</p>
                <div className="srx-complete__tick"><Check size={31} /></div>
                <button type="button" className="slx-form__submit" onClick={() => navigate('/login', { replace: true })}><ShieldCheck size={18} /> Back to Sign In <ArrowRight size={18} className="slx-form__submit-arrow" /></button>
              </div>
            )}

            {step === 'email' && <Link className="srx-card__back" to="/login"><ArrowLeft size={16} /> Back to Sign In</Link>}
          </div>
          <p className="slx-auth__bottom">SECURA <span /> SECURE WEB PLATFORM FOR AI DOCUMENT ANONYMIZATION</p>
        </section>
      </div>
    </main>
  )
}

export default AdminPasswordRecovery
