import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileSearch,
  Fingerprint,
  KeyRound,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'
import SecurityNeoSidebar from '../../components/SecurityNeoSidebar'
import { useAuth } from '../../context/useAuth'
import './SecurityNeo.css'

// A time-aware greeting that updates with the dashboard clock every minute.
function getGreeting(date) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Welcome back'
}

const networkMeta = {
  ACTIVE: { label: 'Active', tone: 'good', desc: 'Sensor data is being received normally.' },
  AWAITING_DATA: { label: 'Awaiting data', tone: 'waiting', desc: 'Sensor integration is configured; awaiting its first event.' },
  STALE: { label: 'Stale', tone: 'warning', desc: 'No recent sensor data has been received.' },
  NOT_CONFIGURED: { label: 'Not configured', tone: 'neutral', desc: 'Network integration has not been configured.' },
}

function count24h(records, anchor) {
  if (!Array.isArray(records)) return null
  return records.filter((entry) => {
    const time = new Date(entry.created_at).getTime()
    return Number.isFinite(time) && time >= anchor - 86400000 && time <= anchor
  }).length
}

function formatTime(value) {
  if (!value) return 'No events received'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unavailable'
  return date.toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

function display(value, loading) {
  if (loading || value == null) return '—'
  return Number(value).toLocaleString('en-MY')
}

async function requestMonitoring(signal) {
  const result = await Promise.allSettled([
    api.get('/security-monitoring/dashboard-summary', { signal }),
    api.get('/security-monitoring/failed-logins', { signal, params: { limit: 200 } }),
    api.get('/security-monitoring/unauthorized-access', { signal, params: { limit: 200 } }),
  ])
  return {
    summary: result[0].status === 'fulfilled' ? result[0].value.data : null,
    failedRecords: result[1].status === 'fulfilled' && Array.isArray(result[1].value.data) ? result[1].value.data : null,
    unauthorizedRecords: result[2].status === 'fulfilled' && Array.isArray(result[2].value.data) ? result[2].value.data : null,
    partialError: result.some((item) => item.status === 'rejected'),
  }
}


// Hour-aligned local-time buckets. A rolling 24-hour interval may touch 25
// clock-hour slots (first and last are partial); keeping both prevents loss
// of records at the cutoff while making 13:23 belong to 13:00–14:00.
function clockLabel(milliseconds) {
  const value = new Date(milliseconds)
  return `${String(value.getHours()).padStart(2, '0')}:00`
}

function bucketDay(milliseconds) {
  return new Date(milliseconds).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
  })
}

function createBuckets(records, anchor) {
  const cutoff = anchor - 24 * 60 * 60 * 1000
  const firstHour = new Date(cutoff)
  firstHour.setMinutes(0, 0, 0)

  const buckets = Array.from({ length: 25 }, (_, index) => {
    const hourStart = new Date(firstHour)
    hourStart.setHours(firstHour.getHours() + index)
    const nextHour = new Date(hourStart)
    nextHour.setHours(nextHour.getHours() + 1)
    const rawStart = hourStart.getTime()
    const rawEnd = nextHour.getTime()

    return {
      index,
      start: Math.max(rawStart, cutoff),
      end: Math.min(rawEnd, anchor + 1),
      // Use actual clock boundaries for headings, never the arbitrary fetch minute.
      label: `${clockLabel(rawStart)}–${clockLabel(rawEnd)}`,
      day: bucketDay(rawStart),
      // Labels every 3 hours, without duplicating the first/last 24h clock time.
      tick: index > 0 && index < 24 && (index - 1) % 3 === 0
        ? clockLabel(rawStart)
        : '',
      count: 0,
    }
  })

  if (!Array.isArray(records)) return buckets
  // The backend currently caps each result set at 200 records.
  // Count only records actually inside the rolling 24-hour window.
  for (const record of records) {
    const time = new Date(record.created_at).getTime()
    if (!Number.isFinite(time) || time < cutoff || time > anchor) continue
    const bucket = buckets.find((slot) => time >= slot.start && time < slot.end)
    if (bucket) bucket.count += 1
  }
  return buckets
}

export default function SecurityDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [data, setData] = useState({ summary: null, failedRecords: null, unauthorizedRecords: null, partialError: false })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [stream, setStream] = useState('failed')
  const [selectedBucket, setSelectedBucket] = useState(null)

  // Load asynchronously from the effect. React 19's lint rule disallows
  // invoking state-setting helpers synchronously within an effect body.
  useEffect(() => {
    const controller = new AbortController()

    requestMonitoring(controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        setData(response)
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData((current) => ({ ...current, partialError: true }))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  const refresh = async () => {
    if (refreshing || loading) return
    setRefreshing(true)
    try {
      const response = await requestMonitoring()
      setData(response)
      setUpdatedAt(new Date())
      setSelectedBucket(null)
    } catch {
      setData((current) => ({ ...current, partialError: true }))
    } finally {
      setRefreshing(false)
    }
  }

  const summary = data.summary
  const anchor = updatedAt?.getTime() ?? now.getTime()
  const failedCount = count24h(data.failedRecords, anchor)
  const unauthorizedCount = count24h(data.unauthorizedRecords, anchor)
  const network = summary?.network_monitoring_status
    ? (networkMeta[summary.network_monitoring_status] ?? { label: 'Unknown', tone: 'neutral', desc: 'Network status is unavailable.' })
    : { label: 'Unavailable', tone: 'neutral', desc: 'Network status could not be loaded.' }
  const records = stream === 'failed' ? data.failedRecords : data.unauthorizedRecords
  // At most 200 backend records: derive these lightweight arrays on render.
  // No manual memoization is required, avoiding React Compiler warnings.
  const buckets = createBuckets(records, anchor)
  const maxBucket = Math.max(1, ...buckets.map((item) => item.count))
  const cutoff = anchor - 86400000
  const activeBucket = selectedBucket === null ? null : buckets[selectedBucket]
  const matchingEvents = (records ?? [])
    .filter((entry) => {
      const time = new Date(entry.created_at).getTime()
      return Number.isFinite(time) && time >= cutoff && time <= anchor &&
        (!activeBucket || (time >= activeBucket.start && time < activeBucket.end))
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const visibleEvents = matchingEvents.slice(0, 4)
  const eventTypeLabel = stream === 'failed' ? 'Failed login attempts' : 'Unauthorized access attempts'
  const snapshotHeading = activeBucket
    ? `${eventTypeLabel} · ${activeBucket.label}`
    : 'Recent events'
  const snapshotSubheading = activeBucket
    ? `${activeBucket.day} · ${matchingEvents.length} matching ${matchingEvents.length === 1 ? 'event' : 'events'}${matchingEvents.length > 4 ? ' · showing latest 4' : ''}`
    : `${eventTypeLabel} · Last 24 hours`

  // Prefer the authenticated person's full name. Never shorten the role fallback
  // to 'Security' if a profile name has not been supplied.
  const greetingName = user?.full_name?.trim() || user?.username?.trim() || 'Security Officer'
  const greeting = getGreeting(now)
  const pendingReviewsClear = !loading && summary?.pending_original_reviews === 0
  const alertsClear = !loading && summary?.application_alerts === 0
  const showCount = (value) => display(value, loading)

  return (
    <div className="secura-sec-shell secura-soc-app">
      <SecurityNeoSidebar />
      <main className="secura-soc-main">
        <div className="secura-soc-container">
          <div className="secura-soc-pagehead">
            <div className="secura-soc-pagehead__text">
              <span className="secura-soc-overline"><ShieldCheck size={14} /> SECURITY COMMAND CENTER</span>
              <h1>{greeting}, <span>{greetingName}.</span></h1>
              <p>Monitor signals, review sensitive access and respond with confidence.</p>
            </div>
            <div className="secura-soc-pagehead__tools">
              <span className="secura-soc-date"><CalendarDays size={15} /> {now.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button type="button" className="secura-soc-refresh" disabled={loading || refreshing} onClick={refresh}>
                <RefreshCw size={16} className={refreshing ? 'secura-soc-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh data'}
              </button>
            </div>
          </div>

          {data.partialError && !loading && (
            <div className="secura-soc-alert" role="alert"><ShieldAlert size={17} /> Some monitoring sources could not be loaded. Unavailable data is marked —; retry with Refresh data.</div>
          )}

          <section className="secura-soc-priority" aria-label="Security status overview">
            <button type="button" className={`secura-soc-bigstat secura-soc-bigstat--purple${pendingReviewsClear ? ' is-clear' : ''}`} onClick={() => navigate('/security/reviews')}>
              <span className="secura-soc-bigstat__top"><span className="secura-soc-stat-icon"><ClipboardCheck size={21} /></span><span className="secura-soc-bigstat__hint">REVIEW QUEUE <ArrowRight size={15} /></span></span>
              <strong>{showCount(summary?.pending_original_reviews)}</strong><b>Pending original access</b>
              <small>Requests waiting for Security Officer review</small>
              <span className="secura-soc-bigstat__cta">{pendingReviewsClear ? <><CheckCircle2 size={14} /> No pending reviews</> : <>Open review queue <ArrowRight size={14} /></>}</span>
            </button>
            <button type="button" className={`secura-soc-bigstat secura-soc-bigstat--cyan${alertsClear ? ' is-clear' : ''}`} onClick={() => navigate('/security/alerts')}>
              <span className="secura-soc-bigstat__top"><span className="secura-soc-stat-icon"><BellRing size={21} /></span><span className="secura-soc-bigstat__hint">ACTIVE SIGNALS <ArrowRight size={15} /></span></span>
              <strong>{showCount(summary?.application_alerts)}</strong><b>Security alerts</b>
              <small>Application alerts reported by monitoring</small>
              <span className="secura-soc-bigstat__cta">{alertsClear ? <><CheckCircle2 size={14} /> No active alerts</> : <>Investigate alerts <ArrowRight size={14} /></>}</span>
            </button>
            <div className="secura-soc-compactstats">
              <button type="button" className={`secura-soc-mini secura-soc-mini--warning ${stream === 'failed' ? 'is-active' : ''}`} onClick={() => { setStream('failed'); setSelectedBucket(null) }} aria-pressed={stream === 'failed'}>
                <span className="secura-soc-mini__icon secura-soc-mini__icon--violet"><KeyRound size={18} /></span>
                <span><strong>{showCount(failedCount)}</strong><b>Failed logins</b><small>Latest 200 · 24h</small></span><ArrowRight size={15} />
              </button>
              <button type="button" className={`secura-soc-mini secura-soc-mini--critical ${stream === 'unauthorized' ? 'is-active' : ''}`} onClick={() => { setStream('unauthorized'); setSelectedBucket(null) }} aria-pressed={stream === 'unauthorized'}>
                <span className="secura-soc-mini__icon secura-soc-mini__icon--pink"><Fingerprint size={18} /></span>
                <span><strong>{showCount(unauthorizedCount)}</strong><b>Unauthorized access</b><small>Latest 200 · 24h</small></span><ArrowRight size={15} />
              </button>
            </div>
          </section>

          <section className="secura-soc-mainrow">
            <div className="secura-soc-panel secura-soc-activity">
              <div className="secura-soc-panelhead">
                <div><span className="secura-soc-overline">EVENT ACTIVITY</span><h2>Security activity timeline</h2><p>Event counts from the latest 200 records per type.</p></div>
                <div className="secura-soc-segments" aria-label="Select activity type">
                  <button type="button" className={stream === 'failed' ? 'is-active' : ''} onClick={() => { setStream('failed'); setSelectedBucket(null) }} aria-pressed={stream === 'failed'}>Failed logins</button>
                  <button type="button" className={stream === 'unauthorized' ? 'is-active' : ''} onClick={() => { setStream('unauthorized'); setSelectedBucket(null) }} aria-pressed={stream === 'unauthorized'}>Unauthorized</button>
                </div>
              </div>
              <div className="secura-soc-chart-info"><span><Activity size={15} /> Last 24 hours</span><strong>{showCount(stream === 'failed' ? failedCount : unauthorizedCount)} events</strong></div>
              <div className={`secura-soc-chart secura-soc-chart--${stream}`} role="group" aria-label="Select a one-hour time range to filter recent events">
                {buckets.map((bucket) => (
                  <button type="button" key={bucket.index} className={`secura-soc-chart__column${selectedBucket === bucket.index ? ' is-selected' : ''}`} onClick={() => setSelectedBucket((current) => current === bucket.index ? null : bucket.index)} aria-pressed={selectedBucket === bucket.index} aria-label={`${bucket.day}, ${bucket.label}: ${bucket.count} ${stream === 'failed' ? 'failed login' : 'unauthorized access'} events`} title={`${bucket.day} ${bucket.label} · ${bucket.count} events`}>
                    <span className="secura-soc-chart__track"><span className="secura-soc-chart__bar" style={{ height: bucket.count ? `${Math.max(8, (bucket.count / maxBucket) * 100)}%` : '0%' }} /></span>
                    <span className="secura-soc-chart__tooltip" aria-hidden="true">
                      <b>{bucket.count} {bucket.count === 1 ? 'event' : 'events'}</b>
                      <small>{bucket.day} · {bucket.label}</small>
                    </span>
                    <span className="secura-soc-chart__tick">{bucket.tick}</span>
                  </button>
                ))}
              </div>
              <div className="secura-soc-chart-footer"><span><CircleHelp size={15} /> Hourly (24h clock) · Select a bar to filter its events.</span>{selectedBucket !== null && <button type="button" onClick={() => setSelectedBucket(null)}>Clear filter <CheckCircle2 size={13} /></button>}</div>
            </div>

            <aside className={`secura-soc-panel secura-soc-sensor secura-soc-sensor--${network.tone}`}>
              <div className="secura-soc-panelhead"><div><span className="secura-soc-overline">SENSOR INTEGRATION</span><h2>Network status</h2></div><Wifi size={20} /></div>
              <div className="secura-soc-sensor__status"><span className="secura-soc-sensor__emblem"><ShieldCheck size={29} /></span><div><span className={`secura-soc-state secura-soc-state--${network.tone}`}><i /> {loading ? 'Checking…' : network.label}</span><p>{loading ? 'Loading network status…' : network.desc}</p></div></div>
              <div className="secura-soc-sensor__metric"><span>Network events · 24h</span><strong>{showCount(summary?.network_events_last_24h)}</strong></div>
              <div className="secura-soc-sensor__metric"><span>Audit logs · 24h</span><strong>{showCount(summary?.audit_logs_last_24h)}</strong></div>
              <div className="secura-soc-sensor__last"><Clock3 size={15} /><span>Last received event</span><b>{loading ? '—' : formatTime(summary?.last_network_event_at)}</b></div>
              <button type="button" className="secura-soc-sensor__link" onClick={() => navigate('/security/logs')}>Inspect security logs <ArrowRight size={15} /></button>
            </aside>
          </section>

          <section className="secura-soc-bottomrow">
            <div className="secura-soc-panel secura-soc-recent">
              <div className="secura-soc-panelhead"><div><span className="secura-soc-overline">AUDIT SNAPSHOT</span><h2>{snapshotHeading}</h2><p aria-live="polite">{snapshotSubheading}</p></div><button type="button" className="secura-soc-simple-link" onClick={() => navigate('/security/logs')}>Open logs <ArrowRight size={15} /></button></div>
              {loading || records === null ? (
                <div className="secura-soc-recent__empty">{loading ? 'Loading recent events…' : 'Event records are unavailable.'}</div>
              ) : visibleEvents.length ? (
                <div className="secura-soc-recent__list">
                  {visibleEvents.map((entry, i) => (
                    <div className="secura-soc-recent__item" key={`${entry.id || entry.created_at || 'event'}-${i}`}>
                      <span className="secura-soc-recent__symbol"><ShieldAlert size={16} /></span>
                      <div><b>{entry.username || (stream === 'failed' ? 'Authentication attempt' : 'Access attempt')}</b><small>{entry.ip_address || 'IP unavailable'}</small></div>
                      <time dateTime={entry.created_at}>{formatTime(entry.created_at)}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="secura-soc-recent__empty">No matching events in this time range.</div>
              )}
            </div>
            <div className="secura-soc-panel secura-soc-quick">
              <div className="secura-soc-panelhead"><div><span className="secura-soc-overline">QUICK ACCESS</span><h2>Operations</h2></div><FileSearch size={20} /></div>
              <div className="secura-soc-quick__links">
                <button type="button" onClick={() => navigate('/security/reviews')}><span><ClipboardCheck size={19} /></span><b>Review requests</b><small>{display(summary?.pending_original_reviews, loading)} pending</small><ArrowRight size={15} /></button>
                <button type="button" onClick={() => navigate('/security/alerts')}><span><BellRing size={19} /></span><b>Investigate alerts</b><small>{display(summary?.application_alerts, loading)} alerts</small><ArrowRight size={15} /></button>
                <button type="button" onClick={() => navigate('/security/logs')}><span><ScrollText size={19} /></span><b>Audit trails</b><small>View details</small><ArrowRight size={15} /></button>
              </div>
            </div>
          </section>
          <footer className="secura-soc-footer"><span>SECURA · Security Officer Workspace</span><span>{updatedAt ? `Last refreshed ${updatedAt.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}` : loading ? 'Loading monitoring data…' : 'Refresh required'}</span></footer>
        </div>
      </main>
    </div>
  )
}
