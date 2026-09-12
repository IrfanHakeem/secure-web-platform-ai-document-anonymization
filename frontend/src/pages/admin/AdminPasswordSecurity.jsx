import {
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

import api from '../../api/client'

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return '—'
  }

  const [name, domain] = email.split('@')

  if (name.length <= 2) {
    return `${name[0] || '*'}***@${domain}`
  }

  return `${name.slice(0, 2)}*****@${domain}`
}

function AdminPasswordSecurity({ email }) {
  const otpRefs = useRef([])

  const [step, setStep] =
    useState('request')

  const [otp, setOtp] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  const [resetToken, setResetToken] =
    useState('')

  const [newPassword, setNewPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [resendSeconds, setResendSeconds] =
    useState(0)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  useEffect(() => {
    if (
      step !== 'otp' ||
      resendSeconds <= 0
    ) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        Math.max(0, current - 1),
      )
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [step, resendSeconds])

  const clearFlow = () => {
    setStep('request')

    setOtp([
      '',
      '',
      '',
      '',
      '',
      '',
    ])

    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setResendSeconds(0)
    setError('')
  }

  const requestOtp = async () => {
    if (!email) {
      setError(
        'Administrator email is unavailable.',
      )
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await api.post(
        '/auth/admin-forgot-password',
        {
          email,
        },
      )

      setOtp([
        '',
        '',
        '',
        '',
        '',
        '',
      ])

      setResendSeconds(30)
      setStep('otp')

      window.setTimeout(() => {
        otpRefs.current[0]?.focus()
      }, 0)
    } catch (requestError) {
      setError(
        getApiError(
          requestError,
          'Unable to send the OTP.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (
    index,
    value,
  ) => {
    const digit =
      value.replace(/\D/g, '').slice(-1)

    setOtp((current) => {
      const next = [...current]
      next[index] = digit
      return next
    })

    if (
      digit &&
      index < 5
    ) {
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
      event.key === 'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      otpRefs.current[
        index - 1
      ]?.focus()
    }
  }

  const handleOtpPaste = (event) => {
    const pasted =
      event.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6)

    if (!pasted) {
      return
    }

    event.preventDefault()

    const next = [
      '',
      '',
      '',
      '',
      '',
      '',
    ]

    pasted
      .split('')
      .forEach((digit, index) => {
        next[index] = digit
      })

    setOtp(next)

    otpRefs.current[
      Math.min(
        pasted.length,
        6,
      ) - 1
    ]?.focus()
  }

  const verifyOtp = async () => {
    const otpValue =
      otp.join('')

    if (otpValue.length !== 6) {
      setError(
        'Enter the complete 6-digit OTP.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post(
        '/auth/admin-verify-otp',
        {
          email,
          otp: otpValue,
        },
      )

      setResetToken(
        response.data.reset_token,
      )

      setStep('password')
    } catch (verifyError) {
      setError(
        getApiError(
          verifyError,
          'Invalid or expired OTP.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      setError(
        'New password must contain at least 8 characters.',
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
        'OTP verification is required.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post(
        '/auth/admin-reset-password',
        {
          reset_token: resetToken,
          new_password: newPassword,
        },
      )

      clearFlow()

      setSuccess(
        'Password updated successfully.',
      )
    } catch (updateError) {
      setError(
        getApiError(
          updateError,
          'Unable to update the administrator password.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="admin-security-card">
      <p className="admin-security-eyebrow">
        ACCOUNT SECURITY
      </p>

      <h2>Security</h2>

      {success && (
        <div className="admin-security-success">
          <Check size={14} />

          <span>{success}</span>
        </div>
      )}

      {error && (
        <div
          className="admin-security-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {step === 'request' && (
        <>
          <p className="admin-security-description">
            To change your password, request a
            One-Time Password (OTP) sent to your
            registered email address.
          </p>

          <div className="admin-security-email-box">
            <small>
              REGISTERED EMAIL
            </small>

            <b>
              {maskEmail(email)}
            </b>
          </div>

          <div className="admin-security-request-actions">
            <button
              type="button"
              className="admin-security-primary"
              disabled={
                loading ||
                !email
              }
              onClick={requestOtp}
            >
              {loading
                ? 'Sending...'
                : 'Request OTP'}
            </button>
          </div>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="admin-security-otp-banner">
            <b>
              OTP sent to{' '}
              {maskEmail(email)}.
            </b>

            <span>
              Check your inbox.
            </span>
          </div>

          <label className="admin-security-label">
            Enter OTP
          </label>

          <div
            className="admin-security-otp-inputs"
            onPaste={handleOtpPaste}
          >
            {otp.map(
              (digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[
                      index
                    ] = element
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) =>
                    handleOtpChange(
                      index,
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) =>
                    handleOtpKeyDown(
                      index,
                      event,
                    )
                  }
                />
              ),
            )}
          </div>

          <p className="admin-security-resend">
            Didn't receive it?{' '}

            {resendSeconds > 0 ? (
              <>
                Resend OTP in{' '}
                00:
                {String(
                  resendSeconds,
                ).padStart(2, '0')}
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={requestOtp}
              >
                Resend OTP
              </button>
            )}
          </p>

          <div className="admin-security-bottom-actions">
            <button
              type="button"
              className="admin-security-cancel"
              disabled={loading}
              onClick={clearFlow}
            >
              Cancel
            </button>

            <button
              type="button"
              className="admin-security-primary"
              disabled={
                loading ||
                otp.join('').length !== 6
              }
              onClick={verifyOtp}
            >
              {loading
                ? 'Verifying...'
                : 'Verify OTP'}
            </button>
          </div>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="admin-security-verified-banner">
            <Check size={14} />

            <b>
              Identity verified. Set your
              new password.
            </b>
          </div>

          <label className="admin-security-password-field">
            New Password

            <div>
              <input
                type={
                  showNewPassword
                    ? 'text'
                    : 'password'
                }
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
              />

              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() =>
                  setShowNewPassword(
                    (current) =>
                      !current,
                  )
                }
              >
                {showNewPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
              </button>
            </div>

            <small>
              Minimum 8 characters
            </small>
          </label>

          <label className="admin-security-password-field">
            Confirm New Password

            <div>
              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
              />

              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current,
                  )
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
              </button>
            </div>
          </label>

          <div className="admin-security-bottom-actions">
            <button
              type="button"
              className="admin-security-cancel"
              disabled={loading}
              onClick={clearFlow}
            >
              Cancel
            </button>

            <button
              type="button"
              className="admin-security-primary"
              disabled={
                loading ||
                newPassword.length < 8 ||
                confirmPassword.length < 8
              }
              onClick={
                updatePassword
              }
            >
              {loading
                ? 'Updating...'
                : 'Update Password'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default AdminPasswordSecurity