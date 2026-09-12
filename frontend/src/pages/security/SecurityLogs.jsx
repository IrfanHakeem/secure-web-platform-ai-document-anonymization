import {
  Activity,
  Clock3,
  FileText,
  Network,
  Search,
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
      second: '2-digit',
    },
  ).format(date)
}

function formatAction(action) {
  if (!action) {
    return 'Unknown'
  }

  return action
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function formatResource(log) {
  if (!log.resource_type) {
    return '—'
  }

  if (
    log.resource_id === null ||
    log.resource_id === undefined
  ) {
    return log.resource_type
  }

  return `${log.resource_type} #${log.resource_id}`
}

function getNetworkStatus(status) {
  const map = {
    ACTIVE: {
      label: 'Active',
      className: 'active',
    },

    AWAITING_DATA: {
      label: 'Awaiting data',
      className: 'awaiting',
    },

    STALE: {
      label: 'Stale',
      className: 'stale',
    },

    NOT_CONFIGURED: {
      label: 'Not configured',
      className: 'not-configured',
    },
  }

  return (
    map[status] ?? {
      label:
        status || 'Unknown',
      className:
        'not-configured',
    }
  )
}

function SecurityLogs() {
  const [tab, setTab] =
    useState('application')

  const [
    applicationLogs,
    setApplicationLogs,
  ] = useState([])

  const [
    networkEvents,
    setNetworkEvents,
  ] = useState([])

  const [
    networkStatus,
    setNetworkStatus,
  ] = useState(null)

  const [query, setQuery] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    selectedApplicationLog,
    setSelectedApplicationLog,
  ] = useState(null)

  const [
    selectedNetworkEvent,
    setSelectedNetworkEvent,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get(
        '/security-monitoring/recent-logs',
        {
          params: {
            limit: 200,
          },
        },
      ),

      api.get(
        '/security-monitoring/network-events',
        {
          params: {
            limit: 200,
          },
        },
      ),

      api.get(
        '/security-monitoring/network-status',
      ),
    ])
      .then(
        ([
          logsResponse,
          eventsResponse,
          statusResponse,
        ]) => {
          if (cancelled) {
            return
          }

          setApplicationLogs(
            logsResponse.data,
          )

          setNetworkEvents(
            eventsResponse.data,
          )

          setNetworkStatus(
            statusResponse.data,
          )
        },
      )
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load security logs.',
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

  const visibleApplicationLogs =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase()

      if (!normalized) {
        return applicationLogs
      }

      return applicationLogs.filter(
        (log) =>
          [
            log.username,
            log.action,
            log.resource_type,
            log.resource_id,
            log.details,
            log.ip_address,
          ]
            .filter(
              (value) =>
                value !== null &&
                value !== undefined,
            )
            .join(' ')
            .toLowerCase()
            .includes(normalized),
      )
    }, [
      applicationLogs,
      query,
    ])

  const visibleNetworkEvents =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase()

      if (!normalized) {
        return networkEvents
      }

      return networkEvents.filter(
        (event) =>
          [
            event.sensor_name,
            event.event_type,
            event.severity,
            event.source_ip,
            event.destination_ip,
            event.source_port,
            event.destination_port,
            event.protocol,
            event.signature,
            event.category,
            event.details,
          ]
            .filter(
              (value) =>
                value !== null &&
                value !== undefined,
            )
            .join(' ')
            .toLowerCase()
            .includes(normalized),
      )
    }, [
      networkEvents,
      query,
    ])

  const monitoring =
    getNetworkStatus(
      networkStatus?.status,
    )

  const changeTab = (
    nextTab,
  ) => {
    setTab(nextTab)
    setQuery('')
  }

  return (
    <>
      <header className="security-logs-header">
        <div>
          <p className="secura-eyebrow">
            SECURITY WORKSPACE
          </p>

          <h1>
            Security logs
          </h1>

          <p>
            Inspect Secura application
            audit activity and network
            security events.
          </p>
        </div>

        <div className="security-logs-count">
          <span>
            <Activity size={17} />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : tab ===
                    'application'
                  ? applicationLogs.length
                  : networkEvents.length}
            </b>

            <small>
              {tab ===
              'application'
                ? 'Application logs'
                : 'Network events'}
            </small>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="security-logs-error"
          role="alert"
        >
          <Activity size={16} />

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

      <section className="security-logs-card">
        <div className="security-logs-toolbar">
          <div className="security-logs-tabs">
            <button
              type="button"
              className={
                tab ===
                'application'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                changeTab(
                  'application',
                )
              }
            >
              <FileText
                size={14}
              />

              Application Logs

              <span>
                {
                  applicationLogs.length
                }
              </span>
            </button>

            <button
              type="button"
              className={
                tab === 'network'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                changeTab('network')
              }
            >
              <Network size={14} />

              Network Events

              <span>
                {
                  networkEvents.length
                }
              </span>
            </button>
          </div>

          <div className="security-logs-search">
            <Search size={14} />

            <input
              value={query}
              placeholder={
                tab ===
                'application'
                  ? 'Search application logs'
                  : 'Search network events'
              }
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

        {tab === 'network' && (
          <div className="security-network-log-status">
            <span
              className={`security-network-log-dot ${monitoring.className}`}
            />

            <div>
              <small>
                NETWORK MONITORING
              </small>

              <b>
                {loading
                  ? 'Checking...'
                  : monitoring.label}
              </b>
            </div>

            <div className="security-network-log-last">
              <small>
                Last event
              </small>

              <b>
                {loading
                  ? '—'
                  : formatDateTime(
                      networkStatus
                        ?.last_event_at,
                    )}
              </b>
            </div>
          </div>
        )}

        {loading ? (
          <div className="security-logs-loading">
            <div />
            <div />
            <div />
          </div>
        ) : tab ===
          'application' ? (
          visibleApplicationLogs.length ===
          0 ? (
            <div className="security-logs-empty">
              <span>
                <FileText
                  size={22}
                />
              </span>

              <b>
                No application logs
                found
              </b>

              <p>
                No audit log matches
                the current search.
              </p>
            </div>
          ) : (
            <div className="security-logs-table-wrap">
              <div className="security-application-table">
                <div className="security-application-row security-log-heading">
                  <span>Time</span>
                  <span>Action</span>
                  <span>User</span>
                  <span>Resource</span>
                  <span>IP Address</span>
                </div>

                {visibleApplicationLogs.map(
                  (log) => (
                    <button
                      type="button"
                      key={log.id}
                      className="security-application-row security-log-row-button"
                      onClick={() =>
                        setSelectedApplicationLog(
                          log,
                        )
                      }
                    >
                      <span className="security-log-time">
                        <Clock3
                          size={12}
                        />

                        {formatDateTime(
                          log.created_at,
                        )}
                      </span>

                      <span className="security-log-action">
                        {formatAction(
                          log.action,
                        )}
                      </span>

                      <span>
                        {log.username ||
                          'System / Unknown'}
                      </span>

                      <span>
                        {formatResource(
                          log,
                        )}
                      </span>

                      <code>
                        {log.ip_address ||
                          '—'}
                      </code>
                    </button>
                  ),
                )}
              </div>
            </div>
          )
        ) : visibleNetworkEvents.length ===
          0 ? (
          <div className="security-logs-empty">
            <span>
              <Network
                size={22}
              />
            </span>

            <b>
              No network events
              found
            </b>

            <p>
              {networkStatus?.status ===
              'NOT_CONFIGURED'
                ? 'Network sensor integration has not been configured yet.'
                : 'No network event matches the current search.'}
            </p>
          </div>
        ) : (
          <div className="security-logs-table-wrap">
            <div className="security-network-table">
              <div className="security-network-row security-log-heading">
                <span>Time</span>
                <span>Severity</span>
                <span>Event</span>
                <span>Sensor</span>
                <span>Source</span>
                <span>Destination</span>
              </div>

              {visibleNetworkEvents.map(
                (event) => (
                  <button
                    type="button"
                    key={event.id}
                    className="security-network-row security-log-row-button"
                    onClick={() =>
                      setSelectedNetworkEvent(
                        event,
                      )
                    }
                  >
                    <span className="security-log-time">
                      <Clock3
                        size={12}
                      />

                      {formatDateTime(
                        event.event_timestamp,
                      )}
                    </span>

                    <span
                      className={`security-network-severity ${event.severity.toLowerCase()}`}
                    >
                      {event.severity}
                    </span>

                    <span className="security-network-event-name">
                      <b>
                        {event.event_type}
                      </b>

                      <small>
                        {event.protocol ||
                          'Protocol unavailable'}
                      </small>
                    </span>

                    <span>
                      {
                        event.sensor_name
                      }
                    </span>

                    <code>
                      {event.source_ip ||
                        '—'}
                      {event.source_port
                        ? `:${event.source_port}`
                        : ''}
                    </code>

                    <code>
                      {event.destination_ip ||
                        '—'}
                      {event.destination_port
                        ? `:${event.destination_port}`
                        : ''}
                    </code>
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </section>

      {selectedApplicationLog && (
        <div
          className="security-log-modal-backdrop"
          onClick={() =>
            setSelectedApplicationLog(
              null,
            )
          }
        >
          <section
            className="security-log-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-log-modal-close"
              onClick={() =>
                setSelectedApplicationLog(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              APPLICATION LOG
            </p>

            <h2>
              {formatAction(
                selectedApplicationLog.action,
              )}
            </h2>

            <div className="security-log-details-grid">
              <div>
                <small>User</small>

                <b>
                  {selectedApplicationLog
                    .username ||
                    'System / Unknown'}
                </b>
              </div>

              <div>
                <small>
                  Source IP
                </small>

                <b>
                  {selectedApplicationLog
                    .ip_address ||
                    '—'}
                </b>
              </div>

              <div>
                <small>
                  Resource
                </small>

                <b>
                  {formatResource(
                    selectedApplicationLog,
                  )}
                </b>
              </div>

              <div>
                <small>
                  Timestamp
                </small>

                <b>
                  {formatDateTime(
                    selectedApplicationLog
                      .created_at,
                  )}
                </b>
              </div>
            </div>

            <div className="security-log-details-message">
              <small>
                LOG DETAILS
              </small>

              <p>
                {selectedApplicationLog
                  .details ||
                  'No additional details recorded.'}
              </p>
            </div>

            <button
              type="button"
              className="security-log-modal-done"
              onClick={() =>
                setSelectedApplicationLog(
                  null,
                )
              }
            >
              Done
            </button>
          </section>
        </div>
      )}

      {selectedNetworkEvent && (
        <div
          className="security-log-modal-backdrop"
          onClick={() =>
            setSelectedNetworkEvent(
              null,
            )
          }
        >
          <section
            className="security-log-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-log-modal-close"
              onClick={() =>
                setSelectedNetworkEvent(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              NETWORK EVENT
            </p>

            <h2>
              {
                selectedNetworkEvent
                  .event_type
              }
            </h2>

            <div className="security-log-modal-tags">
              <span
                className={`security-network-severity ${selectedNetworkEvent.severity.toLowerCase()}`}
              >
                {
                  selectedNetworkEvent
                    .severity
                }
              </span>

              {selectedNetworkEvent
                .category && (
                <span>
                  {
                    selectedNetworkEvent
                      .category
                  }
                </span>
              )}
            </div>

            <div className="security-log-details-grid">
              <div>
                <small>
                  Sensor
                </small>

                <b>
                  {
                    selectedNetworkEvent
                      .sensor_name
                  }
                </b>
              </div>

              <div>
                <small>
                  Protocol
                </small>

                <b>
                  {selectedNetworkEvent
                    .protocol ||
                    '—'}
                </b>
              </div>

              <div>
                <small>
                  Source
                </small>

                <b>
                  {selectedNetworkEvent
                    .source_ip ||
                    '—'}
                  {selectedNetworkEvent
                    .source_port
                    ? `:${selectedNetworkEvent.source_port}`
                    : ''}
                </b>
              </div>

              <div>
                <small>
                  Destination
                </small>

                <b>
                  {selectedNetworkEvent
                    .destination_ip ||
                    '—'}
                  {selectedNetworkEvent
                    .destination_port
                    ? `:${selectedNetworkEvent.destination_port}`
                    : ''}
                </b>
              </div>

              <div>
                <small>
                  Event time
                </small>

                <b>
                  {formatDateTime(
                    selectedNetworkEvent
                      .event_timestamp,
                  )}
                </b>
              </div>

              <div>
                <small>
                  Received
                </small>

                <b>
                  {formatDateTime(
                    selectedNetworkEvent
                      .received_at,
                  )}
                </b>
              </div>
            </div>

            {selectedNetworkEvent
              .signature && (
              <div className="security-log-details-message">
                <small>
                  SIGNATURE
                </small>

                <p>
                  {
                    selectedNetworkEvent
                      .signature
                  }
                </p>
              </div>
            )}

            <div className="security-log-details-message">
              <small>
                EVENT DETAILS
              </small>

              <p>
                {selectedNetworkEvent
                  .details ||
                  'No additional event details recorded.'}
              </p>
            </div>

            <button
              type="button"
              className="security-log-modal-done"
              onClick={() =>
                setSelectedNetworkEvent(
                  null,
                )
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

export default SecurityLogs