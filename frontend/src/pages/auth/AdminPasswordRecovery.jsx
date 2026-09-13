import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import api from '../../api/client'

function getApiError(
  error,
  fallback,
) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function maskEmail(email) {
  const [
    name,
    domain,
  ] = email.split('@')

  if (
    !name ||
    !domain
  ) {
    return email
  }

  const visible =
    name.slice(0, 2)

  const hidden =
    '*'.repeat(
      Math.max(
        name.length - 2,
        3,
      ),
    )

  return `${visible}${hidden}@${domain}`
}

function AdminPasswordRecovery() {
  const navigate =
    useNavigate()

  const otpRefs =
    useRef([])

  const [step, setStep] =
    useState('email')

  const [email, setEmail] =
    useState('')

  const [otp, setOtp] =
    useState(
      Array(6).fill(''),
    )

  const [
    resetToken,
    setResetToken,
  ] = useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [
    countdown,
    setCountdown,
  ] = useState(0)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  useEffect(() => {
    if (countdown <= 0) {
      return undefined
    }

    const timer =
      window.setInterval(() => {
        setCountdown(
          (current) =>
            Math.max(
              current - 1,
              0,
            ),
        )
      }, 1000)

    return () => {
      window.clearInterval(
        timer,
      )
    }
  }, [countdown])

  const requestOtp =
    async () => {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase()

      if (!normalizedEmail) {
        setError(
          'Administrator email is required.',
        )

        return
      }

      setLoading(true)
      setError('')
      setMessage('')

      try {
        await api.post(
          '/auth/admin-forgot-password',
          {
            email:
              normalizedEmail,
          },
        )

        setEmail(
          normalizedEmail,
        )

        setOtp(
          Array(6).fill(''),
        )

        setStep('otp')

        setCountdown(30)

        setMessage(
          'If the email belongs to the Administrator account, a 6-digit OTP has been sent.',
        )

        window.setTimeout(() => {
          otpRefs.current[
            0
          ]?.focus()
        }, 100)
      } catch (requestError) {
        setError(
          getApiError(
            requestError,
            'Unable to send password reset OTP.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const handleEmailSubmit =
    (event) => {
      event.preventDefault()

      requestOtp()
    }

  const handleOtpChange = (
    index,
    value,
  ) => {
    const digit =
      value.replace(
        /\D/g,
        '',
      )

    if (!digit) {
      setOtp(
        (current) => {
          const next =
            [...current]

          next[index] = ''

          return next
        },
      )

      return
    }

    const lastDigit =
      digit.slice(-1)

    setOtp((current) => {
      const next =
        [...current]

      next[index] =
        lastDigit

      return next
    })

    if (index < 5) {
      otpRefs.current[
        index + 1
      ]?.focus()
    }
  }

  const handleOtpKeyDown = (
    index,
    event,
  ) => {
    if (
      event.key ===
        'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      otpRefs.current[
        index - 1
      ]?.focus()
    }

    if (
      event.key ===
        'ArrowLeft' &&
      index > 0
    ) {
      otpRefs.current[
        index - 1
      ]?.focus()
    }

    if (
      event.key ===
        'ArrowRight' &&
      index < 5
    ) {
      otpRefs.current[
        index + 1
      ]?.focus()
    }
  }

  const handleOtpPaste =
    (event) => {
      event.preventDefault()

      const digits =
        event.clipboardData
          .getData('text')
          .replace(/\D/g, '')
          .slice(0, 6)
          .split('')

      if (
        digits.length === 0
      ) {
        return
      }

      const next =
        Array(6).fill('')

      digits.forEach(
        (digit, index) => {
          next[index] =
            digit
        },
      )

      setOtp(next)

      const focusIndex =
        Math.min(
          digits.length,
          5,
        )

      otpRefs.current[
        focusIndex
      ]?.focus()
    }

  const verifyOtp =
    async (event) => {
      event.preventDefault()

      const otpValue =
        otp.join('')

      if (
        otpValue.length !== 6
      ) {
        setError(
          'Enter the complete 6-digit OTP.',
        )

        return
      }

      setLoading(true)
      setError('')
      setMessage('')

      try {
        const response =
          await api.post(
            '/auth/admin-verify-otp',
            {
              email,
              otp: otpValue,
            },
          )

        setResetToken(
          response.data
            .reset_token,
        )

        setStep('password')

        setMessage(
          'Identity verified. Create a new Administrator password.',
        )
      } catch (verifyError) {
        setError(
          getApiError(
            verifyError,
            'Unable to verify OTP.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const resetPassword =
    async (event) => {
      event.preventDefault()

      if (
        newPassword.length < 8
      ) {
        setError(
          'New password must contain at least 8 characters.',
        )

        return
      }

      const passwordBytes =
        new TextEncoder()
          .encode(
            newPassword,
          ).length

      if (
        passwordBytes > 72
      ) {
        setError(
          'New password is too long.',
        )

        return
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          'Password confirmation does not match.',
        )

        return
      }

      if (!resetToken) {
        setError(
          'Password reset session is no longer valid. Request a new OTP.',
        )

        return
      }

      setLoading(true)
      setError('')
      setMessage('')

      try {
        await api.post(
          '/auth/admin-reset-password',
          {
            reset_token:
              resetToken,

            new_password:
              newPassword,
          },
        )

        setStep('success')

        setResetToken('')
        setOtp(
          Array(6).fill(''),
        )
        setNewPassword('')
        setConfirmPassword('')
      } catch (resetError) {
        setError(
          getApiError(
            resetError,
            'Unable to reset Administrator password.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const resendOtp =
    async () => {
      if (
        countdown > 0 ||
        loading
      ) {
        return
      }

      await requestOtp()
    }

  const returnToEmail = () => {
    setStep('email')
    setOtp(
      Array(6).fill(''),
    )
    setResetToken('')
    setError('')
    setMessage('')
    setCountdown(0)
  }

  return (
    <main className="admin-recovery-page">
      <section className="admin-recovery-card">
        <button
          type="button"
          className="admin-recovery-back"
          onClick={() =>
            navigate('/login')
          }
        >
          <ArrowLeft
            size={15}
          />

          Back to login
        </button>

        <div className="admin-recovery-brand">
          <span>S</span>

          <b>Secura</b>
        </div>

        {step === 'email' && (
          <>
            <div className="admin-recovery-icon">
              <ShieldCheck
                size={25}
              />
            </div>

            <p className="secura-eyebrow">
              ADMINISTRATOR RECOVERY
            </p>

            <h1>
              Forgot your password?
            </h1>

            <p className="admin-recovery-description">
              Enter the registered
              Administrator email.
              We will send a
              verification OTP before
              allowing the password
              to be changed.
            </p>

            {error && (
              <div className="admin-recovery-error">
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleEmailSubmit
              }
            >
              <label className="admin-recovery-label">
                Administrator email
              </label>

              <div className="admin-recovery-input">
                <Mail
                  size={15}
                />

                <input
                  type="email"
                  value={email}
                  placeholder="Enter registered email"
                  autoComplete="email"
                  onChange={(event) =>
                    setEmail(
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <button
                type="submit"
                className="admin-recovery-primary"
                disabled={loading}
              >
                <KeyRound
                  size={15}
                />

                {loading
                  ? 'Sending OTP...'
                  : 'Request OTP'}
              </button>
            </form>

            <div className="admin-recovery-note">
              Only the registered
              Administrator account
              can use this recovery
              process.
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="admin-recovery-icon">
              <KeyRound
                size={25}
              />
            </div>

            <p className="secura-eyebrow">
              EMAIL VERIFICATION
            </p>

            <h1>
              Enter verification code
            </h1>

            <p className="admin-recovery-description">
              Enter the 6-digit OTP
              sent to
            </p>

            <div className="admin-recovery-email">
              {maskEmail(email)}
            </div>

            {message && (
              <div className="admin-recovery-success-message">
                {message}
              </div>
            )}

            {error && (
              <div className="admin-recovery-error">
                {error}
              </div>
            )}

            <form
              onSubmit={verifyOtp}
            >
              <div
                className="admin-recovery-otp"
                onPaste={
                  handleOtpPaste
                }
              >
                {otp.map(
                  (
                    digit,
                    index,
                  ) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[
                          index
                        ] = element
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      aria-label={`OTP digit ${index + 1}`}
                      onChange={(
                        event,
                      ) =>
                        handleOtpChange(
                          index,
                          event.target
                            .value,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) =>
                        handleOtpKeyDown(
                          index,
                          event,
                        )
                      }
                    />
                  ),
                )}
              </div>

              <div className="admin-recovery-resend">
                <span>
                  Didn&apos;t receive
                  the code?
                </span>

                <button
                  type="button"
                  disabled={
                    countdown > 0 ||
                    loading
                  }
                  onClick={
                    resendOtp
                  }
                >
                  <RefreshCw
                    size={12}
                  />

                  {countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Resend OTP'}
                </button>
              </div>

              <div className="admin-recovery-button-row">
                <button
                  type="button"
                  className="admin-recovery-secondary"
                  onClick={
                    returnToEmail
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-recovery-primary inline"
                  disabled={loading}
                >
                  {loading
                    ? 'Verifying...'
                    : 'Verify OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'password' && (
          <>
            <div className="admin-recovery-verified">
              <CheckCircle2
                size={18}
              />

              <div>
                <b>
                  Identity verified
                </b>

                <small>
                  OTP verification
                  completed successfully.
                </small>
              </div>
            </div>

            <p className="secura-eyebrow">
              NEW PASSWORD
            </p>

            <h1>
              Create new password
            </h1>

            <p className="admin-recovery-description">
              Create a new password
              for the Administrator
              account.
            </p>

            {message && (
              <div className="admin-recovery-success-message">
                {message}
              </div>
            )}

            {error && (
              <div className="admin-recovery-error">
                {error}
              </div>
            )}

            <form
              onSubmit={
                resetPassword
              }
            >
              <label className="admin-recovery-label">
                New password
              </label>

              <div className="admin-recovery-input">
                <LockKeyhole
                  size={15}
                />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    newPassword
                  }
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  onChange={(event) =>
                    setNewPassword(
                      event.target
                        .value,
                    )
                  }
                />

                <button
                  type="button"
                  className="admin-recovery-eye"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={15}
                    />
                  ) : (
                    <Eye
                      size={15}
                    />
                  )}
                </button>
              </div>

              <p className="admin-recovery-hint">
                Minimum 8 characters.
              </p>

              <label className="admin-recovery-label">
                Confirm new password
              </label>

              <div className="admin-recovery-input">
                <LockKeyhole
                  size={15}
                />

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    confirmPassword
                  }
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                />

                <button
                  type="button"
                  className="admin-recovery-eye"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      size={15}
                    />
                  ) : (
                    <Eye
                      size={15}
                    />
                  )}
                </button>
              </div>

              <div className="admin-recovery-button-row">
                <button
                  type="button"
                  className="admin-recovery-secondary"
                  onClick={
                    returnToEmail
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-recovery-primary inline"
                  disabled={loading}
                >
                  {loading
                    ? 'Updating...'
                    : 'Update Password'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="admin-recovery-complete">
            <div className="admin-recovery-complete-icon">
              <CheckCircle2
                size={29}
              />
            </div>

            <p className="secura-eyebrow">
              PASSWORD UPDATED
            </p>

            <h1>
              Password reset successful
            </h1>

            <p>
              Your Administrator
              password has been
              updated. You can now
              sign in using the new
              password.
            </p>

            <button
              type="button"
              className="admin-recovery-primary"
              onClick={() =>
                navigate(
                  '/login',
                  {
                    replace: true,
                  },
                )
              }
            >
              Back to Login
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminPasswordRecovery