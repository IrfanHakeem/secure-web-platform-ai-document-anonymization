import {
  ArrowRight,
  Building2,
  LogOut,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'
import ProfileAvatar from '../../components/ProfileAvatar'
import { useAuth } from '../../context/useAuth'

function getGreeting(date) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  }

  if (hour >= 17 && hour < 21) {
    return 'Good evening'
  }

  return 'Good night'
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [users, setUsers] =
    useState([])

  const [
    departments,
    setDepartments,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        setCurrentTime(new Date())
      },
      60 * 1000,
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/departments'),
    ])
      .then(
        ([
          usersResponse,
          departmentsResponse,
        ]) => {
          if (cancelled) {
            return
          }

          setUsers(
            usersResponse.data,
          )

          setDepartments(
            departmentsResponse.data,
          )
        },
      )
      .catch(() => {
        if (!cancelled) {
          setError(
            'Unable to load administrator dashboard data.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const statistics =
    useMemo(() => {
      const standardUsers =
        users.filter(
          (account) =>
            account.role ===
            'User',
        )

      const securityOfficers =
        users.filter(
          (account) =>
            account.role ===
            'Security Officer',
        )

      const managedAccounts =
        users.filter(
          (account) =>
            account.role !==
            'Administrator',
        )

      const activeAccounts =
        managedAccounts.filter(
          (account) =>
            account.is_active,
        )

      return {
        users:
          standardUsers.length,

        securityOfficers:
          securityOfficers.length,

        managedAccounts:
          managedAccounts.length,

        activeAccounts:
          activeAccounts.length,
      }
    }, [users])

  const displayName =
    user?.full_name ||
    user?.username ||
    'Administrator'

  const firstName =
    displayName.split(' ')[0]

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="role-dashboard role-dashboard--admin">
      <div className="role-dashboard__content">
        <header className="role-dashboard__topbar">
          <div className="role-dashboard__brand-area">
            <div className="role-dashboard__brand">
              <span>S</span>
              <b>Secura</b>
            </div>

            <div className="role-dashboard__welcome">
              <p className="secura-eyebrow">
                ADMINISTRATION
              </p>

              <h1>
                {getGreeting(
                  currentTime,
                )}
                , {firstName}!
              </h1>

              <p>
                Manage users,
                departments and account
                administration across
                Secura.
              </p>
            </div>
          </div>

          <div className="role-dashboard__account">
            <button
              type="button"
              className="role-dashboard__account-button"
              onClick={() =>
                navigate(
                  '/admin/profile',
                )
              }
            >
              <ProfileAvatar
                name={displayName}
                className="role-dashboard__avatar"
              />

              <span>
                <b>
                  {displayName}
                </b>

                <small>
                  Administrator
                </small>
              </span>
            </button>

            <button
              type="button"
              className="role-dashboard__logout"
              onClick={
                handleLogout
              }
            >
              Log out
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <section className="role-dashboard__intro">
          <p className="secura-eyebrow">
            ADMIN OVERVIEW
          </p>

          <h2>
            Administration dashboard
          </h2>

          <p>
            Review managed accounts and
            department configuration
            across the Secura platform.
          </p>
        </section>

        {error && (
          <div className="role-dashboard__error">
            <ShieldCheck
              size={16}
            />
            {error}
          </div>
        )}

        <section className="role-dashboard__status-banner">
          <div className="role-dashboard__status-icon admin">
            <ShieldCheck
              size={23}
            />
          </div>

          <div className="role-dashboard__status-copy">
            <small>
              ADMIN ACCESS
            </small>

            <div>
              <h3>
                Administrator access active
              </h3>

              <span className="role-dashboard__status-pill active">
                Active
              </span>
            </div>

            <p>
              Your account can manage
              Users, Security Officers and
              department configuration.
            </p>
          </div>

          <div className="role-dashboard__status-meta">
            <small>
              Active managed accounts
            </small>

            <b>
              {loading
                ? '—'
                : statistics
                    .activeAccounts}
            </b>
          </div>
        </section>

        <section className="role-dashboard__stats">
          <article>
            <span className="role-dashboard__stat-icon purple">
              <UsersRound
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .managedAccounts}
              </b>

              <p>
                Managed accounts
              </p>

              <small>
                Users + Security Officers
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon blue">
              <UserRound
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics.users}
              </b>

              <p>
                User accounts
              </p>

              <small>
                Department users
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon green">
              <ShieldCheck
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .securityOfficers}
              </b>

              <p>
                Security Officers
              </p>

              <small>
                Review accounts
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon peach">
              <Building2
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : departments.length}
              </b>

              <p>
                Departments
              </p>

              <small>
                Registered departments
              </small>
            </div>
          </article>
        </section>

        <section className="role-dashboard__main-grid">
          <div className="role-dashboard__tools">
            <div className="role-dashboard__panel-heading">
              <div>
                <p className="secura-eyebrow">
                  MANAGEMENT
                </p>

                <h2>
                  Administration tools
                </h2>
              </div>

              <UserCog size={20} />
            </div>

            <div className="role-dashboard__actions">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/admin/users',
                  )
                }
              >
                <span className="role-dashboard__action-icon purple">
                  <UsersRound
                    size={20}
                  />
                </span>

                <span>
                  <b>
                    User management
                  </b>

                  <small>
                    Create accounts,
                    assign departments and
                    reset User or Security
                    Officer passwords.
                  </small>
                </span>

                <ArrowRight
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/admin/departments',
                  )
                }
              >
                <span className="role-dashboard__action-icon blue">
                  <Building2
                    size={20}
                  />
                </span>

                <span>
                  <b>
                    Department management
                  </b>

                  <small>
                    Create and review
                    departments used by
                    Secura accounts.
                  </small>
                </span>

                <ArrowRight
                  size={17}
                />
              </button>

            </div>
          </div>

          <aside className="role-dashboard__side-panel">
            <p className="secura-eyebrow">
              PLATFORM STATUS
            </p>

            <div className="role-dashboard__side-shield">
              <ShieldCheck
                size={26}
              />
            </div>

            <h3>
              Account management
            </h3>

            <p>
              Current account and
              department totals are loaded
              directly from the Secura
              backend.
            </p>

            <div className="role-dashboard__side-row">
              <span>
                Active accounts
              </span>

              <b>
                {loading
                  ? '—'
                  : statistics
                      .activeAccounts}
              </b>
            </div>

            <div className="role-dashboard__side-row">
              <span>
                Departments
              </span>

              <b>
                {loading
                  ? '—'
                  : departments.length}
              </b>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboard
