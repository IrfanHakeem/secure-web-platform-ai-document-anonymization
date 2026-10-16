import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, FileCheck2, FileClock,
  FileText, FolderOpen, House, Library, LockKeyhole, LogOut,
  Menu, Moon, RefreshCw, Search, ShieldCheck, Sparkles,
  Sun, UsersRound, X,
} from 'lucide-react'

import api from '../../api/client'
import ProfileAvatar from '../../components/ProfileAvatar'
import UserAiJobChip from '../../components/UserAiJobChip'
import { useAuth } from '../../context/useAuth'
import './UserDashboardNeo.css'

// SECURA NeoFlow V15.2 — User Dashboard polish; all live endpoints retained.
// Existing SECURA endpoints and routes are reused; no backend changes required.
const NAVIGATION = [
  { label: 'Overview', path: '/user/dashboard', icon: House },
  { label: 'Anonymize document', path: '/user/anonymize', icon: Sparkles },
  { label: 'Anonymized file library', path: '/user/library', icon: Library },
  { label: 'Original access', path: '/user/original-access', icon: FileClock },
  { label: 'Approval file library', path: '/user/approved-originals', icon: FileCheck2 },
]

const PENDING = new Set(['PENDING_OWNER', 'PENDING_SECURITY'])

function greeting(date) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Welcome back'
}

function prettyDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-MY', options).format(date)
}

function requestStatus(status) {
  const names = {
    PENDING_OWNER: 'Waiting for owner',
    PENDING_SECURITY: 'Security review',
    APPROVED: 'Approved',
    REJECTED_OWNER: 'Rejected by owner',
    REJECTED_SECURITY: 'Rejected by security',
    REJECTED: 'Rejected',
  }
  return names[status] ?? String(status || 'Unknown').replaceAll('_', ' ')
}

function statusTone(status) {
  if (status === 'APPROVED') return 'success'
  if (PENDING.has(status)) return 'pending'
  if (String(status).includes('REJECT')) return 'danger'
  return 'neutral'
}

function validArray(response) {
  return Array.isArray(response?.data) ? response.data : []
}

function fileDate(file) {
  return file?.created_at ? prettyDate(file.created_at) : 'Date unavailable'
}

function niceSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return ''
  const value = Number(bytes)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function makeDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const startOffset = first.getDay()
  const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return Array.from({ length: startOffset + total }, (_, index) => index < startOffset ? null : index - startOffset + 1)
}

function initialCollapsed() {
  try { return window.localStorage.getItem('secura-user-nav-mini') === 'yes' }
  catch { return false }
}

function requestJourney(status) {
  if (status === 'APPROVED') return { stage: 3, text: 'Approved — access available', tone: 'success' }
  if (status === 'PENDING_SECURITY') return { stage: 2, text: 'Awaiting Security Officer review', tone: 'pending' }
  if (status === 'PENDING_OWNER') return { stage: 1, text: 'Waiting for document owner', tone: 'pending' }
  if (String(status).includes('REJECT')) return { stage: -1, text: requestStatus(status), tone: 'danger' }
  return { stage: 0, text: requestStatus(status), tone: 'neutral' }
}

function UserDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const searchRef = useRef(null)
  const [now, setNow] = useState(() => new Date())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [myFiles, setMyFiles] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [requests, setRequests] = useState([])
  const [ownerPending, setOwnerPending] = useState([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const results = await Promise.allSettled([
        api.get('/document-library/my-anonymized'),
        api.get('/document-library/shared-with-me'),
        api.get('/original-file-requests/my-requests'),
        api.get('/original-file-requests/owner/pending'),
      ])
      if (cancelled) return
      if (results[0].status === 'fulfilled') setMyFiles(validArray(results[0].value))
      if (results[1].status === 'fulfilled') setSharedFiles(validArray(results[1].value))
      if (results[2].status === 'fulfilled') setRequests(validArray(results[2].value))
      if (results[3].status === 'fulfilled') setOwnerPending(validArray(results[3].value))
      setError(results.some((result) => result.status === 'rejected')
        ? 'Some workspace information could not be loaded. Choose Refresh to try again.'
        : '')
      setLoading(false)
      setRefreshing(false)
    }
    void load()
    return () => { cancelled = true }
  }, [reloadKey])

  useEffect(() => {
    const onSearchShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onSearchShortcut)
    return () => window.removeEventListener('keydown', onSearchShortcut)
  }, [])

  const open = (path) => { setSidebarOpen(false); navigate(path) }
  const displayName = user?.full_name || user?.username || 'there'
  const firstName = displayName.split(' ')[0]
  const pendingRequests = requests.filter((item) => PENDING.has(item.status))
  const myFileIds = new Set(myFiles.map((file) => file.id))
  // Group repeat uploads for the dashboard only. The underlying library records
  // are preserved, and each distinct owner's copy stays distinguishable.
  const allRecentFiles = [
    ...myFiles.map((file) => ({ ...file, group: 'My file' })),
    ...sharedFiles.filter((file) => !myFileIds.has(file.id))
      .map((file) => ({ ...file, group: 'Shared with me' })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  const recentFiles = []
  const groupedFiles = new Map()
  for (const file of allRecentFiles) {
    const filename = String(file.original_filename || '').trim().toLocaleLowerCase()
    const owner = file.owner_id ?? file.owner_username ?? 'unknown'
    const key = `${file.group}:${owner}:${filename || file.id}`
    const existing = groupedFiles.get(key)
    if (existing) {
      existing.uploadCount += 1
    } else {
      const latest = { ...file, uploadCount: 1 }
      recentFiles.push(latest)
      groupedFiles.set(key, latest)
    }
  }

  const needle = query.trim().toLowerCase()
  const visibleFiles = recentFiles.filter((file) => !needle ||
    [file.original_filename, file.owner_username, file.file_type].join(' ').toLowerCase().includes(needle)).slice(0, 4)
  const visibleRequests = [...requests]
    .sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0))
    .filter((item) => !needle ||
      [item.original_filename, item.status, item.requester_username].join(' ').toLowerCase().includes(needle)).slice(0, 4)

  // A single Request Activity card controls its own approval progress.
  // We use request IDs (not filenames) to distinguish repeat submissions.
  const journeyRequests = [...requests].sort((a, b) =>
    new Date(b.security_reviewed_at || b.owner_reviewed_at || b.requested_at || 0) -
    new Date(a.security_reviewed_at || a.owner_reviewed_at || a.requested_at || 0))
  const selectedJourney = journeyRequests.find((item) => item.id === selectedRequestId) ?? journeyRequests[0] ?? null
  const journey = selectedJourney ? requestJourney(selectedJourney.status) : null
  const recentActivity = journeyRequests.slice(0, 4)
  const calendarDays = makeDays(calendarMonth)
  const isCurrentMonth = calendarMonth.getMonth() === now.getMonth() && calendarMonth.getFullYear() === now.getFullYear()
  const requestDates = new Set(requests.map((req) => {
    if (!req.requested_at) return ''
    const date = new Date(req.requested_at)
    if (Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }))

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { window.localStorage.setItem('secura-user-nav-mini', next ? 'yes' : 'no') }
    catch { /* local storage is optional */ }
  }

  // Match the Admin NeoFlow circular reveal without introducing any global theme switch.
  const changeTheme = (event) => {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light'
    const apply = () => {
      root.dataset.theme = next
      try { window.localStorage.setItem('secura-theme', next) }
      catch { /* storage optional */ }
      flushSync(() => setTheme(next))
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduced) { apply(); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.ceil(Math.max(
      Math.hypot(x, y), Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    ))
    root.style.setProperty('--theme-transition-x', `${x}px`)
    root.style.setProperty('--theme-transition-y', `${y}px`)
    root.style.setProperty('--theme-transition-radius', `${radius}px`)
    root.classList.add('secura-theme-transitioning', 'secura-neo-theme-wave')
    try {
      const transition = document.startViewTransition(() => apply())
      void transition.finished.catch(() => {}).finally(() => {
        root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      })
    } catch {
      root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      apply()
    }
  }

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    setReloadKey((value) => value + 1)
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <main className="secura-user-neo">
      <div className="sun15__shell">
        {sidebarOpen && <button className="sun15__backdrop" aria-label="Close navigation" type="button" onClick={() => setSidebarOpen(false)} />}
        <aside className={`sun15__sidebar ${collapsed ? 'is-mini' : ''} ${sidebarOpen ? 'is-open' : ''}`} aria-label="User workspace navigation">
          <div className="sun15__side-glow" aria-hidden="true" />
          <div className="sun15__side-top">
            <button className="sun15__brand" type="button" onClick={() => open('/user/dashboard')} aria-label="SECURA User home">
              <span className="sun15__brand-logo" aria-hidden="true">
                <img className="sun15__logo-full" src="/secura-logo-dark.png" alt="" onError={(event) => {
                  event.currentTarget.hidden = true
                  event.currentTarget.parentElement?.classList.add('is-full-missing')
                }} />
                <img className="sun15__logo-mark" src="/secura-logo-dark-mark.png" alt="" onError={(event) => {
                  event.currentTarget.hidden = true
                  event.currentTarget.parentElement?.classList.add('is-mark-missing')
                }} />
                <span className="sun15__brand-fallback">SECURA</span>
              </span>
            </button>
            <div className="sun15__collapse-wrap">
              <button type="button" className="sun15__collapse" onClick={toggleCollapsed}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <button className="sun15__side-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={19} /></button>
          </div>
          <p className="sun15__nav-label">WORKSPACE</p>
          <nav className="sun15__nav" aria-label="User pages">
            {NAVIGATION.map(({ label, path, icon: Icon }) => (
              <button key={path} type="button" title={collapsed ? label : undefined}
                className={`sun15__nav-item ${path === '/user/dashboard' ? 'is-active' : ''}`}
                onClick={() => open(path)}>
                <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
                <ChevronRight className="sun15__nav-arrow" size={15} aria-hidden="true" />
              </button>
            ))}
          </nav>
          <UserAiJobChip />
          <div className="sun15__sidebar-bottom">
            <div className="sun15__bottom-dock">
              <button type="button" className="sun15__glass-toggle" onClick={changeTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <span className="sun15__glass-title">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                <span className={`sun15__glass-track ${theme === 'dark' ? 'is-dark' : 'is-light'}`} aria-hidden="true">
                  <Sun className="sun15__glass-sun" size={13} /><Moon className="sun15__glass-moon" size={13} />
                  <span className="sun15__glass-thumb">{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span>
                </span>
              </button>
              <button type="button" className="sun15__bottom-logout" onClick={handleLogout}
                aria-label="Log out" title="Log out"><LogOut size={18} /><span>Log out</span></button>
            </div>
          </div>
        </aside>

        <div className="sun15__workspace">
          <header className="sun15__topbar">
            <button type="button" className="sun15__mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
            <label className="sun15__search"><Search size={19} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find documents or access requests" aria-label="Search documents and requests" />{query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button> : <kbd>Ctrl K</kbd>}</label>
            <div className="sun15__top-actions">
              <span className="sun15__today"><CalendarDays size={16} />{prettyDate(now, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <button type="button" className="sun15__account" onClick={() => open('/user/profile')}><ProfileAvatar name={displayName} className="sun15__account-avatar" /><span><b>{displayName}</b><small>My profile</small></span><ChevronRight size={15} /></button>
            </div>
          </header>

          <div className="sun15__layout">
            <div className="sun15__primary">
              <section className="sun15__hero">
                <div className="sun15__hero-copy"><span className="sun15__eyebrow"><Sparkles size={13} /> YOUR EVERYDAY WORKSPACE</span><h1>{greeting(now)}, <span>{firstName}!</span></h1><p>Keep your documents private, share safely, and follow every access request in one place.</p>

                </div>
                <div className="sun15__hero-art" aria-hidden="true"><div className="sun15__halo halo-a" /><div className="sun15__halo halo-b" /><div className="sun15__art-file file-back"><FileText size={39} /></div><div className="sun15__art-file file-front"><FileText size={44} /></div><div className="sun15__art-shield"><LockKeyhole size={39} /></div><span className="sun15__art-spark">✦</span></div>
              </section>

              {error && <div className="sun15__warning" role="alert">{error}<button type="button" onClick={handleRefresh}>Try again</button></div>}

              <div className="sun15__stats" aria-label="Document and request summary">
                <article className="sun15__stat"><span className="sun15__stat-icon blue"><FileText size={20} /></span><span><strong>{loading ? '—' : myFiles.length}</strong><small>My documents</small></span></article>
                <article className="sun15__stat"><span className="sun15__stat-icon violet"><FolderOpen size={20} /></span><span><strong>{loading ? '—' : sharedFiles.filter((file) => !myFileIds.has(file.id)).length}</strong><small>Shared with me</small></span></article>
                <article className="sun15__stat"><span className="sun15__stat-icon amber"><Clock3 size={20} /></span><span><strong>{loading ? '—' : pendingRequests.length}</strong><small>Pending requests</small></span></article>
              </div>

              <section className="sun15__section sun15__quick"><div className="sun15__section-head"><div><span className="sun15__overline">GET THINGS DONE</span><h2>Quick actions</h2></div><button type="button" className="sun15__refresh" onClick={handleRefresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'is-spinning' : ''} /> {refreshing ? 'Refreshing' : 'Refresh'}</button></div>
                <div className="sun15__quick-grid">
                  <button type="button" className="sun15__quick-card blue" onClick={() => open('/user/anonymize')}><span><Sparkles size={23} /></span><b>Protect a document</b><small>Upload and anonymize files</small><ArrowUpRight size={16} className="sun15__quick-arrow" /></button>
                  <button type="button" className="sun15__quick-card purple" onClick={() => open('/user/library')}><span><Library size={23} /></span><b>Browse documents</b><small>Your files and shared files</small><ArrowUpRight size={16} className="sun15__quick-arrow" /></button>
                  <button type="button" className="sun15__quick-card peach" onClick={() => open('/user/my-requests')}><span><FileClock size={23} /></span><b>Track my requests</b><small>Check approval progress</small><ArrowUpRight size={16} className="sun15__quick-arrow" /></button>
                  <button type="button" className="sun15__quick-card mint" onClick={() => open('/user/owner-approvals')}><span><CheckCircle2 size={23} /></span><b>Review requests</b><small>{loading ? 'Owner approvals' : `${ownerPending.length} awaiting your decision`}</small><ArrowUpRight size={16} className="sun15__quick-arrow" /></button>
                </div>
              </section>

              <div className="sun15__content-grid">
                <section className="sun15__panel"><div className="sun15__section-head"><div><span className="sun15__overline">FILE LIBRARY</span><h2>Recent documents</h2></div><button className="sun15__text-link" type="button" onClick={() => open('/user/library')}>View library <ArrowRight size={15} /></button></div>
                  <div className="sun15__list">{visibleFiles.length ? visibleFiles.map((file) => <button className="sun15__file-row" type="button" key={`${file.group}-${file.id}`} onClick={() => open('/user/library')}><span className="sun15__file-icon"><FileText size={20} /></span><span className="sun15__row-main"><b title={file.original_filename}>{file.original_filename}</b><small>{file.group} · {file.uploadCount > 1 ? `${file.uploadCount} uploads · latest` : niceSize(file.file_size)} · {fileDate(file)}{file.group === 'Shared with me' && file.owner_username ? ` · by ${file.owner_username}` : ''}</small></span><ChevronRight size={17} /></button>) : <div className="sun15__empty"><FolderOpen size={25} /><b>{needle ? 'No matching documents' : 'No documents yet'}</b><p>{needle ? 'Try another search term.' : 'Start by anonymizing a document or browse shared files.'}</p></div>}</div>
                </section>
                <section className="sun15__panel"><div className="sun15__section-head"><div><span className="sun15__overline">ORIGINAL ACCESS</span><h2>Access requests</h2></div><button className="sun15__text-link" type="button" onClick={() => open('/user/my-requests')}>View all <ArrowRight size={15} /></button></div>
                  <div className="sun15__list">{visibleRequests.length ? visibleRequests.map((request) => <button className="sun15__request-row" type="button" key={request.id} onClick={() => open('/user/my-requests')}><span className="sun15__row-main"><b title={request.original_filename}>{request.original_filename}</b><small>Requested {prettyDate(request.requested_at)}</small></span><span className={`sun15__status ${statusTone(request.status)}`}>{requestStatus(request.status)}</span></button>) : <div className="sun15__empty"><FileClock size={25} /><b>{needle ? 'No matching requests' : 'No requests submitted'}</b><p>{needle ? 'Try another search term.' : 'Request an original file from the document library when needed.'}</p></div>}</div>
                </section>
              </div>


            </div>

            <aside className="sun15__utility" aria-label="Workspace overview">
              <section className="sun15__panel sun15__calendar"><div className="sun15__section-head"><div><span className="sun15__overline">AT A GLANCE</span><h2>Calendar</h2></div><CalendarDays size={18} /></div>
                <div className="sun15__month"><b>{prettyDate(calendarMonth, { month: 'long', year: 'numeric' })}</b><div><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Next month" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div></div>
                <div className="sun15__calendar-grid sun15__weekdays">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>
                <div className="sun15__calendar-grid">{calendarDays.map((day, index) => { const marked = day != null && requestDates.has(`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${day}`); return <span key={index} className={`${day && isCurrentMonth && day === now.getDate() ? 'today' : ''} ${marked ? 'has-request' : ''}`} title={marked ? 'Original access request submitted' : ''}>{day}</span> })}</div>
                <p className="sun15__calendar-help"><i /> Dots mark dates when you submitted access requests.</p>
                {calendarMonth.getMonth() !== now.getMonth() || calendarMonth.getFullYear() !== now.getFullYear() ? <button type="button" className="sun15__calendar-today" onClick={() => setCalendarMonth(new Date())}>Back to this month</button> : null}
              </section>

              <section className="sun15__panel sun15__activity" aria-label="Request activity and progress">
                <div className="sun15__section-head">
                  <div><span className="sun15__overline">REQUEST ACTIVITY</span><h2>Updates &amp; progress</h2></div>
                  <button className="sun15__text-link" type="button" onClick={() => open('/user/my-requests')}>View all <ArrowRight size={15} /></button>
                </div>
                <p className="sun15__activity-intro">Select a request to check its approval progress.</p>
                <div className="sun15__timeline">
                  {recentActivity.length ? recentActivity.map((req) => (
                    <button type="button" key={req.id}
                      className={`sun15__timeline-item ${selectedJourney?.id === req.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedRequestId(req.id)}
                      aria-pressed={selectedJourney?.id === req.id}>
                      <span className={`sun15__timeline-dot ${statusTone(req.status)}`} />
                      <span><b>{requestStatus(req.status)} <span className="sun15__request-id">· REQ-{req.id}</span></b>
                        <small title={req.original_filename}>{req.original_filename}</small>
                        <em>{prettyDate(req.security_reviewed_at || req.owner_reviewed_at || req.requested_at)}</em>
                      </span>
                      <ChevronRight className="sun15__timeline-chevron" size={15} />
                    </button>
                  )) : <div className="sun15__empty is-small"><Clock3 size={25} /><b>You're all caught up</b><p>Request updates will appear here.</p></div>}
                </div>
                {selectedJourney && journey && (
                  <div className="sun15__activity-progress" aria-live="polite">
                    <div className="sun15__activity-progress-head">
                      <span className="sun15__overline">APPROVAL STEPS · REQ-{selectedJourney.id}</span>
                      <span className={`sun15__status ${journey.tone}`}>{journey.text}</span>
                    </div>
                    <div className="sun15__journey-steps" aria-label="Approval progress">
                      {[{ name: 'Submitted', icon: FileText }, { name: 'Owner', icon: UsersRound },
                        { name: 'Security', icon: ShieldCheck }, { name: 'Ready', icon: CheckCircle2 }]
                        .map(({ name, icon: StepIcon }, index) => (
                          <div key={name} className={`sun15__journey-step ${journey.stage === 3 || (journey.stage > index && journey.stage !== -1) ? 'is-done' : ''} ${journey.stage === index && journey.stage < 3 ? 'is-current' : ''} ${journey.stage === -1 ? 'is-closed' : ''}`}>
                            <span><StepIcon size={15} /></span><small>{name}</small>
                          </div>
                        ))}
                    </div>
                    {journey.stage === -1 && <p className="sun15__journey-closed">This request was declined. See My Requests for details.</p>}
                    <button type="button" className="sun15__progress-link" onClick={() => open('/user/my-requests')}>Open request details <ArrowRight size={14} /></button>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

export default UserDashboard
