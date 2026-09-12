import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { ROLES } from '../../utils/roles'

function getDashboardPath(role) {
  if (role === ROLES.ADMINISTRATOR) {
    return '/admin/dashboard'
  }

  if (role === ROLES.SECURITY_OFFICER) {
    return '/security/dashboard'
  }

  return '/user/dashboard'
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      setSubmitting(true)

      const authenticatedUser = await login(cleanEmail, password)

      navigate(getDashboardPath(authenticatedUser.role), {
        replace: true,
      })
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(
          'Unable to sign in right now. Please check the server connection and try again.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f7f6fb]">
      <section className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#4f46e5] via-[#6656d9] to-[#8b75d7] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <ShieldCheck size={26} />
          </div>

          <div>
            <p className="text-xl font-semibold">Secura</p>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/65">
              Secure Workspace
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
            Secure Document Intelligence
          </p>

          <h1 className="text-5xl font-semibold leading-tight">
            Protect sensitive information before it leaves your workspace.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
            Automated AI document anonymization with controlled original-file
            access, audit logging, and security monitoring.
          </p>
        </div>

        <p className="text-sm text-white/55">
          Secure Web Platform for Automated AI Document Anonymization
        </p>
      </section>

      <section className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
                <ShieldCheck size={24} />
              </div>

              <div>
                <p className="text-xl font-semibold text-slate-900">Secura</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Secure Workspace
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
            Secure Workspace
          </p>

          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Sign in using your registered email address to continue to Secura.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-slate-700"
                htmlFor="email"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={19}
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="password"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-violet-600 transition hover:text-violet-800"
                >
                  Administrator forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={19}
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>Protected access</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Access is restricted to authorized Secura users. Authentication
            activity may be recorded for security auditing.
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage