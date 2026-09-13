import {
  Download,
  FileText,
  Network,
  Search,
  ShieldAlert,
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

  const type = formatAction(
    log.resource_type,
  )

  if (
    log.resource_id === null ||
    log.resource_id === undefined
  ) {
    return type
  }

  return `${type} #${log.resource_id}`
}

function classifyApplicationLog(log) {
  const action =
    String(log.action || '')
      .toUpperCase()

  const deniedMarkers = [
    'FAILED',
    'FAILURE',
    'UNAUTHORIZED',
    'REJECTED',
    'DENIED',
    'BLOCKED',
  ]

  const denied =
    deniedMarkers.some(
      (marker) =>
        action.includes(marker),
    )

  return denied
    ? 'DENIED'
    : 'SUCCESS'
}

function getApplicationResourceLabel(log) {
  if (log.action === 'LOGIN_FAILED') {
    return 'Authentication'
  }

  if (log.action === 'LOGIN_SUCCESS') {
    return 'Authentication'
  }

  return formatResource(log)
}

function getSeverityClass(severity) {
  return String(
    severity || 'UNKNOWN',
  )
    .toLowerCase()
    .replaceAll('_', '-')
}

function getNetworkStatus(status) {
  const map = {
    ACTIVE: {
      label: 'Active',
      className: 'active',
    },
    AWAITING_DATA: {
      label: 'Awaiting Data',
      className: 'awaiting',
    },
    STALE: {
      label: 'Stale',
      className: 'stale',
    },
    NOT_CONFIGURED: {
      label: 'Not Configured',
      className:
        'not-configured',
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

function csvEscape(value) {
  const text =
    value === null ||
    value === undefined
      ? ''
      : String(value)

  return `"${text.replaceAll(
    '"',
    '""',
  )}"`
}

function downloadCsv(
  filename,
  headers,
  rows,
) {
  const content = [
    headers
      .map(csvEscape)
      .join(','),

    ...rows.map(
      (row) =>
        row
          .map(csvEscape)
          .join(','),
    ),
  ].join('\n')

  const blob =
    new Blob(
      [content],
      {
        type:
          'text/csv;charset=utf-8;',
      },
    )

  const url =
    URL.createObjectURL(blob)

  const anchor =
    document.createElement('a')

  anchor.href = url
  anchor.download = filename

  document.body.appendChild(
    anchor,
  )

  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
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

  const [filter, setFilter] =
    useState('ALL')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    selectedApplicationId,
    setSelectedApplicationId,
  ] = useState(null)

  const [
    selectedNetworkId,
    setSelectedNetworkId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadLogs =
      async () => {
        setLoading(true)
        setError('')

        try {
          const [
            logsResponse,
            eventsResponse,
            statusResponse,
          ] =
            await Promise.all([
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

          if (cancelled) {
            return
          }

          const logs =
            logsResponse.data

          const events =
            eventsResponse.data

          setApplicationLogs(logs)
          setNetworkEvents(events)
          setNetworkStatus(
            statusResponse.data,
          )

          setSelectedApplicationId(
            logs[0]?.id ?? null,
          )

          setSelectedNetworkId(
            events[0]?.id ?? null,
          )
        } catch (loadError) {
          if (!cancelled) {
            setError(
              getApiError(
                loadError,
                'Unable to load security logs.',
              ),
            )
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

    loadLogs()

    return () => {
      cancelled = true
    }
  }, [])

  const applicationStats =
    useMemo(() => {
      const denied =
        applicationLogs.filter(
          (log) =>
            classifyApplicationLog(
              log,
            ) === 'DENIED',
        ).length

      return {
        total:
          applicationLogs.length,

        denied,

        successful:
          applicationLogs.length -
          denied,
      }
    }, [applicationLogs])

  const networkStats =
    useMemo(() => {
      const counts = {
        total:
          networkEvents.length,
        highCritical: 0,
        medium: 0,
        low: 0,
      }

      networkEvents.forEach(
        (event) => {
          const severity =
            String(
              event.severity || '',
            ).toUpperCase()

          if (
            severity ===
              'CRITICAL' ||
            severity === 'HIGH'
          ) {
            counts.highCritical += 1
          } else if (
            severity === 'MEDIUM'
          ) {
            counts.medium += 1
          } else if (
            severity === 'LOW'
          ) {
            counts.low += 1
          }
        },
      )

      return counts
    }, [networkEvents])

  const visibleApplicationLogs =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase()

      return applicationLogs.filter(
        (log) => {
          const result =
            classifyApplicationLog(
              log,
            )

          const matchesFilter =
            filter === 'ALL'
              ? true
              : result ===
                filter

          const matchesQuery =
            !normalized ||
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
              .includes(normalized)

          return (
            matchesFilter &&
            matchesQuery
          )
        },
      )
    }, [
      applicationLogs,
      filter,
      query,
    ])

  const visibleNetworkEvents =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase()

      return networkEvents.filter(
        (event) => {
          const severity =
            String(
              event.severity || '',
            ).toUpperCase()

          let matchesFilter = true

          if (filter !== 'ALL') {
            if (
              filter ===
              'HIGH_CRITICAL'
            ) {
              matchesFilter =
                severity ===
                  'CRITICAL' ||
                severity === 'HIGH'
            } else {
              matchesFilter =
                severity === filter
            }
          }

          const matchesQuery =
            !normalized ||
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
              .includes(normalized)

          return (
            matchesFilter &&
            matchesQuery
          )
        },
      )
    }, [
      filter,
      networkEvents,
      query,
    ])

  const selectedApplicationLog =
    useMemo(
      () =>
        visibleApplicationLogs.find(
          (log) =>
            log.id ===
            selectedApplicationId,
        ) ||
        visibleApplicationLogs[0] ||
        null,
      [
        selectedApplicationId,
        visibleApplicationLogs,
      ],
    )

  const selectedNetworkEvent =
    useMemo(
      () =>
        visibleNetworkEvents.find(
          (event) =>
            event.id ===
            selectedNetworkId,
        ) ||
        visibleNetworkEvents[0] ||
        null,
      [
        selectedNetworkId,
        visibleNetworkEvents,
      ],
    )

  const lastUpdated =
    useMemo(() => {
      const timestamps =
        tab === 'application'
          ? applicationLogs.map(
              (log) =>
                log.created_at,
            )
          : networkEvents.map(
              (event) =>
                event.event_timestamp,
            )

      const latest =
        timestamps
          .map(
            (value) =>
              new Date(
                value,
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
        return 'No events'
      }

      return formatTime(
        new Date(latest),
      )
    }, [
      applicationLogs,
      networkEvents,
      tab,
    ])

  const monitoring =
    getNetworkStatus(
      networkStatus?.status,
    )

  const changeTab =
    (nextTab) => {
      setTab(nextTab)
      setQuery('')
      setFilter('ALL')
    }

  const exportCurrentView =
    () => {
      if (
        tab === 'application'
      ) {
        downloadCsv(
          'security-application-logs.csv',
          [
            'Timestamp',
            'User',
            'Action',
            'Resource',
            'Result',
            'IP Address',
            'Details',
          ],
          visibleApplicationLogs.map(
            (log) => [
              formatDateTime(
                log.created_at,
              ),
              log.username ||
                'System / Unknown',
              log.action,
              getApplicationResourceLabel(
                log,
              ),
              classifyApplicationLog(
                log,
              ),
              log.ip_address || '',
              log.details || '',
            ],
          ),
        )

        return
      }

      downloadCsv(
        'security-network-events.csv',
        [
          'Timestamp',
          'Severity',
          'Sensor',
          'Event',
          'Source IP',
          'Source Port',
          'Destination IP',
          'Destination Port',
          'Protocol',
          'Signature',
          'Category',
          'Details',
        ],
        visibleNetworkEvents.map(
          (event) => [
            formatDateTime(
              event.event_timestamp,
            ),
            event.severity,
            event.sensor_name,
            event.event_type,
            event.source_ip || '',
            event.source_port || '',
            event.destination_ip ||
              '',
            event.destination_port ||
              '',
            event.protocol || '',
            event.signature || '',
            event.category || '',
            event.details || '',
          ],
        ),
      )
    }

  const applicationFilters = [
    {
      value: 'ALL',
      label: 'All',
    },
    {
      value: 'SUCCESS',
      label: 'Success',
    },
    {
      value: 'DENIED',
      label: 'Denied',
    },
  ]

  const networkFilters = [
    {
      value: 'ALL',
      label: 'All',
    },
    {
      value:
        'HIGH_CRITICAL',
      label: 'High / Critical',
    },
    {
      value: 'MEDIUM',
      label: 'Medium',
    },
    {
      value: 'LOW',
      label: 'Low',
    },
  ]

  return (
    <section className="security-logs-pro page-enter">
      <header className="security-logs-pro__header">
        <div>
          <p className="secura-eyebrow">
            SECURITY OFFICER WORKSPACE
          </p>

          <h1>
            Security Logs
          </h1>

          <p>
            Review application audit
            activity and network security
            events across the secure
            workspace.
          </p>
        </div>

        <div className="security-logs-pro__header-actions">
          <span>
            Last updated{' '}
            {lastUpdated}
          </span>

          <button
            type="button"
            onClick={
              exportCurrentView
            }
            disabled={
              loading ||
              (tab ===
                'application'
                ? visibleApplicationLogs
                    .length === 0
                : visibleNetworkEvents
                    .length === 0)
            }
          >
            <Download
              size={14}
            />

            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div
          className="security-logs-pro__error"
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

      <nav className="security-logs-pro__tabs">
        <button
          type="button"
          className={
            tab ===
            'application'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            changeTab(
              'application',
            )
          }
        >
          <FileText
            size={15}
          />

          Application Logs
        </button>

        <button
          type="button"
          className={
            tab === 'network'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            changeTab('network')
          }
        >
          <Network
            size={15}
          />

          Network Events
        </button>
      </nav>

      {tab === 'application' ? (
        <>
          <div className="security-logs-pro__summary security-logs-pro__summary--three">
            <article>
              <span>
                Total Events
              </span>

              <strong>
                {loading
                  ? '—'
                  : applicationStats.total}
              </strong>
            </article>

            <article>
              <span>
                Denied / Failed
              </span>

              <strong className="is-dark">
                {loading
                  ? '—'
                  : applicationStats.denied}
              </strong>
            </article>

            <article>
              <span>
                Successful
              </span>

              <strong>
                {loading
                  ? '—'
                  : applicationStats.successful}
              </strong>
            </article>
          </div>

          <div className="security-logs-pro__workspace">
            <div className="security-logs-pro__list-panel">
              <div className="security-logs-pro__toolbar">
                <label className="security-logs-pro__search">
                  <Search
                    size={15}
                  />

                  <input
                    value={query}
                    placeholder="Search user, action, resource, or details"
                    onChange={(
                      event,
                    ) =>
                      setQuery(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <div className="security-logs-pro__filters">
                  {applicationFilters.map(
                    (item) => (
                      <button
                        type="button"
                        key={
                          item.value
                        }
                        className={
                          filter ===
                          item.value
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          setFilter(
                            item.value,
                          )
                        }
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="security-logs-pro__table-wrap">
                <table className="security-logs-pro__table security-logs-pro__table--application">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>
                        Action / Event
                      </th>
                      <th>
                        Resource
                      </th>
                      <th>
                        Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5">
                          <div className="security-logs-pro__empty">
                            Loading application logs...
                          </div>
                        </td>
                      </tr>
                    ) : visibleApplicationLogs.length >
                      0 ? (
                      visibleApplicationLogs.map(
                        (log) => {
                          const result =
                            classifyApplicationLog(
                              log,
                            )

                          const selected =
                            selectedApplicationLog
                              ?.id ===
                            log.id

                          return (
                            <tr
                              key={
                                log.id
                              }
                              className={
                                selected
                                  ? 'is-active'
                                  : ''
                              }
                              onClick={() =>
                                setSelectedApplicationId(
                                  log.id,
                                )
                              }
                            >
                              <td>
                                {formatTime(
                                  log.created_at,
                                )}
                              </td>

                              <td>
                                {log.username ||
                                  'System / Unknown'}
                              </td>

                              <td>
                                <b>
                                  {log.action}
                                </b>
                              </td>

                              <td>
                                {getApplicationResourceLabel(
                                  log,
                                )}
                              </td>

                              <td>
                                <span
                                  className={`security-logs-pro__result ${result.toLowerCase()}`}
                                >
                                  {
                                    result
                                  }
                                </span>
                              </td>
                            </tr>
                          )
                        },
                      )
                    ) : (
                      <tr>
                        <td colSpan="5">
                          <div className="security-logs-pro__empty">
                            No application logs match the current search or filter.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="security-logs-pro__details">
              {selectedApplicationLog ? (
                <>
                  <div className="security-logs-pro__details-heading">
                    <div>
                      <p className="secura-eyebrow">
                        LOG DETAILS
                      </p>

                      <h2>
                        Log Details
                      </h2>
                    </div>

                    <span
                      className={`security-logs-pro__result ${classifyApplicationLog(
                        selectedApplicationLog,
                      ).toLowerCase()}`}
                    >
                      {classifyApplicationLog(
                        selectedApplicationLog,
                      )}
                    </span>
                  </div>

                  <dl className="security-logs-pro__detail-list">
                    <div>
                      <dt>
                        Event
                      </dt>

                      <dd>
                        {
                          selectedApplicationLog.action
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        User
                      </dt>

                      <dd>
                        {selectedApplicationLog
                          .username ||
                          'System / Unknown'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Resource
                      </dt>

                      <dd>
                        {getApplicationResourceLabel(
                          selectedApplicationLog,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Result
                      </dt>

                      <dd>
                        {classifyApplicationLog(
                          selectedApplicationLog,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Timestamp
                      </dt>

                      <dd>
                        {formatDateTime(
                          selectedApplicationLog
                            .created_at,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        IP Address
                      </dt>

                      <dd>
                        {selectedApplicationLog
                          .ip_address ||
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Details
                      </dt>

                      <dd>
                        {selectedApplicationLog
                          .details ||
                          'No additional details recorded.'}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="security-logs-pro__empty security-logs-pro__empty--details">
                  Select an application log to review its details.
                </div>
              )}
            </aside>
          </div>
        </>
      ) : (
        <>
          <div className="security-logs-pro__network-status">
            <div>
              <span
                className={`security-logs-pro__network-dot ${monitoring.className}`}
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
            </div>

            <div>
              <small>
                Last network event
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

          <div className="security-logs-pro__summary security-logs-pro__summary--four">
            <article>
              <span>
                Network Events
              </span>

              <strong>
                {loading
                  ? '—'
                  : networkStats.total}
              </strong>
            </article>

            <article>
              <span>
                High / Critical
              </span>

              <strong className="is-dark">
                {loading
                  ? '—'
                  : networkStats.highCritical}
              </strong>
            </article>

            <article>
              <span>Medium</span>

              <strong>
                {loading
                  ? '—'
                  : networkStats.medium}
              </strong>
            </article>

            <article>
              <span>Low</span>

              <strong>
                {loading
                  ? '—'
                  : networkStats.low}
              </strong>
            </article>
          </div>

          <div className="security-logs-pro__workspace">
            <div className="security-logs-pro__list-panel">
              <div className="security-logs-pro__toolbar">
                <label className="security-logs-pro__search">
                  <Search
                    size={15}
                  />

                  <input
                    value={query}
                    placeholder="Search event, sensor, IP address, signature, or category"
                    onChange={(
                      event,
                    ) =>
                      setQuery(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <div className="security-logs-pro__filters">
                  {networkFilters.map(
                    (item) => (
                      <button
                        type="button"
                        key={
                          item.value
                        }
                        className={
                          filter ===
                          item.value
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          setFilter(
                            item.value,
                          )
                        }
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="security-logs-pro__table-wrap">
                <table className="security-logs-pro__table security-logs-pro__table--network">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>
                        Severity
                      </th>
                      <th>
                        Sensor
                      </th>
                      <th>
                        Event
                      </th>
                      <th>
                        Source
                      </th>
                      <th>
                        Destination
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6">
                          <div className="security-logs-pro__empty">
                            Loading network events...
                          </div>
                        </td>
                      </tr>
                    ) : visibleNetworkEvents.length >
                      0 ? (
                      visibleNetworkEvents.map(
                        (event) => {
                          const selected =
                            selectedNetworkEvent
                              ?.id ===
                            event.id

                          return (
                            <tr
                              key={
                                event.id
                              }
                              className={
                                selected
                                  ? 'is-active'
                                  : ''
                              }
                              onClick={() =>
                                setSelectedNetworkId(
                                  event.id,
                                )
                              }
                            >
                              <td>
                                {formatTime(
                                  event.event_timestamp,
                                )}
                              </td>

                              <td>
                                <span
                                  className={`security-logs-pro__severity ${getSeverityClass(
                                    event.severity,
                                  )}`}
                                >
                                  {
                                    event.severity
                                  }
                                </span>
                              </td>

                              <td>
                                {
                                  event.sensor_name
                                }
                              </td>

                              <td>
                                <b>
                                  {
                                    event.event_type
                                  }
                                </b>
                              </td>

                              <td>
                                {event.source_ip ||
                                  '—'}
                                {event.source_port
                                  ? `:${event.source_port}`
                                  : ''}
                              </td>

                              <td>
                                {event.destination_ip ||
                                  '—'}
                                {event.destination_port
                                  ? `:${event.destination_port}`
                                  : ''}
                              </td>
                            </tr>
                          )
                        },
                      )
                    ) : (
                      <tr>
                        <td colSpan="6">
                          <div className="security-logs-pro__empty">
                            {networkStatus?.status ===
                            'NOT_CONFIGURED'
                              ? 'Network sensor integration is not configured yet.'
                              : 'No network events match the current search or filter.'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="security-logs-pro__details">
              {selectedNetworkEvent ? (
                <>
                  <div className="security-logs-pro__details-heading">
                    <div>
                      <p className="secura-eyebrow">
                        NETWORK EVENT DETAILS
                      </p>

                      <h2>
                        Network Event
                        Details
                      </h2>
                    </div>

                    <span
                      className={`security-logs-pro__severity ${getSeverityClass(
                        selectedNetworkEvent.severity,
                      )}`}
                    >
                      {
                        selectedNetworkEvent.severity
                      }
                    </span>
                  </div>

                  <dl className="security-logs-pro__detail-list">
                    <div>
                      <dt>
                        Severity
                      </dt>

                      <dd>
                        {
                          selectedNetworkEvent.severity
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Event Type
                      </dt>

                      <dd>
                        {
                          selectedNetworkEvent.event_type
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Sensor
                      </dt>

                      <dd>
                        {
                          selectedNetworkEvent.sensor_name
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Source IP
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .source_ip ||
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Source Port
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .source_port ??
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Destination IP
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .destination_ip ||
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Destination Port
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .destination_port ??
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Protocol
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .protocol ||
                          '—'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Signature
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .signature ||
                          'Not available'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Category
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .category ||
                          'Not available'}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Event Timestamp
                      </dt>

                      <dd>
                        {formatDateTime(
                          selectedNetworkEvent
                            .event_timestamp,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Received At
                      </dt>

                      <dd>
                        {formatDateTime(
                          selectedNetworkEvent
                            .received_at,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Details
                      </dt>

                      <dd>
                        {selectedNetworkEvent
                          .details ||
                          'No additional event details recorded.'}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="security-logs-pro__empty security-logs-pro__empty--details">
                  {networkStatus?.status ===
                  'NOT_CONFIGURED'
                    ? 'Network monitoring is not configured yet.'
                    : 'Select a network event to review its details.'}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  )
}

export default SecurityLogs
