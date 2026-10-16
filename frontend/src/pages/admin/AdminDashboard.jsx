import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ScanEye,
  CircleCheck,
  UserRoundCheck,
  UsersRound,
  UserX,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import api from '../../api/client'
import AdminNeoSidebar from '../../components/AdminNeoSidebar'
import { useAuth } from '../../context/useAuth'

function getGreeting(date) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Welcome back'
}

async function fetchDashboardData(signal) {
  const [usersResponse, departmentsResponse] = await Promise.all([
    api.get('/admin/users', { signal }),
    api.get('/admin/departments', { signal }),
  ])
  return {
    users: Array.isArray(usersResponse.data) ? usersResponse.data : [],
    departments: Array.isArray(departmentsResponse.data) ? departmentsResponse.data : [],
  }
}

function AdminDashboard() {
  const navigate = useNavigate()
  const insideAdminLayout = useOutletContext()?.securaAdminShell === true
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [chartMode, setChartMode] = useState('roles')
  const [today] = useState(() => new Date())

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true
    fetchDashboardData(controller.signal)
      .then((data) => {
        if (!mounted) return
        setUsers(data.users)
        setDepartments(data.departments)
        setUpdatedAt(new Date())
        setError('')
      })
      .catch((requestError) => {
        if (!mounted || controller.signal.aborted || requestError?.code === 'ERR_CANCELED') return
        setError('Unable to load administration data. Try refreshing the dashboard.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false; controller.abort() }
  }, [])

  const refreshDashboard = async () => {
    if (refreshing) return
    setRefreshing(true)
    setError('')
    try {
      const data = await fetchDashboardData()
      setUsers(data.users)
      setDepartments(data.departments)
      setUpdatedAt(new Date())
    } catch {
      setError('Unable to load administration data. Try refreshing the dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const summary = useMemo(() => {
    const managed = users.filter((item) => item.role !== 'Administrator')
    const standardUsers = managed.filter((item) => item.role === 'User')
    const officers = managed.filter((item) => item.role === 'Security Officer')
    const active = managed.filter((item) => item.is_active).length
    const memberCounts = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      count: standardUsers.filter((item) => item.department_id === dept.id).length,
    }))
    const assigned = memberCounts.reduce((sum, dept) => sum + dept.count, 0)
    return {
      managed: managed.length,
      standard: standardUsers.length,
      officers: officers.length,
      active,
      inactive: managed.length - active,
      departmentCount: departments.length,
      assigned,
      unassigned: standardUsers.length - assigned,
      memberCounts,
    }
  }, [users, departments])

  const display = (value) => !updatedAt ? '—' : value
  const displayName = user?.full_name || user?.username || 'Administrator'
  const firstName = displayName.trim().split(/\s+/)[0] || 'Administrator'
  const activeOfficers = users.filter((item) => item.role === 'Security Officer' && item.is_active).length
  const activeRate = summary.managed ? (summary.active / summary.managed) * 100 : 0
  const assignmentRate = summary.standard ? (summary.assigned / summary.standard) * 100 : 0
  const chartEntries = chartMode === 'roles'
    ? [
      { name: 'Standard users', count: summary.standard, color: 'var(--neo-purple)' },
      { name: 'Security Officers', count: summary.officers, color: 'var(--neo-aqua)' },
    ]
    : [
      { name: 'Active accounts', count: summary.active, color: 'var(--neo-aqua)' },
      { name: 'Inactive accounts', count: summary.inactive, color: 'var(--neo-pink)' },
    ]
  const chartTotal = chartEntries.reduce((sum, item) => sum + item.count, 0)
  // Two backend-driven segments, displayed in exactly one CSS ring.
  // This replaces the previous repeating SVG stroke animation.
  const firstSegment = chartEntries[0]
  const secondSegment = chartEntries[1]
  const firstShare = chartTotal > 0 ? (firstSegment.count / chartTotal) * 100 : 0
  const maxDepartment = Math.max(1, ...summary.memberCounts.map((item) => item.count))
  const departmentsSorted = [...summary.memberCounts].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5)

  const metrics = [
    { label: 'Managed accounts', value: summary.managed, note: 'People with access to SECURA', icon: UsersRound, tone: 'purple' },
    { label: 'Active accounts', value: summary.active, note: 'Currently enabled', icon: UserRoundCheck, tone: 'aqua' },
    { label: 'Inactive accounts', value: summary.inactive, note: 'Access currently disabled', icon: UserX, tone: 'pink' },
    { label: 'Departments', value: summary.departmentCount, note: 'Organizational groups', icon: Building2, tone: 'orange' },
  ]

  const ContentElement = insideAdminLayout ? 'div' : 'main'

  return (
    <div className={insideAdminLayout ? 'secura-neo-dashboard-embedded' : 'secura-neo-layout secura-neo-layout--dashboard'}>
      {!insideAdminLayout && <AdminNeoSidebar />}
      <ContentElement className="secura-neo-dash" id="admin-main-content">
        <div className="secura-neo-dash__inner">
          <div className="secura-neo-dash__topline">
            <span className="secura-neo-dash__breadcrumb"><span>Workspace</span><ArrowRight size={13} /> Overview</span>
            <div className="secura-neo-dash__top-actions">
              <span className="secura-neo-dash__date"><Clock3 size={15} /> {today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button type="button" className="secura-neo-dash__refresh" disabled={loading || refreshing} onClick={refreshDashboard}>
                <RefreshCw size={16} className={refreshing ? 'secura-neo-dash__rotating' : ''} /> {refreshing ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>

          <section className="secura-neo-dash__hero neo-entrance" aria-labelledby="admin-welcome-heading">
            <div className="secura-neo-dash__hero-grid" aria-hidden="true" />
            <div className="secura-neo-dash__hero-content">
              <span className="secura-neo-dash__eyebrow"><Sparkles size={14} /> YOUR ADMIN WORKSPACE</span>
              <h1 id="admin-welcome-heading">{getGreeting(today)}, <span>{firstName}.</span></h1>
              <p>Your people, departments and account access — all in one clear view.</p>
              <div className="secura-neo-dash__hero-caption">
                <span className="secura-neo-dash__hero-caption-dot" aria-hidden="true" />
                A clearer overview for everyday administration
              </div>
            </div>
            <div className="secura-neo-dash__hero-art" aria-hidden="true">
              <div className="secura-neo-dash__halo secura-neo-dash__halo--outer" />
              <div className="secura-neo-dash__halo secura-neo-dash__halo--inner" />
              <div className="secura-neo-dash__art-core"><ShieldCheck size={46} strokeWidth={1.5} /></div>
              <span className="secura-neo-dash__art-float secura-neo-dash__art-float--a"><UsersRound size={20} /></span>
              <span className="secura-neo-dash__art-float secura-neo-dash__art-float--b"><CheckCircle2 size={20} /></span>
              <span className="secura-neo-dash__art-float secura-neo-dash__art-float--c"><Layers3 size={18} /></span>
            </div>
          </section>

          {error && <div className="secura-neo-dash__error" role="alert"><CircleHelp size={19} /><span>{error}</span><button type="button" onClick={refreshDashboard}>Retry</button></div>}

          <div className="secura-neo-dash__section-head neo-entrance">
            <div><p className="secura-neo-dash__section-tag">YOUR PLATFORM AT A GLANCE</p><h2>Overview</h2><span>Numbers shown here come from your SECURA accounts and departments.</span></div>
          </div>

          <section className="secura-neo-dash__metrics" aria-label="Account and department summary">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <article key={metric.label} className={`secura-neo-dash__metric secura-neo-dash__metric--${metric.tone} neo-entrance`}>
                  <span className="secura-neo-dash__metric-top">
                    <span className="secura-neo-dash__metric-icon"><Icon size={21} /></span>
                    <span className="secura-neo-dash__metric-deco" aria-hidden="true" />
                  </span>
                  <strong>{display(metric.value)}</strong>
                  <b>{metric.label}</b>
                  <small>{metric.note}</small>
                </article>
              )
            })}
          </section>

          <div className="secura-neo-dash__main-grid">
            <section className="secura-neo-dash__panel secura-neo-dash__distribution neo-entrance" aria-labelledby="distribution-heading">
              <div className="secura-neo-dash__panel-head"><div><p className="secura-neo-dash__section-tag">ACCOUNT INSIGHTS</p><h2 id="distribution-heading">Understand your workspace</h2><p>See who has an account and whether access is active.</p></div><BarChart3 size={21} /></div>
              <div className="secura-neo-dash__tabs" role="group" aria-label="Account insight view">
                <button type="button" className={chartMode === 'roles' ? 'is-selected' : ''} onClick={() => setChartMode('roles')} aria-pressed={chartMode === 'roles'}>By role</button>
                <button type="button" className={chartMode === 'status' ? 'is-selected' : ''} onClick={() => setChartMode('status')} aria-pressed={chartMode === 'status'}>By account status</button>
              </div>
              <div className="secura-neo-dash__chart-area">
                <div
                  key={`donut-${chartMode}`}
                  className="secura-v1108-donut"
                  style={{
                    '--donut-first': `${firstShare}%`,
                    '--donut-first-color': firstSegment.color,
                    '--donut-second-color': secondSegment.color,
                  }}
                  role="img"
                  aria-label={chartMode === 'roles'
                    ? `${summary.standard} standard users and ${summary.officers} security officers`
                    : `${summary.active} active and ${summary.inactive} inactive accounts`}
                >
                  <div className="secura-v1108-donut__center">
                    <b>{display(chartTotal)}</b>
                    <span>accounts</span>
                  </div>
                </div>
                <div key={`legend-${chartMode}`} className="secura-neo-dash__legend secura-neo-dash__legend--soft-enter">
                  {chartEntries.map((entry) => <div key={entry.name} className="secura-neo-dash__legend-row"><span><i style={{ background: entry.color }} />{entry.name}</span><b>{display(entry.count)}</b></div>)}
                  <div className="secura-neo-dash__insight-note"><Activity size={16} /><span>{chartMode === 'roles' ? 'Manage a role or account from User management.' : 'Account status is managed from User management.'}</span></div>
                </div>
              </div>
            </section>

            <section className="secura-neo-dash__panel secura-neo-dash__pulse neo-entrance" aria-labelledby="pulse-heading">
              <div className="secura-neo-dash__panel-head">
                <div>
                  <p className="secura-neo-dash__section-tag">WORKSPACE SNAPSHOT</p>
                  <h2 id="pulse-heading">Your access overview</h2>
                  <p>Simple indicators to help you understand your workspace.</p>
                </div>
                <ScanEye size={21} />
              </div>
              <div className="secura-neo-dash__pulse-list">
                <div className="secura-neo-dash__pulse-card">
                  <div className="secura-neo-dash__pulse-row">
                    <span className="secura-neo-dash__pulse-icon pulse-purple"><UsersRound size={19} /></span>
                    <span className="secura-neo-dash__pulse-copy"><b>Active account access</b><small>{updatedAt ? `${summary.active} of ${summary.managed} managed accounts enabled` : 'Waiting for account data'}</small></span>
                    <strong>{updatedAt ? `${Math.round(activeRate)}%` : '—'}</strong>
                  </div>
                  <div className="secura-neo-dash__pulse-track"><span style={{ width: `${updatedAt ? activeRate : 0}%` }} /></div>
                </div>
                <div className="secura-neo-dash__pulse-card">
                  <div className="secura-neo-dash__pulse-row">
                    <span className="secura-neo-dash__pulse-icon pulse-cyan"><Building2 size={19} /></span>
                    <span className="secura-neo-dash__pulse-copy"><b>Department assignment</b><small>{updatedAt ? `${summary.assigned} of ${summary.standard} standard users assigned` : 'Waiting for department data'}</small></span>
                    <strong>{updatedAt ? `${Math.round(assignmentRate)}%` : '—'}</strong>
                  </div>
                  <div className="secura-neo-dash__pulse-track"><span style={{ width: `${updatedAt ? assignmentRate : 0}%` }} /></div>
                </div>
                <div className="secura-neo-dash__pulse-card secura-neo-dash__pulse-card--reviewers">
                  <div className="secura-neo-dash__pulse-row">
                    <span className="secura-neo-dash__pulse-icon pulse-orange"><CircleCheck size={19} /></span>
                    <span className="secura-neo-dash__pulse-copy"><b>Available Security Officers</b><small>Currently active reviewer accounts</small></span>
                    <strong>{display(activeOfficers)}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="secura-neo-dash__panel secura-neo-dash__departments neo-entrance" aria-labelledby="department-heading">
            <div className="secura-neo-dash__panel-head"><div><p className="secura-neo-dash__section-tag">TEAM STRUCTURE</p><h2 id="department-heading">Department coverage</h2><p>Where standard User accounts are assigned.</p></div><button type="button" className="secura-neo-dash__text-link" onClick={() => navigate('/admin/departments')}>View all <ArrowRight size={16} /></button></div>
            <div className="secura-neo-dash__department-grid">
              <div className="secura-neo-dash__department-list">
                {!updatedAt ? <p className="secura-neo-dash__empty">{loading ? 'Loading departments…' : 'Department data unavailable. Please retry.'}</p> : departmentsSorted.length === 0 ? <p className="secura-neo-dash__empty">No departments have been created yet.</p> : departmentsSorted.map((department) => (
                  <div key={department.id} className="secura-neo-dash__department-row"><div><b>{department.name}</b><small>{department.count} {department.count === 1 ? 'user' : 'users'}</small></div><div className="secura-neo-dash__bar"><span style={{ width: `${(department.count / maxDepartment) * 100}%` }} /></div></div>
                ))}
              </div>
              <div className="secura-neo-dash__coverage-summary"><span className="secura-neo-dash__coverage-icon"><Layers3 size={24} /></span><small>Assigned standard users</small><strong>{display(summary.assigned)} <span>/ {display(summary.standard)}</span></strong><p>{display(summary.unassigned)} without a department assignment</p></div>
            </div>
          </section>

          <footer className="secura-neo-dash__footer"><span><ShieldCheck size={15} /> SECURA Administrator Workspace</span><span>{updatedAt ? `Last refreshed ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : loading ? 'Loading latest information...' : 'Data not refreshed'}</span></footer>
        </div>
      </ContentElement>
    </div>
  )
}

export default AdminDashboard
