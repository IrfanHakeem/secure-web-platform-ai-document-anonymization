import {
  Download,
  FileText,
  Filter,
  Network,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '../../api/client'
import './SecurityLogs.css'

function getApiError(error, fallback) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function formatPacketTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const hh = String(
    date.getHours(),
  ).padStart(2, '0')

  const mm = String(
    date.getMinutes(),
  ).padStart(2, '0')

  const ss = String(
    date.getSeconds(),
  ).padStart(2, '0')

  const ms = String(
    date.getMilliseconds(),
  ).padStart(3, '0')

  return `${hh}:${mm}:${ss}.${ms}`
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
      second: '2-digit',
    },
  ).format(date)
}

function formatAction(action) {
  if (!action) {
    return 'Unknown'
  }

  return String(action)
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

  const type =
    formatAction(
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

function getApplicationResourceLabel(log) {
  if (
    log.action === 'LOGIN_FAILED' ||
    log.action === 'LOGIN_SUCCESS'
  ) {
    return 'Authentication'
  }

  return formatResource(log)
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

function getApplicationTone(log) {
  return classifyApplicationLog(log) ===
    'DENIED'
    ? 'danger'
    : 'success'
}

function getNetworkTone(event) {
  const severity =
    String(
      event.severity || '',
    ).toUpperCase()

  if (
    severity === 'CRITICAL' ||
    severity === 'HIGH'
  ) {
    return 'danger'
  }

  if (severity === 'MEDIUM') {
    return 'warning'
  }

  if (severity === 'LOW') {
    return 'success'
  }

  return 'info'
}

function getNetworkStatus(status) {
  const statusMap = {
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
    statusMap[status] ?? {
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
    useState('network')

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
            Array.isArray(
              logsResponse.data,
            )
              ? logsResponse.data
              : []

          const events =
            Array.isArray(
              eventsResponse.data,
            )
              ? eventsResponse.data
              : []

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

  const networkProtocols =
    useMemo(() => {
      const protocols =
        networkEvents
          .map(
            (event) =>
              String(
                event.protocol || '',
              )
                .trim()
                .toUpperCase(),
          )
          .filter(Boolean)

      return [
        'ALL',
        ...Array.from(
          new Set(protocols),
        ),
      ]
    }, [networkEvents])

  const applicationFilters = [
    'ALL',
    'SUCCESS',
    'DENIED',
  ]

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
              : result === filter

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
          const protocol =
            String(
              event.protocol || '',
            )
              .trim()
              .toUpperCase()

          const matchesFilter =
            filter === 'ALL'
              ? true
              : protocol === filter

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

  const selectedEntry =
    tab === 'network'
      ? selectedNetworkEvent
      : selectedApplicationLog

  const currentRows =
    tab === 'network'
      ? visibleNetworkEvents
      : visibleApplicationLogs

  const totalRows =
    tab === 'network'
      ? networkEvents.length
      : applicationLogs.length

  const currentFilters =
    tab === 'network'
      ? networkProtocols
      : applicationFilters

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

  const selectedTone =
    !selectedEntry
      ? 'info'
      : tab === 'network'
        ? getNetworkTone(
            selectedEntry,
          )
        : getApplicationTone(
            selectedEntry,
          )

  const selectedLabel =
    !selectedEntry
      ? 'NO SELECTION'
      : tab === 'network'
        ? String(
            selectedEntry.severity ||
              'UNKNOWN',
          ).toUpperCase()
        : classifyApplicationLog(
            selectedEntry,
          )

  const detailRows =
    useMemo(() => {
      if (!selectedEntry) {
        return []
      }

      if (tab === 'network') {
        return [
          {
            label: 'Record',
            value:
              `#${selectedEntry.id}`,
          },
          {
            label: 'Timestamp',
            value:
              formatDateTime(
                selectedEntry.event_timestamp,
              ),
          },
          {
            label: 'Sensor',
            value:
              selectedEntry.sensor_name ||
              '—',
          },
          {
            label: 'Protocol',
            value:
              selectedEntry.protocol ||
              '—',
          },
          {
            label: 'Source',
            value:
              `${selectedEntry.source_ip || '—'}${
                selectedEntry.source_port
                  ? `:${selectedEntry.source_port}`
                  : ''
              }`,
          },
          {
            label: 'Destination',
            value:
              `${selectedEntry.destination_ip || '—'}${
                selectedEntry.destination_port
                  ? `:${selectedEntry.destination_port}`
                  : ''
              }`,
          },
          {
            label: 'Severity',
            value:
              selectedEntry.severity ||
              '—',
          },
          {
            label: 'Event Type',
            value:
              selectedEntry.event_type ||
              '—',
          },
          {
            label: 'Signature',
            value:
              selectedEntry.signature ||
              'Not available',
          },
          {
            label: 'Category',
            value:
              selectedEntry.category ||
              'Not available',
          },
          {
            label: 'Received At',
            value:
              formatDateTime(
                selectedEntry.received_at,
              ),
          },
          {
            label: 'Details',
            value:
              selectedEntry.details ||
              'No additional event details recorded.',
          },
        ]
      }

      return [
        {
          label: 'Record',
          value:
            `#${selectedEntry.id}`,
        },
        {
          label: 'Timestamp',
          value:
            formatDateTime(
              selectedEntry.created_at,
            ),
        },
        {
          label: 'User',
          value:
            selectedEntry.username ||
            'System / Unknown',
        },
        {
          label: 'Source IP',
          value:
            selectedEntry.ip_address ||
            '—',
        },
        {
          label: 'Event',
          value:
            selectedEntry.action ||
            'Unknown',
        },
        {
          label: 'Resource',
          value:
            getApplicationResourceLabel(
              selectedEntry,
            ),
        },
        {
          label: 'Result',
          value:
            classifyApplicationLog(
              selectedEntry,
            ),
        },
        {
          label: 'Details',
          value:
            selectedEntry.details ||
            'No additional details recorded.',
        },
      ]
    }, [
      selectedEntry,
      tab,
    ])

  return (
    <section className="security-ws page-enter">
      <div className="security-ws__window">
        <header className="security-ws__topbar">
          <div>
            <h1>
              Security Logs
            </h1>

            <p>
              {tab === 'network'
                ? 'Packet-level network event capture · Secura IDS · Suricata'
                : 'Application audit capture · Secura access controls · Audit trail'}
            </p>
          </div>

          <div className="security-ws__top-actions">
            <div className="security-ws__view-switch">
              <button
                type="button"
                className={
                  tab === 'application'
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  changeTab(
                    'application',
                  )
                }
              >
                <FileText size={12} />
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
                  changeTab(
                    'network',
                  )
                }
              >
                <Network size={12} />
                Network Events
              </button>
            </div>

            <button
              type="button"
              className="security-ws__export"
              onClick={
                exportCurrentView
              }
              disabled={
                loading ||
                currentRows.length === 0
              }
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </header>

        {error && (
          <div
            className="security-ws__error"
            role="alert"
          >
            <ShieldAlert
              size={15}
            />

            <span>{error}</span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() =>
                setError('')
              }
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="security-ws__toolbar">
          <label className="security-ws__filter-box">
            <Filter size={12} />

            <input
              value={query}
              placeholder={
                tab === 'network'
                  ? 'Apply a display filter … e.g. source IP, destination IP, protocol, signature'
                  : 'Apply a display filter … e.g. user, action, resource, IP address'
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target.value,
                )
              }
            />

            {query && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() =>
                  setQuery('')
                }
              >
                <X size={11} />
              </button>
            )}
          </label>

          <div className="security-ws__protocols">
            {currentFilters.map(
              (item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    filter === item
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    setFilter(item)
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <span className="security-ws__displayed">
            {currentRows.length}
            {' '}
            of
            {' '}
            {totalRows}
            {' '}
            {tab === 'network'
              ? 'events'
              : 'logs'}
            {' '}
            displayed
          </span>
        </div>

        {tab === 'network' && (
          <div className="security-ws__sensorbar">
            <span
              className={`security-ws__sensor-dot ${monitoring.className}`}
            />

            <span>
              Network sensor
            </span>

            <b>
              {loading
                ? 'Checking...'
                : monitoring.label}
            </b>

            {networkStatus?.last_event_at && (
              <>
                <i />

                <span>
                  Last event
                </span>

                <b>
                  {formatDateTime(
                    networkStatus.last_event_at,
                  )}
                </b>
              </>
            )}
          </div>
        )}

        <div className="security-ws__body">
          <div className="security-ws__table-wrap">
            {tab === 'network' ? (
              <table className="security-ws__table security-ws__table--network">
                <colgroup>
                  <col className="col-no" />
                  <col className="col-time" />
                  <col className="col-source" />
                  <col className="col-destination" />
                  <col className="col-protocol" />
                  <col className="col-severity" />
                  <col className="col-event" />
                  <col className="col-info" />
                </colgroup>

                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Time</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Protocol</th>
                    <th>Severity</th>
                    <th>Event</th>
                    <th>Info</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8">
                        <div className="security-ws__empty">
                          Loading network events...
                        </div>
                      </td>
                    </tr>
                  ) : visibleNetworkEvents.length >
                    0 ? (
                    visibleNetworkEvents.map(
                      (event, index) => {
                        const selected =
                          selectedNetworkEvent
                            ?.id ===
                          event.id

                        const tone =
                          getNetworkTone(
                            event,
                          )

                        const source =
                          `${event.source_ip || '—'}${
                            event.source_port
                              ? `:${event.source_port}`
                              : ''
                          }`

                        const destination =
                          `${event.destination_ip || '—'}${
                            event.destination_port
                              ? `:${event.destination_port}`
                              : ''
                          }`

                        const info =
                          [
                            event.signature,
                            event.category,
                            event.details,
                          ]
                            .filter(Boolean)
                            .join(' · ') ||
                          'No additional event details recorded.'

                        return (
                          <tr
                            key={event.id}
                            style={{
                              animationDelay:
                                `${Math.min(
                                  index * 18,
                                  180,
                                )}ms`,
                            }}
                            className={[
                              `tone-${tone}`,
                              selected
                                ? 'is-selected'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() =>
                              setSelectedNetworkId(
                                event.id,
                              )
                            }
                          >
                            <td className="is-number">
                              {event.id}
                            </td>

                            <td>
                              {formatPacketTime(
                                event.event_timestamp,
                              )}
                            </td>

                            <td>
                              {source}
                            </td>

                            <td>
                              {destination}
                            </td>

                            <td className="is-strong">
                              {String(
                                event.protocol ||
                                  '—',
                              ).toUpperCase()}
                            </td>

                            <td className="is-strong">
                              {String(
                                event.severity ||
                                  'UNKNOWN',
                              ).toUpperCase()}
                            </td>

                            <td className="is-strong">
                              {event.event_type ||
                                'Unknown'}
                            </td>

                            <td className="is-info">
                              {info}
                            </td>
                          </tr>
                        )
                      },
                    )
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="security-ws__empty">
                          {networkStatus?.status ===
                          'NOT_CONFIGURED'
                            ? 'Network sensor integration is not configured yet.'
                            : 'No network events match the current display filter.'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="security-ws__table security-ws__table--application">
                <colgroup>
                  <col className="col-no" />
                  <col className="col-time" />
                  <col className="col-user" />
                  <col className="col-ip" />
                  <col className="col-event" />
                  <col className="col-resource" />
                  <col className="col-result" />
                  <col className="col-info" />
                </colgroup>

                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Time</th>
                    <th>User</th>
                    <th>Source IP</th>
                    <th>Event</th>
                    <th>Resource</th>
                    <th>Result</th>
                    <th>Info</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8">
                        <div className="security-ws__empty">
                          Loading application logs...
                        </div>
                      </td>
                    </tr>
                  ) : visibleApplicationLogs.length >
                    0 ? (
                    visibleApplicationLogs.map(
                      (log, index) => {
                        const selected =
                          selectedApplicationLog
                            ?.id ===
                          log.id

                        const result =
                          classifyApplicationLog(
                            log,
                          )

                        const tone =
                          getApplicationTone(
                            log,
                          )

                        return (
                          <tr
                            key={log.id}
                            style={{
                              animationDelay:
                                `${Math.min(
                                  index * 18,
                                  180,
                                )}ms`,
                            }}
                            className={[
                              `tone-${tone}`,
                              selected
                                ? 'is-selected'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() =>
                              setSelectedApplicationId(
                                log.id,
                              )
                            }
                          >
                            <td className="is-number">
                              {log.id}
                            </td>

                            <td>
                              {formatPacketTime(
                                log.created_at,
                              )}
                            </td>

                            <td>
                              {log.username ||
                                'System / Unknown'}
                            </td>

                            <td>
                              {log.ip_address ||
                                '—'}
                            </td>

                            <td className="is-strong">
                              {log.action ||
                                'Unknown'}
                            </td>

                            <td>
                              {getApplicationResourceLabel(
                                log,
                              )}
                            </td>

                            <td className="is-strong">
                              {result}
                            </td>

                            <td className="is-info">
                              {log.details ||
                                'No additional details recorded.'}
                            </td>
                          </tr>
                        )
                      },
                    )
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="security-ws__empty">
                          No application logs match the current display filter.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="security-ws__details">
            {selectedEntry ? (
              <>
                <div className="security-ws__details-head">
                  <div>
                    <b>
                      {tab === 'network'
                        ? 'Event'
                        : 'Log'}
                      {' '}
                      #{selectedEntry.id}
                      {' '}
                      — Detail
                    </b>

                    <span>
                      {tab === 'network'
                        ? `${formatPacketTime(
                            selectedEntry.event_timestamp,
                          )} · ${selectedEntry.source_ip || '—'} → ${selectedEntry.destination_ip || '—'}`
                        : `${formatPacketTime(
                            selectedEntry.created_at,
                          )} · ${selectedEntry.username || 'System / Unknown'}`}
                    </span>
                  </div>

                  <span
                    className={`security-ws__badge tone-${selectedTone}`}
                  >
                    {selectedLabel}
                  </span>
                </div>

                <div className="security-ws__details-grid">
                  <div className="security-ws__tree">
                    {detailRows.map(
                      (row) => (
                        <div
                          className="security-ws__tree-row"
                          key={row.label}
                        >
                          <span>
                            {row.label}:
                          </span>

                          <b>
                            {row.value}
                          </b>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="security-ws__raw">
                    <div>
                      RAW EVENT
                    </div>

                    <pre>
                      {JSON.stringify(
                        selectedEntry,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="security-ws__details-empty">
                Select a row to inspect
                the event details.
              </div>
            )}
          </div>
        </div>

        <footer className="security-ws__statusbar">
          <div>
            <span>
              {tab === 'network'
                ? 'Events'
                : 'Logs'}
              :
              {' '}
              {totalRows}
            </span>

            <span>
              Displayed:
              {' '}
              {currentRows.length}
            </span>

            {selectedEntry && (
              <span>
                Selected:
                {' '}
                #{selectedEntry.id}
              </span>
            )}
          </div>

          <div className="security-ws__legend">
            {tab === 'network' ? (
              <>
                <span>
                  <i className="tone-danger" />
                  High / Critical
                </span>

                <span>
                  <i className="tone-warning" />
                  Medium
                </span>

                <span>
                  <i className="tone-success" />
                  Low
                </span>

                <span>
                  <i className="tone-info" />
                  Other
                </span>
              </>
            ) : (
              <>
                <span>
                  <i className="tone-danger" />
                  Denied / Failed
                </span>

                <span>
                  <i className="tone-success" />
                  Success
                </span>
              </>
            )}
          </div>
        </footer>
      </div>
    </section>
  )
}

export default SecurityLogs
