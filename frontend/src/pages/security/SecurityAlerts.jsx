import {
  Info,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '../../api/client'

function formatTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'en-MY',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
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

function getAlertMeta(
  alertType,
) {
  if (
    alertType ===
    'REPEATED_FAILED_LOGIN'
  ) {
    return {
      event:
        'Repeated Failed Login',
      category:
        'Authentication',
    }
  }

  if (
    alertType ===
    'UNAUTHORIZED_ACCESS'
  ) {
    return {
      event:
        'Unauthorized Access',
      category:
        'Authorization',
    }
  }

  return {
    event:
      alertType
        ?.replaceAll('_', ' ')
        ?.toLowerCase()
        ?.replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase(),
        ) ||
      'Security Alert',

    category:
      'Application Security',
  }
}

function getSeverityMeta(
  severity,
) {
  if (severity === 'HIGH') {
    return {
      badgeClass:
        'security-alerts__badge security-alerts__badge--high',

      cardClass:
        'security-alerts__summary-card security-alerts__summary-card--high',

      icon: (
        <TriangleAlert
          size={20}
        />
      ),
    }
  }

  return {
    badgeClass:
      'security-alerts__badge security-alerts__badge--medium',

    cardClass:
      'security-alerts__summary-card security-alerts__summary-card--medium',

    icon: <Info size={20} />,
  }
}

function findMatchingUsername(
  alert,
  logs,
) {
  const matchingLogs =
    logs.filter(
      (log) =>
        log.ip_address ===
        alert.ip_address,
    )

  const logWithUsername =
    matchingLogs.find(
      (log) =>
        Boolean(log.username),
    )

  return (
    logWithUsername?.username ||
    '—'
  )
}

function buildDisplayAlerts(
  alerts,
  failedLoginLogs,
  unauthorizedLogs,
) {
  return alerts.map(
    (alert, index) => {
      const meta =
        getAlertMeta(
          alert.alert_type,
        )

      const relatedLogs =
        alert.alert_type ===
        'REPEATED_FAILED_LOGIN'
          ? failedLoginLogs
          : alert.alert_type ===
              'UNAUTHORIZED_ACCESS'
            ? unauthorizedLogs
            : []

      return {
        id:
          `${alert.alert_type}-${alert.ip_address || 'unknown'}-${alert.last_detected_at || index}`,

        alertType:
          alert.alert_type,

        severity:
          alert.severity,

        sourceIp:
          alert.ip_address ||
          'Unknown',

        eventCount:
          alert.event_count,

        message:
          alert.message,

        firstDetectedAt:
          alert.first_detected_at,

        lastDetectedAt:
          alert.last_detected_at,

        event: meta.event,
        category:
          meta.category,

        user:
          findMatchingUsername(
            alert,
            relatedLogs,
          ),
      }
    },
  )
}

