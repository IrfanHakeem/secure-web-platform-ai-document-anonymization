import {
  AlertTriangle,
  Clock3,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '../../api/client'

function getApiError(error, fallback) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

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

function getAlertDetails(alertType) {
  const details = {
    REPEATED_FAILED_LOGIN: {
      label: 'Repeated failed login',
      category: 'Authentication',
    },

    UNAUTHORIZED_ACCESS: {
      label: 'Unauthorized access',
      category: 'Authorization',
    },
  }

  return (
    details[alertType] ?? {
      label:
        alertType
          ?.replaceAll('_', ' ')
          .toLowerCase() ||
        'Security event',

      category: 'Application',
    }
  )
}

function SecurityAlerts() {
  const [alerts, setAlerts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [severityFilter, setSeverityFilter] =
    useState('ALL')

  const [query, setQuery] =
    useState('')

  const [selectedAlert, setSelectedAlert] =
    useState(null)

  useEffect(() => {
    let cancelled = false

    api
      .get('/security-monitoring/alerts')
      .then((response) => {
        if (!cancelled) {
          setAlerts(response.data)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load security alerts.',
            ),
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

  const severityCounts = useMemo(
    () => ({
      ALL: alerts.length,

      HIGH: alerts.filter(
        (alert) =>
          alert.severity === 'HIGH',
      ).length,

      MEDIUM: alerts.filter(
        (alert) =>
          alert.severity === 'MEDIUM',
      ).length,
    }),
    [alerts],
  )

  const visibleAlerts = useMemo(() => {
    let filtered = alerts

    if (
      severityFilter !== 'ALL'
    ) {
      filtered =
        filtered.filter(
          (alert) =>
            alert.severity ===
            severityFilter,
        )
    }

    const normalizedQuery =
      query
        .trim()
        .toLowerCase()

    if (!normalizedQuery) {
      return filtered
    }

    return filtered.filter(
      (alert) => {
        const details =
          getAlertDetails(
            alert.alert_type,
          )

        return [
          alert.alert_type,
          details.label,
          details.category,
          alert.message,
          alert.ip_address,
          alert.severity,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(
            normalizedQuery,
          )
      },
    )
  }, [
    alerts,
    query,
    severityFilter,
  ])

  return (
    <>
      <header className="security-alerts-header">
        <div>
          <p className="secura-eyebrow">
            SECURITY WORKSPACE
          </p>

          <h1>
            Security alerts
          </h1>

          <p>
            Review active security
            alerts detected from
            Secura application activity.
          </p>
        </div>

        <div className="security-alert-count">
          <span>
            <ShieldAlert
              size={17}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : alerts.length}
            </b>

            <small>
              Active Alerts
            </small>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="security-alerts-error"
          role="alert"
        >
          <ShieldAlert
            size={16}
          />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="security-alerts-card">
        <div className="security-alerts-toolbar">
          <div className="security-alerts-filters">
            {[
              ['ALL', 'All'],
              ['HIGH', 'High'],
              ['MEDIUM', 'Medium'],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    severityFilter ===
                    value
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setSeverityFilter(
                      value,
                    )
                  }
                >
                  {label}

                  <span>
                    {
                      severityCounts[
                        value
                      ]
                    }
                  </span>
                </button>
              ),
            )}
          </div>

          <div className="security-alerts-search">
            <Search size={14} />

            <input
              value={query}
              placeholder="Search alerts"
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
            />

            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() =>
                  setQuery('')
                }
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="security-alerts-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleAlerts.length ===
          0 ? (
          <div className="security-alerts-empty">
            <span>
              <ShieldCheck
                size={22}
              />
            </span>

            <b>
              {alerts.length === 0
                ? 'No active security alerts'
                : 'No matching alerts'}
            </b>

            <p>
              {alerts.length === 0
                ? 'No repeated failed-login or unauthorized-access alerts currently meet the detection thresholds.'
                : 'Try another severity filter or search term.'}
            </p>
          </div>
        ) : (
          <div className="security-alerts-table-wrap">
            <div className="security-alerts-table">
              <div className="security-alerts-row security-alerts-heading">
                <span>Time</span>
                <span>Severity</span>
                <span>Event</span>
                <span>User</span>
                <span>Source IP</span>
              </div>

              {visibleAlerts.map(
                (alert, index) => {
                  const details =
                    getAlertDetails(
                      alert.alert_type,
                    )

                  const selected =
                    selectedAlert ===
                    alert

                  return (
                    <button
                      type="button"
                      className={[
                        'security-alerts-row',
                        'security-alert-row-button',
                        selected
                          ? 'selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={`${alert.alert_type}-${alert.ip_address}-${alert.last_detected_at}-${index}`}
                      onClick={() =>
                        setSelectedAlert(
                          alert,
                        )
                      }
                    >
                      <span className="security-alert-time">
                        <Clock3
                          size={12}
                        />

                        {formatDateTime(
                          alert.last_detected_at,
                        )}
                      </span>

                      <span
                        className={`security-alert-severity ${alert.severity.toLowerCase()}`}
                      >
                        {alert.severity}
                      </span>

                      <span className="security-alert-event">
                        <b>
                          {
                            details.label
                          }
                        </b>

                        <small>
                          {alert.event_count}{' '}
                          {alert.event_count ===
                          1
                            ? 'event'
                            : 'events'}
                        </small>
                      </span>

                      <span className="security-alert-user">
                        —
                      </span>

                      <code>
                        {alert.ip_address ||
                          '—'}
                      </code>
                    </button>
                  )
                },
              )}
            </div>
          </div>
        )}
      </section>

      {selectedAlert && (
        <div
          className="security-alert-details-backdrop"
          onClick={() =>
            setSelectedAlert(null)
          }
        >
          <section
            className="security-alert-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-alert-details-close"
              aria-label="Close"
              onClick={() =>
                setSelectedAlert(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              SECURITY ALERT
            </p>

            <h2>
              {
                getAlertDetails(
                  selectedAlert
                    .alert_type,
                ).label
              }
            </h2>

            <div className="security-alert-details-top">
              <span
                className={`security-alert-severity ${selectedAlert.severity.toLowerCase()}`}
              >
                {
                  selectedAlert.severity
                }
              </span>

              <span>
                {
                  getAlertDetails(
                    selectedAlert
                      .alert_type,
                  ).category
                }
              </span>
            </div>

            <div className="security-alert-details-grid">
              <div>
                <small>
                  Source IP
                </small>

                <b>
                  {selectedAlert
                    .ip_address ||
                    '—'}
                </b>
              </div>

              <div>
                <small>
                  User
                </small>

                <b>—</b>
              </div>

              <div>
                <small>
                  Event count
                </small>

                <b>
                  {
                    selectedAlert
                      .event_count
                  }
                </b>
              </div>

              <div>
                <small>
                  Category
                </small>

                <b>
                  {
                    getAlertDetails(
                      selectedAlert
                        .alert_type,
                    ).category
                  }
                </b>
              </div>

              <div>
                <small>
                  First detected
                </small>

                <b>
                  {formatDateTime(
                    selectedAlert
                      .first_detected_at,
                  )}
                </b>
              </div>

              <div>
                <small>
                  Last detected
                </small>

                <b>
                  {formatDateTime(
                    selectedAlert
                      .last_detected_at,
                  )}
                </b>
              </div>
            </div>

            <div className="security-alert-message">
              <AlertTriangle
                size={16}
              />

              <div>
                <small>
                  DETECTION DETAILS
                </small>

                <p>
                  {
                    selectedAlert
                      .message
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              className="security-alert-details-done"
              onClick={() =>
                setSelectedAlert(null)
              }
            >
              Done
            </button>
          </section>
        </div>
      )}
    </>
  )
}

export default SecurityAlerts