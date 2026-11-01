import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, Check, CheckCheck, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, FileCheck2, FileClock, FileSearch, FileText, Fingerprint,
  FolderOpen, LockKeyhole, Search, ShieldCheck, ShieldX, Sparkles,
  UserRound, UsersRound, X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import './OriginalAccessNeo.css'

// SECURA Original Access V8: presentation only. Existing endpoints, approval
// decisions and routes remain unchanged. No mock or hard-coded request data.
const statusLabels = {
  PENDING_OWNER: { text: 'Awaiting owner', tone: 'amber' },
  PENDING_SECURITY: { text: 'Security review', tone: 'violet' },
  APPROVED: { text: 'Approved', tone: 'green' },
  REJECTED_BY_OWNER: { text: 'Rejected by owner', tone: 'red' },
  REJECTED_BY_SECURITY: { text: 'Rejected by security', tone: 'red' },
  REJECTED_OWNER: { text: 'Rejected by owner', tone: 'red' },
  REJECTED_SECURITY: { text: 'Rejected by security', tone: 'red' },
  REJECTED: { text: 'Rejected', tone: 'red' },
}

function statusInfo(value) {
  return statusLabels[value] || {
    text: String(value || 'Unknown').replaceAll('_', ' ').toLowerCase(),
    tone: 'neutral',
  }
}

