import {
  ArrowRight,
  FileSearch,
  LogOut,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
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

function countLast24Hours(records) {
  const cutoff =
    Date.now() - 24 * 60 * 60 * 1000

  return records.filter((record) => {
    const timestamp = new Date(
      record.created_at,
    ).getTime()

    return (
      Number.isFinite(timestamp) &&
      timestamp >= cutoff
    )
  }).length
}

function getNetworkStatusDetails(status) {
  const statuses = {
    ACTIVE: {
      label: 'Active',
      className: 'active',
      description:
        'Network sensor data is being received normally.',
    },
    AWAITING_DATA: {
      label: 'Awaiting data',
      className: 'awaiting',
      description:
        'Network integration is configured but no sensor events have been received yet.',
    },
    STALE: {
      label: 'Stale',
      className: 'stale',
      description:
        'Network integration is configured but recent sensor data has not been received.',
    },
    NOT_CONFIGURED: {
      label: 'Not configured',
      className: 'not-configured',
      description:
        'Network sensor integration has not been configured yet.',
    },
  }

  return (
    statuses[status] ?? {
      label: status || 'Unknown',
      className: 'not-configured',
      description:
        'Network monitoring status is unavailable.',
    }
  )
}

function formatDateTime(value) {
  if (!value) {
    return 'No network events received'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return new Intl.DateTimeFormat(
    'en-MY',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function SecurityDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [summary, setSummary] =
    useState(null)

  const [
    failedLoginCount,
    setFailedLoginCount,
  ] = useState(0)

  const [
    unauthorizedCount,
    setUnauthorizedCount,
  ] = useState(0)

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
      api.get(
        '/security-monitoring/dashboard-summary',
      ),
      api.get(
        '/security-monitoring/failed-logins',
        {
          params: {
            limit: 200,
          },
        },
      ),
      api.get(
        '/security-monitoring/unauthorized-access',
        {
          params: {
            limit: 200,
          },
        },
      ),
    ])
      .then(
        ([
          summaryResponse,
          failedLoginsResponse,
          unauthorizedResponse,
        ]) => {
          if (cancelled) {
            return
          }

          setSummary(
            summaryResponse.data,
          )

          setFailedLoginCount(
            countLast24Hours(
              failedLoginsResponse.data,
            ),
          )

          setUnauthorizedCount(
            countLast24Hours(
              unauthorizedResponse.data,
            ),
          )
        },
      )
      .catch(() => {
        if (!cancelled) {
          setError(
            'Unable to load security dashboard data.',
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

  const displayName =
    user?.full_name ||
    user?.username ||
    'Security Officer'

  const firstName =
    displayName.split(' ')[0]

  const networkStatus =
    getNetworkStatusDetails(
      summary?.network_monitoring_status,
    )

  const stats = [
    {
      label: 'Pending reviews',
      note: 'Original access',
      value:
        summary?.pending_original_reviews ??
        0,
      icon: FileSearch,
      className: 'reviews',
    },
    {
      label: 'Active security alerts',
      note: 'Application alerts',
      value:
        summary?.application_alerts ?? 0,
      icon: ShieldAlert,
      className: 'alerts',
    },
    {
      label: 'Failed logins',
      note: 'Last 24 hours',
      value: failedLoginCount,
      icon: UserRound,
      className: 'failed',
    },
    {
      label: 'Unauthorized attempts',
      note: 'Last 24 hours',
      value: unauthorizedCount,
      icon: ShieldCheck,
      className: 'unauthorized',
    },
  ]

  const actions = [
    {
      label: 'Original access review',
      note:
        'Review requests already approved by document owners.',
      path: '/security/reviews',
      icon: FileSearch,
      className: 'reviews',
    },
    {
      label: 'Security alerts',
      note:
        'Review active application and security alerts.',
      path: '/security/alerts',
      icon: ShieldAlert,
      className: 'alerts',
    },
    {
      label: 'Security logs',
      note:
        'Inspect application audit logs and network security events.',
      path: '/security/logs',
      icon: ScrollText,
      className: 'logs',
    },
  ]

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="security-dashboard-shell">
      <div className="security-dashboard-content">
        <header className="security-dashboard-topbar">
          <div className="security-dashboard-brand-area">
            <div className="security-dashboard-brand">
              <span>S</span>
              <b>Secura</b>
            </div>

            <div>
              <p className="secura-eyebrow">
                SECURITY OPERATIONS
              </p>

              <h1>
                {getGreeting(currentTime)},{' '}
                {firstName}!
              </h1>

              <p>
                Review access requests and
                monitor security activity
                across Secura.
              </p>
            </div>
          </div>

          <div className="security-dashboard-account">
            <button
              type="button"
              className="security-account-button"
              onClick={() =>
                navigate(
                  '/security/profile',
                )
              }
            >
              <ProfileAvatar
                name={displayName}
                className="security-account-avatar"
              />

              <span>
                <b>{displayName}</b>
                <small>
                  Security Officer
                </small>
              </span>
            </button>

            <button
              type="button"
              className="security-dashboard-logout"
              onClick={handleLogout}
            >
              Log out
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <section className="security-dashboard-intro">
          <p className="secura-eyebrow">
            SECURITY OVERVIEW
          </p>

          <h2>
            Security dashboard
          </h2>

          <p>
            Monitor access requests,
            security alerts and network
            monitoring status.
          </p>
        </section>

        {error && (
          <div className="security-dashboard-error">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        <section className="security-dashboard-network">
          <div
            className={`security-network-icon ${networkStatus.className}`}
          >
            <ShieldCheck size={23} />
          </div>

          <div className="security-network-content">
            <small>
              NETWORK MONITORING
            </small>

            <div>
              <h3>
                Monitoring status
              </h3>

              <span
                className={`security-network-status ${networkStatus.className}`}
              >
                {loading
                  ? 'Loading...'
                  : networkStatus.label}
              </span>
            </div>

            <p>
              {loading
                ? 'Checking network monitoring status...'
                : networkStatus.description}
            </p>
          </div>

          <div className="security-network-meta">
            <small>
              Last network event
            </small>

            <b>
              {loading
                ? '—'
                : formatDateTime(
                    summary
                      ?.last_network_event_at,
                  )}
            </b>
          </div>
        </section>

        <section className="security-dashboard-stats">
          {stats.map((item) => {
            const Icon = item.icon

            return (
              <article key={item.label}>
                <span
                  className={`security-stat-icon ${item.className}`}
                >
                  <Icon size={19} />
                </span>

                <div>
                  <b>
                    {loading
                      ? '—'
                      : item.value}
                  </b>

                  <p>{item.label}</p>
                  <small>
                    {item.note}
                  </small>
                </div>
              </article>
            )
          })}
        </section>

        <section className="security-dashboard-main-grid">
          <div className="security-dashboard-actions-panel">
            <div className="security-dashboard-panel-heading">
              <div>
                <p className="secura-eyebrow">
                  SECURITY OPERATIONS
                </p>

                <h2>
                  Security tools
                </h2>
              </div>

              <ShieldCheck size={20} />
            </div>

            <div className="security-dashboard-actions">
              {actions.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() =>
                      navigate(item.path)
                    }
                  >
                    <span
                      className={`security-action-icon ${item.className}`}
                    >
                      <Icon size={20} />
                    </span>

                    <span>
                      <b>{item.label}</b>
                      <small>
                        {item.note}
                      </small>
                    </span>

                    <ArrowRight size={17} />
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="security-dashboard-status-panel">
            <p className="secura-eyebrow">
              MONITORING
            </p>

            <div className="security-dashboard-shield">
              <ShieldCheck size={26} />
            </div>

            <h3>
              Security monitoring
            </h3>

            <p>
              Security Officer access is
              active and ready for review.
            </p>

            <div className="security-dashboard-status-row">
              <span>
                Network events 24h
              </span>

              <b>
                {loading
                  ? '—'
                  : summary
                      ?.network_events_last_24h ??
                    0}
              </b>
            </div>

            <div className="security-dashboard-status-row">
              <span>
                Audit logs 24h
              </span>

              <b>
                {loading
                  ? '—'
                  : summary
                      ?.audit_logs_last_24h ??
                    0}
              </b>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default SecurityDashboard
