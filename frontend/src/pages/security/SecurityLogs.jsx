import {
  Check,
  CirclePause,
  Radio,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Filter,
  GripHorizontal,
  Network,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import api from '../../api/client'
import './SecurityLogs.css'

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

  // Poll REST APIs every 15 seconds while the tab is visible. This is
  // periodic refresh, not an SSE/WebSocket stream. ID comparison ensures
  // the animation never mislabels the first page load as new events.
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [freshIds, setFreshIds] = useState({ application: [], network: [] })
  const seenIdsRef = useRef({ application: null, network: null })
  const flashTimerRef = useRef(null)
  const copyFeedbackTimerRef = useRef(null)

  // Adjustable packet details pane. No impact on API requests or saved logs.
  const [detailsHeight, setDetailsHeight] = useState(230)
  const [detailsCollapsed, setDetailsCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const dragRef = useRef(null)

  const startPaneResize = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return
    event.preventDefault()
    dragRef.current = { y: event.clientY, height: detailsHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const movePaneResize = (event) => {
    if (!dragRef.current) return
    const next = dragRef.current.height + dragRef.current.y - event.clientY
    setDetailsHeight(Math.max(150, Math.min(460, next)))
    setDetailsCollapsed(false)
  }

  const endPaneResize = () => { dragRef.current = null }

  const resizeWithKeyboard = (event) => {
    if (event.target.closest('button')) return
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      setDetailsCollapsed(false)
      setDetailsHeight((current) => Math.max(150, Math.min(460,
        current + (event.key === 'ArrowUp' ? 20 : -20))))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setDetailsCollapsed((current) => !current)
    }
  }

  const copyRawEntry = async () => {
    if (!selectedEntry) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedEntry, null, 2))
      if (copyFeedbackTimerRef.current) window.clearTimeout(copyFeedbackTimerRef.current)
      setCopied(true)
      copyFeedbackTimerRef.current = window.setTimeout(() => setCopied(false), 1450)
    } catch {
      setCopied(false)
    }
  }


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
    const controller = new AbortController()
    let inFlight = false
    let pollTimer = null

    async function fetchLatest() {
      if (inFlight || controller.signal.aborted) return
      inFlight = true
      try {
        const [logsResponse, eventsResponse, statusResponse] = await Promise.all([
          api.get('/security-monitoring/recent-logs', {
            params: { limit: 200 }, signal: controller.signal,
          }),
          api.get('/security-monitoring/network-events', {
            params: { limit: 200 }, signal: controller.signal,
          }),
          api.get('/security-monitoring/network-status', {
            signal: controller.signal,
          }),
        ])
        if (controller.signal.aborted) return

        const logs = Array.isArray(logsResponse.data) ? logsResponse.data : []
        const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : []
        const nextIds = {
          application: new Set(logs.map((log) => String(log.id))),
          network: new Set(events.map((event) => String(event.id))),
        }
        const fresh = {
          application: seenIdsRef.current.application === null ? [] :
            logs.filter((log) => !seenIdsRef.current.application.has(String(log.id)))
              .slice(0, 12).map((log) => String(log.id)),
          network: seenIdsRef.current.network === null ? [] :
            events.filter((event) => !seenIdsRef.current.network.has(String(event.id)))
              .slice(0, 12).map((event) => String(event.id)),
        }
        seenIdsRef.current = nextIds
        setApplicationLogs(logs)
        setNetworkEvents(events)
        setNetworkStatus(statusResponse.data)
        setError('')
        if (fresh.application.length || fresh.network.length) {
          setFreshIds(fresh)
          if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
          flashTimerRef.current = window.setTimeout(() => {
            setFreshIds({ application: [], network: [] })
          }, 1450)
        }
      } catch (loadError) {
        if (!controller.signal.aborted && loadError?.code !== 'ERR_CANCELED') {
          setError('Unable to refresh security logs. Existing records remain visible.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
        inFlight = false
      }
    }

    // Initial request and timed refreshes only; hidden tabs do not poll.
    // Avoid synchronous state setters in the effect body (React Compiler).
    // Pause stops fetching; resuming performs one immediate catch-up.
    // The very first mount always needs its initial data, even if paused.
    if (seenIdsRef.current.application === null || autoRefresh) void fetchLatest()
    if (autoRefresh) {
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void fetchLatest()
      }, 15000)
    }
    return () => {
      controller.abort()
      if (pollTimer !== null) window.clearInterval(pollTimer)
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
      if (copyFeedbackTimerRef.current) window.clearTimeout(copyFeedbackTimerRef.current)
    }
  }, [autoRefresh])

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

  const changeTab = (nextTab) => {
    setTab(nextTab)
    setQuery('')
    setFilter('ALL')
    setCopied(false)
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
    <section className="security-ws security-ws--v138 security-ws--v139 page-enter">
      <div className="security-ws__window" style={{ '--secura-log-detail-height': detailsCollapsed ? '0px' : `${detailsHeight}px` }}>
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
            <div className={`security-ws__view-switch${tab === 'network' ? ' is-network' : ' is-application'}`}>
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
              className={`security-ws__live${autoRefresh ? ' is-live' : ' is-paused'}`}
              onClick={() => {
                setAutoRefresh((current) => !current)
                setFreshIds({ application: [], network: [] })
                setCopied(false)
              }}
              aria-pressed={autoRefresh}
              title={autoRefresh ? 'Pause 15-second automatic refresh' : 'Resume 15-second automatic refresh'}
            >
              {autoRefresh ? <Radio size={13} /> : <CirclePause size={13} />}
              <span>{autoRefresh ? 'Live · 15s' : 'Paused'}</span>
            </button>

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

                <tbody key={`network-${filter}`}>
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
                              freshIds.network.includes(String(event.id)) ? 'is-new' : '',
                              selected ? 'is-selected' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              setSelectedNetworkId(event.id)
                              setCopied(false)
                            }}
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
                              <span className="security-ws__protocol-tag">
                                {String(event.protocol || '—').toUpperCase()}
                              </span>
                            </td>

                            <td className="is-strong">
                              <span className={`security-ws__severity-tag tone-${tone}`}>
                                {String(event.severity || 'UNKNOWN').toUpperCase()}
                              </span>
                            </td>

                            <td className="is-strong">
                              {event.event_type ||
                                'Unknown'}
                            </td>

                            <td className="is-info" title={info}>
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

                <tbody key={`application-${filter}`}>
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
                              freshIds.application.includes(String(log.id)) ? 'is-new' : '',
                              selected ? 'is-selected' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              setSelectedApplicationId(log.id)
                              setCopied(false)
                            }}
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
                              <span className={`security-ws__severity-tag tone-${tone}`}>
                                {result}
                              </span>
                            </td>

                            <td className="is-info" title={log.details || ''}>
                              {log.details || 'No additional details recorded.'}
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

          <div
            className="security-ws__splitter"
            role="separator"
            aria-label="Resize or collapse event details pane"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={460}
            aria-valuenow={detailsCollapsed ? 0 : detailsHeight}
            tabIndex={0}
            onPointerDown={startPaneResize}
            onPointerMove={movePaneResize}
            onPointerUp={endPaneResize}
            onPointerCancel={endPaneResize}
            onKeyDown={resizeWithKeyboard}
          >
            <span className="security-ws__splitter-label">
              <GripHorizontal size={17} aria-hidden="true" />
              <span>Drag to resize · ↑/↓ keyboard</span>
            </span>
            <button
              type="button"
              onClick={() => setDetailsCollapsed((current) => !current)}
              aria-label={detailsCollapsed ? 'Expand event details' : 'Collapse event details'}
              aria-expanded={!detailsCollapsed}
              title={detailsCollapsed ? 'Show details' : 'Hide details for more table space'}
            >
              {detailsCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>{detailsCollapsed ? 'Show details' : 'Hide details'}</span>
            </button>
          </div>

          <div className={`security-ws__details${detailsCollapsed ? ' is-collapsed' : ''}`}>
            {selectedEntry ? (
              <>
                <div key={`${tab}-${selectedEntry.id}-head`} className="security-ws__details-head">
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

                <div key={`${tab}-${selectedEntry.id}-content`} className="security-ws__details-grid">
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
                    <div className="security-ws__raw-title">
                      <span>RAW EVENT · JSON</span>
                      <button
                        type="button"
                        className={`security-ws__copy${copied ? ' is-copied' : ''}`}
                        onClick={copyRawEntry}
                        aria-label="Copy selected raw event JSON"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? 'Copied!' : 'Copy JSON'}
                      </button>
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