function dateText(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function apiError(error, fallback) {
  const detail = error?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

function StatusPill({ status }) {
  const info = statusInfo(status)
  const Icon = info.tone === 'green' ? CheckCircle2
    : info.tone === 'red' ? ShieldX : info.tone === 'amber' ? Clock3 : ShieldCheck
  return <span className={`sxa-pill is-${info.tone}`}><Icon size={14} />{info.text}</span>
}

function JourneyStep({ number, label, description, state }) {
  return (
    <div className={`sxa-journey-step is-${state}`}>
      <span className="sxa-journey-dot" aria-hidden="true">
        {state === 'done' ? <Check size={15} /> : number}
      </span>
      <div><strong>{label}</strong><small>{description}</small></div>
      {state === 'done' && <CheckCircle2 size={16} className="sxa-journey-check" aria-hidden="true" />}
    </div>
  )
}

function RequestJourney({ request }) {
  const status = request?.status || 'PENDING_OWNER'
  const denied = status.includes('REJECT')
  const ownerDone = status === 'PENDING_SECURITY' || status === 'APPROVED' ||
    status === 'REJECTED_BY_SECURITY' || status === 'REJECTED_SECURITY'
  const securityDone = status === 'APPROVED'
  return (
    <div className="sxa-journey">
      <JourneyStep number="1" label="Request submitted" description="Your access request was recorded" state="done" />
      <JourneyStep number="2" label="Document owner" description={
        status === 'PENDING_OWNER' ? 'Waiting for the owner to decide'
          : (status === 'REJECTED_BY_OWNER' || status === 'REJECTED_OWNER') ? 'Owner rejected the request'
            : ownerDone ? 'Owner decision completed' : 'Owner review'
      } state={ownerDone ? 'done' : denied ? 'blocked' : 'current'} />
      <JourneyStep number="3" label="Security Officer" description={
        securityDone ? 'Final approval granted'
          : (status === 'REJECTED_BY_SECURITY' || status === 'REJECTED_SECURITY') ? 'Final review rejected'
            : status === 'PENDING_SECURITY' ? 'Waiting for final review'
              : 'Starts after owner approval'
      } state={securityDone ? 'done' : denied ? 'blocked' : status === 'PENDING_SECURITY' ? 'current' : 'upcoming'} />
      {denied && <div className="sxa-journey-result is-rejected"><ShieldX size={16} />This request did not pass the approval process.</div>}
      {securityDone && <div className="sxa-journey-result is-approved"><CheckCircle2 size={16} />Original access approved. Check the approval file library.</div>}
    </div>
  )
}

const filters = [
  { value: 'all', text: 'All requests' },
  { value: 'PENDING_OWNER', text: 'Awaiting owner' },
  { value: 'PENDING_SECURITY', text: 'Security review' },
  { value: 'APPROVED', text: 'Approved' },
  { value: 'rejected', text: 'Rejected' },
]

export default function OriginalAccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = location.pathname.includes('/owner-approvals') ? 'owner' : 'my'
  const [myRequests, setMyRequests] = useState([])
  const [ownerRequests, setOwnerRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [decisionLoadingId, setDecisionLoadingId] = useState(null)
  const [rejectRequest, setRejectRequest] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [mine, owners] = await Promise.all([
          api.get('/original-file-requests/my-requests'),
          api.get('/original-file-requests/owner/pending'),
        ])
        if (!cancelled) {
          setMyRequests(Array.isArray(mine.data) ? mine.data : [])
          setOwnerRequests(Array.isArray(owners.data) ? owners.data : [])
        }
      } catch (err) {
        if (!cancelled) setError(apiError(err, 'Unable to load original access requests.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!rejectRequest) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && decisionLoadingId === null) setRejectRequest(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [rejectRequest, decisionLoadingId])

  const summary = useMemo(() => ({
    total: myRequests.length,
    pendingOwner: myRequests.filter((item) => item.status === 'PENDING_OWNER').length,
    pendingSecurity: myRequests.filter((item) => item.status === 'PENDING_SECURITY').length,
    approvals: ownerRequests.length,
  }), [myRequests, ownerRequests])

  const visibleRequests = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = activeTab === 'owner' ? ownerRequests : myRequests
    return list.filter((request) => {
      if (activeTab === 'my' && filter !== 'all') {
        if (filter === 'rejected' ? !String(request.status || '').includes('REJECT') : request.status !== filter) return false
      }
      if (!term) return true
      const haystack = [request.original_filename, request.reason,
        request.owner_full_name, request.owner_username,
        request.requester_full_name, request.requester_username].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [activeTab, myRequests, ownerRequests, query, filter])

  const selectedRequest = activeTab === 'my' ? (
    visibleRequests.find((item) => String(item.id) === String(selectedId)) || visibleRequests[0]
  ) : null

  function goTab(tab) {
    setMessage('')
    setError('')
    setSelectedId(null)
    setQuery('')
    setFilter('all')
    navigate(tab === 'owner' ? '/user/owner-approvals' : '/user/my-requests')
  }

  async function handleOwnerDecision(request, decision) {
    setDecisionLoadingId(request.id)
    setMessage('')
    setError('')
    try {
      const response = await api.patch(`/original-file-requests/${request.id}/owner-decision`, { decision })
      setOwnerRequests((current) => current.filter((item) => item.id !== request.id))
      setMessage(decision === 'APPROVE'
        ? `${request.original_filename} approved and forwarded to the Security Officer for final review.`
        : `${request.original_filename} access request rejected.`)
      setRejectRequest(null)
      return response.data
    } catch (err) {
      setError(apiError(err, 'Unable to update the original access request.'))
      return null
    } finally {
      setDecisionLoadingId(null)
    }
  }

  return (
    <div className="sxa-page">
      <div className="sxa-backdrop" aria-hidden="true" />
      <div className="sxa-inner">
        <section className="sxa-hero" aria-label="Original file access overview">
          <div className="sxa-hero-grid" aria-hidden="true" />
          <div className="sxa-hero-content">
            <span className="sxa-kicker"><Sparkles size={15} /> CONTROLLED DOCUMENT ACCESS</span>
            <h1>Original access<span className="sxa-hero-dot">.</span></h1>
            <p>Request original documents, track every approval and make confident access decisions — all in one secure workspace.</p>
            <div className="sxa-hero-actions">
              <button type="button" className="sxa-button sxa-button-primary" onClick={() => navigate('/user/library')}>
                <FolderOpen size={17} /> Browse documents <ArrowRight size={17} />
              </button>
              <button type="button" className="sxa-button sxa-button-ghost" onClick={() => goTab('owner')}>
                <UsersRound size={17} /> Owner decisions <ChevronRight size={16} />
              </button>
            </div>
            <span className="sxa-hero-security"><LockKeyhole size={13} /> Original files require owner and Security Officer approval.</span>
          </div>
          <div className="sxa-hero-visual" aria-hidden="true">
            <div className="sxa-orbit sxa-orbit-outer" /><div className="sxa-orbit sxa-orbit-inner" />
            <div className="sxa-orbit-ring"><ShieldCheck size={76} strokeWidth={1.45} /></div>
            <div className="sxa-float sxa-float-left"><Fingerprint size={17} /><span>OWNER REVIEW</span><Check size={15} /></div>
            <div className="sxa-float sxa-float-right"><ShieldCheck size={17} /><span>FINAL APPROVAL</span><Sparkles size={14} /></div>
          </div>
        </section>

        <section className="sxa-metrics" aria-label="Original access statistics">
          <button type="button" className={`sxa-metric sxa-metric-violet ${activeTab === 'my' && filter === 'all' ? 'is-selected' : ''}`}
            onClick={() => { goTab('my'); setFilter('all') }}>
            <span className="sxa-metric-icon"><FileText size={23} /></span>
            <span className="sxa-metric-copy"><strong>{loading ? '—' : summary.total}</strong><small>My requests</small></span><ArrowRight size={17} className="sxa-metric-arrow" />
          </button>
          <button type="button" className={`sxa-metric sxa-metric-amber ${activeTab === 'my' && filter === 'PENDING_OWNER' ? 'is-selected' : ''}`}
            onClick={() => { goTab('my'); setFilter('PENDING_OWNER') }}>
            <span className="sxa-metric-icon"><Clock3 size={23} /></span>
            <span className="sxa-metric-copy"><strong>{loading ? '—' : summary.pendingOwner}</strong><small>Awaiting owner</small></span><ArrowRight size={17} className="sxa-metric-arrow" />
          </button>
          <button type="button" className={`sxa-metric sxa-metric-blue ${activeTab === 'my' && filter === 'PENDING_SECURITY' ? 'is-selected' : ''}`}
            onClick={() => { goTab('my'); setFilter('PENDING_SECURITY') }}>
            <span className="sxa-metric-icon"><ShieldCheck size={23} /></span>
            <span className="sxa-metric-copy"><strong>{loading ? '—' : summary.pendingSecurity}</strong><small>Security review</small></span><ArrowRight size={17} className="sxa-metric-arrow" />
          </button>
          <button type="button" className={`sxa-metric sxa-metric-green ${activeTab === 'owner' ? 'is-selected' : ''}`}
            onClick={() => goTab('owner')}>
            <span className="sxa-metric-icon"><UsersRound size={23} /></span>
            <span className="sxa-metric-copy"><strong>{loading ? '—' : summary.approvals}</strong><small>Owner approvals</small></span><ArrowRight size={17} className="sxa-metric-arrow" />
          </button>
        </section>

        {message && <div className="sxa-notice is-success" role="status"><CheckCheck size={19} /><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></div>}
        {error && <div className="sxa-notice is-error" role="alert"><CircleAlert size={19} /><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}

        <div className="sxa-content">
          <section className="sxa-panel sxa-requests" aria-label="Access request center">
            <div className="sxa-panel-top"><div><span className="sxa-kicker"><FileSearch size={14} /> ACCESS REQUEST CENTER</span><h2>Manage your requests</h2><p>Every document. Every approval. One clear view.</p></div><span className="sxa-panel-count">{loading ? 'Loading' : `${visibleRequests.length} shown`}</span></div>
            <div className="sxa-toolbar">
              <div className="sxa-tabs" role="tablist" aria-label="Request type">
                <button type="button" role="tab" aria-selected={activeTab === 'my'} className={activeTab === 'my' ? 'is-active' : ''} onClick={() => goTab('my')}><FileClock size={16} /> My requests <span>{summary.total}</span></button>
                <button type="button" role="tab" aria-selected={activeTab === 'owner'} className={activeTab === 'owner' ? 'is-active' : ''} onClick={() => goTab('owner')}><UserRound size={16} /> Owner approvals <span>{summary.approvals}</span></button>
              </div>
              <label className="sxa-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file or owner..." aria-label="Search requests" /></label>
            </div>
            {activeTab === 'my' && <div className="sxa-filter-row" aria-label="Filter requests by status">
              {filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>{item.text}</button>)}
            </div>}

            <div className="sxa-list" aria-live="polite">
              {loading ? <div className="sxa-skeleton" aria-label="Loading requests"><i /><i /><i /></div>
                : visibleRequests.length === 0 ? <div className="sxa-empty"><span><FileSearch size={32} /></span><h3>{query || (activeTab === 'my' && filter !== 'all') ? 'No matching requests' : activeTab === 'owner' ? 'No approvals waiting' : 'Your request list is clear'}</h3><p>{activeTab === 'owner' ? 'New access requests for documents you own will appear here.' : 'You can request original access from a document in the file library.'}</p><button type="button" onClick={() => activeTab === 'owner' ? goTab('my') : navigate('/user/library')}>{activeTab === 'owner' ? 'View my requests' : 'Explore file library'} <ArrowRight size={16} /></button></div>
                : visibleRequests.map((request, index) => {
                  const isOwner = activeTab === 'owner'
                  const isSelected = !isOwner && String((selectedRequest || {}).id) === String(request.id)
                  return <article key={request.id} className={`sxa-request-card ${isSelected ? 'is-selected' : ''}`} style={{ '--sxa-seq': `${Math.min(index, 8) * 45}ms` }}>
                    <button type="button" className="sxa-request-main" onClick={() => isOwner ? undefined : setSelectedId(request.id)}
                      aria-label={`View ${request.original_filename || 'document'} request details`} aria-pressed={isOwner ? undefined : isSelected} disabled={isOwner}>
                      <span className="sxa-file-icon"><FileText size={22} /></span>
                      <span className="sxa-file-info"><strong title={request.original_filename}>{request.original_filename || 'Unnamed document'}</strong><small>{isOwner ? 'Requested by' : 'Owned by'} <b>{isOwner ? request.requester_full_name || request.requester_username || 'Unknown user' : request.owner_full_name || request.owner_username || 'Unknown owner'}</b></small></span>
                      {!isOwner && <ChevronRight className="sxa-card-chevron" size={19} />}
                    </button>
                    <div className="sxa-request-bottom">
                      <span className="sxa-card-date"><Clock3 size={14} /> {dateText(request.requested_at)}</span>
                      {isOwner ? <span className="sxa-request-waiting"><Clock3 size={13} /> Awaiting your review</span> : <StatusPill status={request.status} />}
                    </div>
                    {isOwner && <div className="sxa-owner-extra"><p><strong>Reason:</strong> {request.reason || 'No reason provided.'}</p><div className="sxa-owner-buttons"><button type="button" className="sxa-approve" disabled={decisionLoadingId === request.id} onClick={() => void handleOwnerDecision(request, 'APPROVE')}><Check size={16} />{decisionLoadingId === request.id ? 'Processing...' : 'Approve request'}</button><button type="button" className="sxa-reject" disabled={decisionLoadingId === request.id} onClick={() => setRejectRequest(request)}><X size={16} />Reject</button></div></div>}
                  </article>
                })}
            </div>
          </section>

          <aside className="sxa-aside" aria-label="Approval insights">
            <section className="sxa-panel sxa-details">
              <div className="sxa-aside-heading"><span className="sxa-kicker"><Fingerprint size={14} /> {activeTab === 'owner' ? 'OWNER RESPONSIBILITY' : 'REQUEST INSIGHTS'}</span><span className="sxa-shield-icon"><ShieldCheck size={19} /></span></div>
              {selectedRequest && activeTab === 'my' ? <>
                <h2>Approval journey</h2><p>Follow the authorization flow for your selected file.</p>
                <div className="sxa-details-file"><span><FileText size={22} /></span><div><strong>{selectedRequest.original_filename || 'Document'}</strong><small>Requested {dateText(selectedRequest.requested_at)}</small></div></div>
                <StatusPill status={selectedRequest.status} />
                <RequestJourney request={selectedRequest} />
                {selectedRequest.reason && <div className="sxa-reason"><small>YOUR REASON</small><p>{selectedRequest.reason}</p></div>}
                {selectedRequest.status === 'APPROVED' && <button type="button" className="sxa-aside-link" onClick={() => navigate('/user/approved-originals')}><FileCheck2 size={17} /> Open approval library <ArrowRight size={16} /></button>}
              </> : <><h2>Two-stage protection</h2><p>Original documents remain restricted until both reviews are completed.</p>
                <div className="sxa-guide"><div><span>01</span><strong>Owner approval</strong><small>The person who uploaded the file reviews the request first.</small></div><div><span>02</span><strong>Security review</strong><small>A Security Officer provides final authorization.</small></div><div><span>03</span><strong>Controlled access</strong><small>Approved originals become available through the approval library.</small></div></div>
                <div className="sxa-aside-note"><LockKeyhole size={17} /> No request bypasses the two-stage approval process.</div>
              </>}
            </section>
            <section className="sxa-side-promo"><div className="sxa-promo-icon"><ShieldCheck size={24} /></div><span>SECURA SECURITY STANDARD</span><h3>Privacy by design.</h3><p>Anonymized documents can be shared. Original files stay behind access controls.</p><button type="button" onClick={() => navigate('/user/library')}>Go to document library <ArrowRight size={16} /></button></section>
          </aside>
        </div>
      </div>

      {rejectRequest && <div className="sxa-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && decisionLoadingId === null) setRejectRequest(null) }}>
        <section className="sxa-modal" role="dialog" aria-modal="true" aria-labelledby="sxa-reject-heading">
          <button type="button" className="sxa-modal-close" aria-label="Close dialog" disabled={decisionLoadingId !== null} onClick={() => setRejectRequest(null)}><X size={19} /></button>
          <div className="sxa-modal-symbol"><ShieldX size={30} /></div><span className="sxa-kicker">OWNER APPROVAL DECISION</span>
          <h2 id="sxa-reject-heading">Reject access request?</h2><p>Rejecting access to <strong>{rejectRequest.original_filename}</strong> stops the request before Security Officer review.</p>
          <div className="sxa-modal-actions"><button type="button" className="sxa-cancel" disabled={decisionLoadingId !== null} onClick={() => setRejectRequest(null)}>Cancel</button><button type="button" className="sxa-confirm" disabled={decisionLoadingId !== null} onClick={() => void handleOwnerDecision(rejectRequest, 'REJECT')}>{decisionLoadingId !== null ? 'Rejecting...' : 'Reject request'}</button></div>
        </section>
      </div>}
    </div>
  )
}