function SecurityAlerts() {
  const [alerts, setAlerts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [query, setQuery] =
    useState('')

  const [filter, setFilter] =
    useState('ALL')

  const [
    selectedAlertId,
    setSelectedAlertId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadAlerts =
      async () => {
        setLoading(true)
        setError('')

        try {
          const [
            alertsResponse,
            failedLoginResponse,
            unauthorizedResponse,
          ] = await Promise.all([
            api.get(
              '/security-monitoring/alerts',
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

          if (cancelled) {
            return
          }

          const nextAlerts =
            buildDisplayAlerts(
              alertsResponse.data,
              failedLoginResponse.data,
              unauthorizedResponse.data,
            )

          setAlerts(nextAlerts)

          setSelectedAlertId(
            (current) => {
              if (
                current &&
                nextAlerts.some(
                  (alert) =>
                    alert.id ===
                    current,
                )
              ) {
                return current
              }

              return (
                nextAlerts[0]?.id ||
                null
              )
            },
          )
        } catch (loadError) {
          if (cancelled) {
            return
          }

          setError(
            getApiError(
              loadError,
              'Unable to load security alerts.',
            ),
          )
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

    loadAlerts()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredAlerts =
    useMemo(() => {
      const keyword =
        query
          .trim()
          .toLowerCase()

      return alerts.filter(
        (alert) => {
          const matchesFilter =
            filter === 'ALL'
              ? true
              : alert.severity ===
                filter

          const matchesKeyword =
            !keyword ||
            [
              alert.event,
              alert.user,
              alert.sourceIp,
              alert.category,
              alert.message,
            ]
              .join(' ')
              .toLowerCase()
              .includes(keyword)

          return (
            matchesFilter &&
            matchesKeyword
          )
        },
      )
    }, [
      alerts,
      filter,
      query,
    ])

  const selectedAlert =
    useMemo(() => {
      const selected =
        filteredAlerts.find(
          (alert) =>
            alert.id ===
            selectedAlertId,
        )

      return (
        selected ||
        filteredAlerts[0] ||
        null
      )
    }, [
      filteredAlerts,
      selectedAlertId,
    ])

  const totals =
    useMemo(() => {
      const high =
        alerts.filter(
          (alert) =>
            alert.severity ===
            'HIGH',
        ).length

      const medium =
        alerts.filter(
          (alert) =>
            alert.severity ===
            'MEDIUM',
        ).length

      return {
        total:
          alerts.length,

        high,
        medium,
      }
    }, [alerts])

  const lastUpdated =
    useMemo(() => {
      if (
        alerts.length === 0
      ) {
        return 'No active alerts'
      }

      const latest =
        alerts
          .map(
            (alert) =>
              new Date(
                alert.lastDetectedAt,
              ).getTime(),
          )
          .filter(
            Number.isFinite,
          )
          .sort(
            (a, b) =>
              b - a,
          )[0]

      if (!latest) {
        return 'Unavailable'
      }

      return formatTime(
        new Date(latest),
      )
    }, [alerts])

  return (
    <section className="security-alerts page-enter">
      <div className="security-alerts__topbar">
        <div>
          <p className="secura-eyebrow">
            SECURITY OFFICER WORKSPACE
          </p>

          <h1 className="security-alerts__title">
            Security Alerts
          </h1>

          <p className="security-alerts__subtitle">
            Review security alerts
            generated from failed login
            attempts and unauthorized
            access events.
          </p>
        </div>

        <div className="security-alerts__updated-at">
          Last updated{' '}
          {lastUpdated}
        </div>
      </div>

      {error && (
        <div
          className="security-review-figma-error"
          role="alert"
        >
          <ShieldAlert
            size={16}
          />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="security-alerts__summary-grid">
        <article className="security-alerts__summary-card security-alerts__summary-card--total">
          <div className="security-alerts__summary-icon">
            <ShieldAlert
              size={22}
            />
          </div>

          <div>
            <p className="security-alerts__summary-label">
              Total Alerts
            </p>

            <p className="security-alerts__summary-value">
              {loading
                ? '—'
                : totals.total}
            </p>
          </div>
        </article>

        <article
          className={
            getSeverityMeta(
              'HIGH',
            ).cardClass
          }
        >
          <div className="security-alerts__summary-icon">
            {
              getSeverityMeta(
                'HIGH',
              ).icon
            }
          </div>

          <div>
            <p className="security-alerts__summary-label">
              High
            </p>

            <p className="security-alerts__summary-value">
              {loading
                ? '—'
                : totals.high}
            </p>
          </div>
        </article>

        <article
          className={
            getSeverityMeta(
              'MEDIUM',
            ).cardClass
          }
        >
          <div className="security-alerts__summary-icon">
            {
              getSeverityMeta(
                'MEDIUM',
              ).icon
            }
          </div>

          <div>
            <p className="security-alerts__summary-label">
              Medium
            </p>

            <p className="security-alerts__summary-value">
              {loading
                ? '—'
                : totals.medium}
            </p>
          </div>
        </article>
      </div>

      <div className="security-alerts__content-grid">
        <div className="security-alerts__panel security-alerts__panel--table">
          <div className="security-alerts__panel-toolbar">
            <label className="security-alerts__search">
              <Search size={16} />

              <input
                type="text"
                value={query}
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="Search event, user, or IP address"
              />
            </label>

            <div className="security-alerts__filters">
              {[
                'ALL',
                'HIGH',
                'MEDIUM',
              ].map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() =>
                      setFilter(tab)
                    }
                    className={
                      filter === tab
                        ? 'security-alerts__filter is-active'
                        : 'security-alerts__filter'
                    }
                  >
                    {tab === 'ALL'
                      ? 'All'
                      : tab
                          .charAt(0) +
                        tab
                          .slice(1)
                          .toLowerCase()}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="security-alerts__table-wrap">
            <table className="security-alerts__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>
                    Source IP
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">
                      <div className="security-alerts__empty">
                        Loading security
                        alerts...
                      </div>
                    </td>
                  </tr>
                ) : filteredAlerts.length >
                  0 ? (
                  filteredAlerts.map(
                    (alert) => {
                      const meta =
                        getSeverityMeta(
                          alert.severity,
                        )

                      const isActive =
                        selectedAlert
                          ?.id ===
                        alert.id

                      return (
                        <tr
                          key={
                            alert.id
                          }
                          onClick={() =>
                            setSelectedAlertId(
                              alert.id,
                            )
                          }
                          className={
                            isActive
                              ? 'is-active'
                              : ''
                          }
                        >
                          <td>
                            {formatTime(
                              alert.lastDetectedAt,
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                meta.badgeClass
                              }
                            >
                              {
                                alert.severity
                              }
                            </span>
                          </td>

                          <td>
                            {
                              alert.event
                            }
                          </td>

                          <td>
                            {
                              alert.user
                            }
                          </td>

                          <td>
                            {
                              alert.sourceIp
                            }
                          </td>
                        </tr>
                      )
                    },
                  )
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="security-alerts__empty">
                        {alerts.length ===
                        0
                          ? 'No active application security alerts.'
                          : 'No alerts match your current search or filter.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="security-alerts__panel security-alerts__panel--details">
          {selectedAlert ? (
            <>
              <div className="security-alerts__details-header">
                <div className="security-alerts__details-icon">
                  <ShieldAlert
                    size={16}
                  />
                </div>

                <div>
                  <p className="security-alerts__details-kicker">
                    Alert details
                  </p>

                  <h2 className="security-alerts__details-title">
                    {
                      selectedAlert.event
                    }
                  </h2>
                </div>

                <span
                  className={
                    getSeverityMeta(
                      selectedAlert.severity,
                    ).badgeClass
                  }
                >
                  {
                    selectedAlert.severity
                  }
                </span>
              </div>

              <div className="security-alerts__detail-list">
                <div className="security-alerts__detail-item">
                  <span>Event</span>

                  <strong>
                    {
                      selectedAlert.event
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Severity
                  </span>

                  <strong>
                    {
                      selectedAlert.severity
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Category
                  </span>

                  <strong>
                    {
                      selectedAlert.category
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>User</span>

                  <strong>
                    {
                      selectedAlert.user
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Source IP
                  </span>

                  <strong>
                    {
                      selectedAlert.sourceIp
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Event count
                  </span>

                  <strong>
                    {
                      selectedAlert.eventCount
                    }
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    First detected
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedAlert.firstDetectedAt,
                    )}
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Last detected
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedAlert.lastDetectedAt,
                    )}
                  </strong>
                </div>

                <div className="security-alerts__detail-item">
                  <span>
                    Details
                  </span>

                  <strong>
                    {
                      selectedAlert.message
                    }
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="security-alerts__details-empty">
              {loading
                ? 'Loading alert details...'
                : 'No active alert selected.'}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export default SecurityAlerts
