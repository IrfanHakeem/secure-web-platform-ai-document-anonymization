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
import { useAuth } from '../../context/useAuth'

function getInitials(name) {
  if (!name) {
    return 'A'
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [users, setUsers] = useState([])
  const [departments, setDepartments] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

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

          setUsers(usersResponse.data)
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

  const statistics = useMemo(() => {
    const standardUsers =
      users.filter(
        (account) =>
          account.role === 'User',
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
      users: standardUsers.length,
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
    <main className="admin-dashboard-shell">
      <div className="admin-dashboard-content">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <div className="admin-brand">
              <span>S</span>
              <b>Secura</b>
            </div>

            <div>
              <p className="secura-eyebrow">
                ADMINISTRATION
              </p>

              <h1>
                {getGreeting()}, {firstName}!
              </h1>

              <p>
                Manage Secura users,
                departments and account
                administration.
              </p>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-profile-button"
              onClick={() =>
                navigate('/admin/profile')
              }
            >
              <span className="admin-avatar">
                {getInitials(displayName)}
              </span>

              <span>
                <b>{displayName}</b>

                <small>
                  Administrator
                </small>
              </span>
            </button>

            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              Log out
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <section className="admin-dashboard-intro">
          <p className="secura-eyebrow">
            ADMIN OVERVIEW
          </p>

          <h2>
            Administration dashboard
          </h2>

          <p>
            Review account and department
            information across the Secura
            platform.
          </p>
        </section>

        {error && (
          <div className="admin-dashboard-error">
            <ShieldCheck size={16} />
            {error}
          </div>
        )}

        <section className="admin-stat-grid">
          <article>
            <span className="admin-stat-icon">
              <UsersRound size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .managedAccounts}
              </b>

              <p>Managed accounts</p>

              <small>
                Users and Security Officers
              </small>
            </div>
          </article>

          <article>
            <span className="admin-stat-icon blue">
              <UserRound size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics.users}
              </b>

              <p>User accounts</p>

              <small>
                Department users
              </small>
            </div>
          </article>

          <article>
            <span className="admin-stat-icon green">
              <ShieldCheck size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .securityOfficers}
              </b>

              <p>Security Officers</p>

              <small>
                Security review accounts
              </small>
            </div>
          </article>

          <article>
            <span className="admin-stat-icon peach">
              <Building2 size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : departments.length}
              </b>

              <p>Departments</p>

              <small>
                Registered departments
              </small>
            </div>
          </article>
        </section>

        <section className="admin-dashboard-body">
          <div className="admin-management-panel">
            <div className="admin-panel-heading">
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

            <div className="admin-action-grid">
              <button
                type="button"
                onClick={() =>
                  navigate('/admin/users')
                }
              >
                <span className="admin-action-icon">
                  <UsersRound size={20} />
                </span>

                <span>
                  <b>User management</b>

                  <small>
                    Create users, assign
                    departments and reset
                    account passwords.
                  </small>
                </span>

                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/admin/departments',
                  )
                }
              >
                <span className="admin-action-icon department">
                  <Building2 size={20} />
                </span>

                <span>
                  <b>
                    Department management
                  </b>

                  <small>
                    View and create
                    departments for User
                    accounts.
                  </small>
                </span>

                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/admin/profile')
                }
              >
                <span className="admin-action-icon profile">
                  <UserRound size={20} />
                </span>

                <span>
                  <b>
                    Administrator profile
                  </b>

                  <small>
                    Manage your administrator
                    account information.
                  </small>
                </span>

                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <aside className="admin-status-panel">
            <p className="secura-eyebrow">
              ACCOUNT STATUS
            </p>

            <div className="admin-status-shield">
              <ShieldCheck size={25} />
            </div>

            <h3>
              Administrator access active
            </h3>

            <p>
              Your account has access to
              Secura administration tools.
            </p>

            <div className="admin-status-row">
              <span>
                Active managed accounts
              </span>

              <b>
                {loading
                  ? '—'
                  : statistics
                      .activeAccounts}
              </b>
            </div>

            <div className="admin-status-row">
              <span>
                Total departments
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