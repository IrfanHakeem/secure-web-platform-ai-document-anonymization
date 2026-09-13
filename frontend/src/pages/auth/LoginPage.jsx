import { useState } from 'react'
import {
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

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

    const cleanEmail =
      email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setError(
        'Please enter your email and password.',
      )

      return
    }

    try {
      setSubmitting(true)

      const authenticatedUser =
        await login(
          cleanEmail,
          password,
        )

      navigate(
        getDashboardPath(
          authenticatedUser.role,
        ),
        {
          replace: true,
        },
      )
    } catch (err) {
      if (
        err.response?.status === 401
      ) {
        setError(
          'Invalid email or password.',
        )
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
    <main className="min-h-screen bg-[#f6f6ff]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="secura-login-hero relative hidden min-h-screen overflow-hidden bg-[#11083f] text-white lg:flex">
          <div className="absolute inset-0 bg-gradient-to-b from-[#10073d] via-[#1b0d61] to-[#24205c]" />

          <div className="secura-login-shape-a absolute left-[54%] top-[5%] h-14 w-14 rounded-xl bg-fuchsia-600/90 shadow-lg shadow-fuchsia-950/20" />

          <div className="secura-login-shape-b absolute left-[40%] top-[9%] h-12 w-12 rounded-full bg-violet-500/90 shadow-lg shadow-violet-950/20" />

          <div className="secura-login-shape-c secura-login-hex absolute bottom-[11%] left-[11%] h-[70px] w-[70px] bg-orange-500" />

          <div className="secura-login-shape-d absolute bottom-[22%] left-[18%] h-8 w-8 rounded-md bg-cyan-400/90" />

          <div className="secura-login-shape-a absolute bottom-[27%] right-[17%] h-5 w-5 rounded-full bg-violet-400/70" />

          <div className="secura-login-shape-b absolute bottom-[30%] right-[12%] h-3 w-3 rounded-full bg-violet-300/60" />

          <svg
            className="secura-login-wave absolute inset-0 h-full w-full"
            viewBox="0 0 900 900"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="waveOne"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stopColor="#f07c5e"
                />

                <stop
                  offset="55%"
                  stopColor="#6e52ee"
                />

                <stop
                  offset="100%"
                  stopColor="#2fc5ff"
                />
              </linearGradient>

              <linearGradient
                id="waveTwo"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stopColor="#7444df"
                />

                <stop
                  offset="100%"
                  stopColor="#b84fc4"
                />
              </linearGradient>
            </defs>

            <path
              d="M-20 318 C105 248 220 470 366 394 S627 145 920 311"
              stroke="url(#waveOne)"
              strokeWidth="4"
              opacity="0.78"
            />

            <path
              d="M-25 424 C135 343 266 522 430 467 S695 203 925 362"
              stroke="#5764d8"
              strokeWidth="4"
              opacity="0.78"
            />

            <path
              d="M-30 548 C150 492 278 638 450 574 S704 302 930 496"
              stroke="url(#waveTwo)"
              strokeWidth="3"
              opacity="0.57"
            />
          </svg>

          <div className="relative z-10 flex w-full flex-col px-12 py-12 xl:px-16">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur-sm">
                <ShieldCheck size={21} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Secura
                </p>

                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Secure Workspace
                </p>
              </div>
            </div>

            <div className="secura-login-copy my-auto max-w-[560px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                Secure Web Platform for Automated AI Document Anonymization
              </p>

              <h1 className="mt-5 text-[44px] font-bold leading-[1.08] tracking-[-0.04em] text-white xl:text-[52px]">
                Protect Sensitive
                <br />
                Data, Effortlessly.
              </h1>

              <p className="mt-5 max-w-[430px] text-sm leading-7 text-violet-100/70">
                Automated AI document anonymization with controlled original-file access,
                audit logging, and security monitoring — all in one secure portal.
              </p>
            </div>

            <p className="text-[10px] text-white/40">
              Protected access for authorized Secura users.
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="secura-login-form w-full max-w-[430px]">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#6560c9] text-white">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <p className="text-base font-semibold text-[#22283b]">
                    Secura
                  </p>

                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6560c9]">
                    Secure Workspace
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#17172f]">
              Sign In
            </h2>

            <p className="mt-2 text-sm text-[#7d8494]">
              Welcome back! Enter your credentials to continue.
            </p>

            <form
              className="mt-9 space-y-5"
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#23233e]"
                  htmlFor="email"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="name@example.com"
                  className="secura-login-field h-12 w-full rounded-xl border border-[#ddddea] bg-white px-4 text-sm text-[#22283b] outline-none placeholder:text-[#a4a7b3] focus:border-[#7b70e2] focus:ring-4 focus:ring-[#6560c9]/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    className="text-sm font-medium text-[#23233e]"
                    htmlFor="password"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#704dea] transition hover:text-[#514caf]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your password"
                    className="secura-login-field h-12 w-full rounded-xl border border-[#ddddea] bg-white px-4 pr-12 text-sm text-[#22283b] outline-none placeholder:text-[#a4a7b3] focus:border-[#7b70e2] focus:ring-4 focus:ring-[#6560c9]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="secura-login-eye absolute right-4 top-1/2 grid -translate-y-1/2 place-items-center text-[#9094a2] hover:text-[#514caf]"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="secura-login-alert rounded-xl border border-[#f1d4d0] bg-[#fff6f4] px-4 py-3 text-sm text-[#9f4e46]"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="secura-login-submit flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6b5bd6] px-5 text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-[#6560c9]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

                {submitting
                  ? 'Signing in...'
                  : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-[10px] text-[#a0a4b0]">
              <div className="h-px flex-1 bg-[#e9eaf0]" />

              <span>
                Protected access
              </span>

              <div className="h-px flex-1 bg-[#e9eaf0]" />
            </div>

            <p className="mt-5 text-center text-[10px] leading-5 text-[#9da1ad]">
              Access is restricted to authorized Secura users. Authentication
              activity may be recorded for security auditing.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
