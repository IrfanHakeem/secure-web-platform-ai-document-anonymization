import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Layers3,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import api from '../../api/client'
import './SecurityAlertsNeo.css'

function apiError(error, fallback) {
  const detail = error?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', {
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function formatEvent(type) {
  if (type === 'REPEATED_FAILED_LOGIN') {
    return { event: 'Repeated failed login', category: 'Authentication' }
  }
  if (type === 'UNAUTHORIZED_ACCESS') {
    return { event: 'Unauthorized access', category: 'Authorization' }
  }
  return {
    event: type?.replaceAll('_', ' ').toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Security alert',
    category: 'Application security',
  }
}

function linkedUsername(alert, logs) {
  return logs.find((log) => log.ip_address === alert.ip_address && log.username)
    ?.username || '—'
}

function normalizeAlerts(alertData, failedData, unauthorizedData) {
  const alerts = Array.isArray(alertData) ? alertData : []
  const failed = Array.isArray(failedData) ? failedData : []
  const unauthorized = Array.isArray(unauthorizedData) ? unauthorizedData : []

  return alerts.map((alert, index) => {
    const { event, category } = formatEvent(alert.alert_type)
    const related = alert.alert_type === 'REPEATED_FAILED_LOGIN'
      ? failed
      : alert.alert_type === 'UNAUTHORIZED_ACCESS' ? unauthorized : []

    return {
      id: `${alert.alert_type}-${alert.ip_address || 'unknown'}-${alert.last_detected_at || index}`,
      type: alert.alert_type,
      severity: alert.severity || 'MEDIUM',
      event,
      category,
      sourceIp: alert.ip_address || 'Unknown',
      user: linkedUsername(alert, related),
      eventCount: alert.event_count ?? 0,
      firstDetectedAt: alert.first_detected_at,
      lastDetectedAt: alert.last_detected_at,
      message: alert.message || 'No additional details available.',
    }
  })
}

function createTrend(alerts, today) {
  // This is a snapshot of ACTIVE alerts grouped by their last-detected date,
  // not a history of all alerts or raw individual login attempts.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - 6 + index)
    const key = date.toDateString()
    return {
      key,
      label: new Intl.DateTimeFormat('en-MY', { weekday: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short' }).format(date),
      count: alerts.filter((alert) => {
        const detected = new Date(alert.lastDetectedAt)
        return !Number.isNaN(detected.getTime()) && detected.toDateString() === key
      }).length,
    }
  })
}

function SeverityPill({ value }) {
  const high = value === 'HIGH'
  return (
    <span className={`sa36__severity ${high ? 'sa36__severity--high' : 'sa36__severity--medium'}`}>
      <span aria-hidden="true" />{value}
    </span>
  )
}

function SecurityAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [sort, setSort] = useState('newest')
  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(6)
  const [today] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/security-monitoring/alerts'),
      api.get('/security-monitoring/failed-logins', { params: { limit: 200 } }),
      api.get('/security-monitoring/unauthorized-access', { params: { limit: 200 } }),
    ])
      .then(([alertsResponse, failedResponse, unauthorizedResponse]) => {
        if (cancelled) return
        const next = normalizeAlerts(
          alertsResponse.data, failedResponse.data, unauthorizedResponse.data,
        )
        setAlerts(next)
        setSelectedAlertId((current) => next.some((item) => item.id === current)
          ? current : next[0]?.id || null)
        setError('')
      })
      .catch((loadError) => {
        if (!cancelled) setError(apiError(loadError, 'Unable to load security alerts. Try refreshing.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [refreshKey])

  const refreshAlerts = () => {
    if (loading) return
    setLoading(true)
    setError('')
    setRefreshKey((current) => current + 1)
  }

  const high = alerts.filter((alert) => alert.severity === 'HIGH').length
  const medium = alerts.filter((alert) => alert.severity === 'MEDIUM').length
  const sourceCount = new Set(alerts.map((alert) => alert.sourceIp)
    .filter((ip) => ip !== 'Unknown')).size
  const keyword = query.trim().toLowerCase()
  const filteredAlerts = alerts
    .filter((alert) => filter === 'ALL' || alert.severity === filter)
    .filter((alert) => !keyword || [
      alert.event, alert.user, alert.sourceIp, alert.category, alert.message,
    ].join(' ').toLowerCase().includes(keyword))
    .sort((a, b) => {
      const byDate = (new Date(b.lastDetectedAt).getTime() || 0)
        - (new Date(a.lastDetectedAt).getTime() || 0)
      return sort === 'priority'
        ? (Number(b.severity === 'HIGH') - Number(a.severity === 'HIGH')) || byDate
        : byDate
    })
  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId)
    || filteredAlerts[0] || null
  const trend = createTrend(alerts, today)
  const peak = Math.max(1, ...trend.map((item) => item.count))
  const day = trend[selectedDay] || trend[6]
  const latest = alerts
    .map((alert) => new Date(alert.lastDetectedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0]

  const summary = [
    { key: 'ALL', label: 'Active alerts', value: alerts.length, note: 'Current signals', icon: ShieldAlert, tone: 'purple' },
    { key: 'HIGH', label: 'High priority', value: high, note: 'Needs attention', icon: TriangleAlert, tone: 'red' },
    { key: 'MEDIUM', label: 'Medium priority', value: medium, note: 'Watch closely', icon: Activity, tone: 'amber' },
    { key: null, label: 'Source IPs', value: sourceCount, note: 'Unique known sources', icon: Wifi, tone: 'cyan' },
  ]

  return (
    <section className="security-alerts sa36 page-enter" aria-label="Security Alerts workspace">
      <header className="sa36__header">
        <div className="sa36__header-copy">
          <span className="sa36__eyebrow"><ShieldCheck size={14} /> SECURITY OPERATIONS / ALERT INTELLIGENCE</span>
          <h1>Security <span>Alerts.</span></h1>
          <p>Monitor security signals, spot risks and investigate activity in one clear view.</p>
        </div>
        <div className="sa36__header-actions">
          <span className="sa36__sync"><span className="sa36__sync-dot" />{loading ? 'Checking signals…' : alerts.length === 0 ? 'No active alerts' : `Latest ${latest ? formatTime(latest) : 'unknown'}`}</span>
          <button className="sa36__refresh" type="button" onClick={refreshAlerts} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'sa36__spin' : ''} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="sa36__error" role="alert">
          <ShieldAlert size={17} /><span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      <div className="sa36__overview">
        <div className="sa36__metrics" aria-label="Alert summary">
          {summary.map(({ key, label, value, note, icon: Icon, tone }) => {
            const active = key !== null && filter === key
            const contents = (
              <>
                <span className="sa36__metric-icon"><Icon size={21} /></span>
                <span className="sa36__metric-info">
                  <span className="sa36__metric-label">{label}</span>
                  <strong>{loading ? '—' : value}</strong>
                  <small>{note}</small>
                </span>
                {key !== null && <ArrowUpRight className="sa36__metric-arrow" size={15} aria-hidden="true" />}
              </>
            )
            return key === null ? (
              <div key={label} className={`sa36__metric sa36__metric--${tone}`}>{contents}</div>
            ) : (
              <button key={label} type="button" onClick={() => setFilter(key)} aria-pressed={active}
                className={`sa36__metric sa36__metric--${tone}${active ? ' is-current' : ''}`}>
                {contents}
              </button>
            )
          })}
        </div>

        <section className="sa36__trend sa36__surface" aria-label="Active alert trend">
          <div className="sa36__panel-top">
            <div><span className="sa36__kicker"><Activity size={14} /> MONITORING SNAPSHOT</span><h2>Signal rhythm</h2></div>
            <span className="sa36__period"><Clock3 size={13} /> Last 7 days</span>
          </div>
          <p className="sa36__trend-desc">Active alerts grouped by their most recent detection date.</p>
          <div className="sa36__trend-focus" aria-live="polite">
            <strong>{loading ? '—' : day.count}</strong>
            <span>{day.count === 1 ? 'active alert' : 'active alerts'} last detected · {day.fullLabel}</span>
          </div>
          <div className="sa36__chart" role="group" aria-label="Choose a day to inspect its active-alert count">
            {trend.map((item, index) => (
              <button type="button" key={item.key} className={`sa36__bar-cell${selectedDay === index ? ' is-selected' : ''}`}
                aria-label={`${item.fullLabel}: ${item.count} active ${item.count === 1 ? 'alert' : 'alerts'} last detected`}
                aria-pressed={selectedDay === index}
                title={`${item.fullLabel}: ${item.count} active ${item.count === 1 ? 'alert' : 'alerts'}`}
                onMouseEnter={() => setSelectedDay(index)} onFocus={() => setSelectedDay(index)}
                onClick={() => setSelectedDay(index)}>
                <span className="sa36__bar-track"><span className="sa36__bar-fill" style={{ height: `${Math.max(5, (item.count / peak) * 100)}%` }} /></span>
                <span className="sa36__bar-day">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="sa36__trend-foot"><span className="sa36__legend-dot" /> Snapshot of active alerts, not full event history</div>
        </section>
      </div>

      <div className="sa36__workspace">
        <section className="sa36__feed sa36__surface" aria-label="Recent security signals">
          <div className="sa36__panel-top sa36__feed-heading">
            <div><span className="sa36__kicker"><Layers3 size={14} /> SECURITY FEED</span><h2>Recent signals</h2></div>
            <span className="sa36__result-count">{loading ? 'Loading…' : `${filteredAlerts.length} / ${alerts.length} alerts`}</span>
          </div>
          <div className="sa36__tools">
            <label className="sa36__search">
              <Search size={17} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events, users or IPs" aria-label="Search security alerts" />
            </label>
            <div className="sa36__filters" role="group" aria-label="Severity filter">
              {[
                ['ALL', 'All'], ['HIGH', 'High'], ['MEDIUM', 'Medium'],
              ].map(([value, label]) => (
                <button type="button" key={value} onClick={() => setFilter(value)}
                  className={filter === value ? 'is-active' : ''} aria-pressed={filter === value}>{label}</button>
              ))}
            </div>
            <label className="sa36__sort">
              <span className="sr-only">Sort alerts</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="priority">Priority</option>
              </select>
            </label>
          </div>

          <div className="sa36__feed-body">
            {loading ? (
              <div className="sa36__feed-state"><RefreshCw size={26} className="sa36__spin" /><b>Checking security signals</b><p>Retrieving alerts from the SECURA monitoring service.</p></div>
            ) : filteredAlerts.length === 0 ? (
              <div className="sa36__feed-state sa36__feed-state--clear">
                <span className="sa36__empty-icon"><CheckCircle2 size={29} /></span>
                <b>{alerts.length === 0 ? 'No active alerts right now' : 'No matching signals'}</b>
                <p>{alerts.length === 0 ? 'The monitoring API has not returned any active application alerts. You can still check the audit logs.' : 'Try another search term or severity filter.'}</p>
                {alerts.length === 0 ? <Link to="/security/logs">Inspect audit logs <ArrowRight size={14} /></Link> : <button type="button" onClick={() => { setQuery(''); setFilter('ALL') }}>Clear filters</button>}
              </div>
            ) : (
              <div className="sa36__feed-list">
                {filteredAlerts.map((alert) => (
                  <button key={alert.id} type="button" className={`sa36__feed-item${selectedAlert?.id === alert.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedAlertId(alert.id)} aria-pressed={selectedAlert?.id === alert.id}>
                    <span className={`sa36__feed-mark${alert.severity === 'HIGH' ? ' is-high' : ''}`}><ShieldAlert size={17} /></span>
                    <span className="sa36__feed-main"><strong>{alert.event}</strong><small>{alert.category} · {alert.sourceIp}</small></span>
                    <span className="sa36__feed-meta"><SeverityPill value={alert.severity} /><small>{formatDateTime(alert.lastDetectedAt)}</small></span>
                    <ArrowRight className="sa36__feed-arrow" size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <footer className="sa36__feed-footer"><span>Showing {loading ? '—' : filteredAlerts.length} of {alerts.length}</span><span>Select a signal to inspect its details</span></footer>
        </section>

        <aside className="sa36__focus sa36__surface" aria-label="Alert investigation details">
          <div className="sa36__panel-top"><div><span className="sa36__kicker"><ShieldCheck size={14} /> INVESTIGATION DESK</span><h2>Signal details</h2></div><span className="sa36__focus-corner"><ArrowUpRight size={17} /></span></div>
          {selectedAlert ? (
            <div className="sa36__focus-content" key={selectedAlert.id}>
              <div className="sa36__focus-alert"><span className="sa36__focus-icon"><ShieldAlert size={23} /></span><div><strong>{selectedAlert.event}</strong><span>{selectedAlert.category}</span></div><SeverityPill value={selectedAlert.severity} /></div>
              <div className="sa36__detail-grid">
                <div><span>Source IP</span><strong>{selectedAlert.sourceIp}</strong></div>
                <div><span>Associated user</span><strong>{selectedAlert.user}</strong></div>
                <div><span>Event count</span><strong>{selectedAlert.eventCount}</strong></div>
                <div><span>Severity</span><strong>{selectedAlert.severity}</strong></div>
                <div><span>First detected</span><strong>{formatDateTime(selectedAlert.firstDetectedAt)}</strong></div>
                <div><span>Last detected</span><strong>{formatDateTime(selectedAlert.lastDetectedAt)}</strong></div>
              </div>
              <div className="sa36__context"><span>ALERT MESSAGE</span><p>{selectedAlert.message}</p></div>
              <Link to="/security/logs" className="sa36__logs-link">Investigate in audit logs <ArrowUpRight size={16} /></Link>
            </div>
          ) : (
            <div className="sa36__focus-empty">
              <span className="sa36__focus-shield"><ShieldCheck size={41} /></span>
              <strong>{loading ? 'Loading signal details' : alerts.length === 0 ? 'No active investigation' : 'Select a signal'}</strong>
              <p>{loading ? 'Please wait while SECURA retrieves active alerts.' : alerts.length === 0 ? 'Active alerts returned by the monitoring service will appear here for inspection.' : 'Choose a matching alert in Recent signals to see the evidence.'}</p>
              <Link to="/security/logs">Open audit logs <ArrowUpRight size={15} /></Link>
            </div>
          )}
        </aside>
      </div>
      <div className="sa36__footer"><ShieldCheck size={14} /> SECURA Security Operations <span>·</span> Alerts remain read-only; decisions are made in their respective workflows.</div>
    </section>
  )
}

export default SecurityAlerts
