import {
  AlertCircle,
  AlertTriangle,
  ArrowDownAZ,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Layers3,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import api from '../../api/client'
import './AdminDepartmentManagement.css'

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((item) => item?.msg).filter(Boolean).join('; ') || fallback
  }
  return fallback
}

const FILTERS = [
  { id: 'all', label: 'All departments' },
  { id: 'occupied', label: 'With users' },
  { id: 'empty', label: 'Empty' },
]

function MetricCard({ icon: Icon, label, value, sublabel, tint }) {
  return (
    <article className={`sd-metric sd-metric--${tint}`}>
      <div className="sd-metric__top">
        <span className="sd-metric__icon"><Icon size={21} strokeWidth={2.15} /></span>
        <span className="sd-metric__decor" aria-hidden="true"><ChevronRight size={18} /></span>
      </div>
      <strong className="sd-metric__value">{value}</strong>
      <span className="sd-metric__label">{label}</span>
      <small>{sublabel}</small>
    </article>
  )
}

function AdminDepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [departmentName, setDepartmentName] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [deleteDepartment, setDeleteDepartment] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/admin/departments'),
      api.get('/admin/users'),
    ])
      .then(([departmentsResponse, usersResponse]) => {
        if (cancelled) return
        setDepartments(Array.isArray(departmentsResponse.data) ? departmentsResponse.data : [])
        setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getApiError(loadError, 'Unable to load department management data.'))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  useEffect(() => {
    if (!createOpen && !deleteDepartment) return undefined
    function handleEscape(event) {
      if (event.key !== 'Escape' || creating || deleting) return
      setCreateOpen(false)
      setDeleteDepartment(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [createOpen, deleteDepartment, creating, deleting])

  const departmentRows = useMemo(() => {
    const countByDepartment = new Map()
    users.forEach((user) => {
      // Match backend DELETE safeguards: all accounts with a department_id count.
      if (user.department_id == null) return
      const id = String(user.department_id)
      countByDepartment.set(id, (countByDepartment.get(id) || 0) + 1)
    })
    return departments.map((department) => ({
      ...department,
      userCount: countByDepartment.get(String(department.id)) || 0,
    }))
  }, [departments, users])

  const visibleDepartments = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return departmentRows
      .filter((department) => {
        const matchesQuery =
          String(department.name ?? '').toLocaleLowerCase().includes(needle) ||
          String(department.id).toLowerCase().includes(needle.replace(/^#/, ''))
        const matchesFilter = filter === 'all' ||
          (filter === 'occupied' ? department.userCount > 0 : department.userCount === 0)
        return matchesQuery && matchesFilter
      })
      .sort((a, b) => {
        if (sort === 'users') return b.userCount - a.userCount || a.name.localeCompare(b.name)
        if (sort === 'recent') return String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
        return a.name.localeCompare(b.name)
      })
  }, [departmentRows, query, filter, sort])

  const assignedUsers = departmentRows.reduce((sum, row) => sum + row.userCount, 0)
  const occupiedDepartments = departmentRows.filter((row) => row.userCount > 0).length
  const emptyDepartments = departmentRows.length - occupiedDepartments

  function openCreateModal() {
    setDepartmentName('')
    setCreateError('')
    setError('')
    setMessage('')
    setCreateOpen(true)
  }

  async function handleCreateDepartment(event) {
    event.preventDefault()
    if (creating) return
    const name = departmentName.trim()
    if (!name) {
      setCreateError('Department name is required.')
      return
    }
    if (departments.some((department) => department.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setCreateError('This department already exists.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const response = await api.post('/admin/departments', { name })
      setDepartments((current) => [...current, response.data])
      setCreateOpen(false)
      setDepartmentName('')
      setQuery('')
      setFilter('all')
      setMessage(`${response.data.name} department created successfully.`)
    } catch (createRequestError) {
      setCreateError(getApiError(createRequestError, 'Unable to create the department.'))
    } finally {
      setCreating(false)
    }
  }

  function openDeleteModal(department) {
    setDeleteDepartment(department)
    setDeleteError('')
    setError('')
    setMessage('')
  }

  async function handleDeleteDepartment() {
    if (!deleteDepartment || deleting) return
    if (deleteDepartment.userCount > 0) {
      setDeleteError('Move all assigned users to another department before deleting it.')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/admin/departments/${deleteDepartment.id}`)
      const deletedName = deleteDepartment.name
      setDepartments((current) => current.filter((department) => department.id !== deleteDepartment.id))
      setDeleteDepartment(null)
      setMessage(`${deletedName} department deleted successfully.`)
    } catch (deleteRequestError) {
      setDeleteError(getApiError(deleteRequestError, 'Unable to delete the department.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="secura-departments-v106">
      <header className="sd-hero">
        <div className="sd-hero__copy">
          <span className="sd-eyebrow"><span className="sd-eyebrow__dot" /> ADMINISTRATION <ChevronRight size={13} /> DEPARTMENTS</span>
          <h1>Department <span>management.</span></h1>
          <p>Organize your teams and manage the department structure behind secure document sharing.</p>
          <div className="sd-hero__caption"><ShieldCheck size={15} /> Organization controls · SECURA</div>
        </div>
        <div className="sd-hero__action">
          <span className="sd-hero__aura" aria-hidden="true" />
          <button type="button" className="sd-button sd-button--primary" onClick={openCreateModal}>
            <Plus size={17} /> Create department
          </button>
        </div>
      </header>

      <section className="sd-metrics" aria-label="Department overview">
        <MetricCard icon={Layers3} label="Total departments" value={loading ? '—' : departments.length} sublabel="Organizational units" tint="purple" />
        <MetricCard icon={UsersRound} label="Assigned users" value={loading ? '—' : assignedUsers} sublabel="Across all roles" tint="cyan" />
        <MetricCard icon={CheckCircle2} label="With users" value={loading ? '—' : occupiedDepartments} sublabel="Departments with members" tint="green" />
        <MetricCard icon={Building2} label="Empty departments" value={loading ? '—' : emptyDepartments} sublabel="No assigned users" tint="pink" />
      </section>

      {message && (
        <div className="sd-notice sd-notice--success" role="status">
          <Check size={17} /> <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="Dismiss success message"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="sd-notice sd-notice--error" role="alert">
          <AlertCircle size={17} /> <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error message"><X size={16} /></button>
        </div>
      )}

      <section className="sd-directory" aria-labelledby="sd-directory-title">
        <div className="sd-directory__head">
          <div className="sd-directory__intro">
            <span className="sd-directory__symbol"><Building2 size={20} /></span>
            <div>
              <h2 id="sd-directory-title">Department directory</h2>
              <p>View departments, their assignments and management options.</p>
            </div>
          </div>
          <button type="button" className="sd-refresh" onClick={() => {
            setLoading(true)
            setError('')
            setReloadKey((key) => key + 1)
          }} disabled={loading} title="Refresh data">
            <RefreshCw size={16} className={loading ? 'sd-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="sd-toolbar">
          <label className="sd-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or department ID..." aria-label="Search departments" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
          </label>
          <div className="sd-filters" role="group" aria-label="Filter departments">
            {FILTERS.map((item) => (
              <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="sd-sort"><ArrowDownAZ size={16} /><span>Sort:</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort departments">
              <option value="name">Name A–Z</option>
              <option value="users">Most users</option>
              <option value="recent">ID descending</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="sd-loading" role="status" aria-label="Loading departments">
            <div /><div /><div /><span>Loading department directory...</span>
          </div>
        ) : visibleDepartments.length === 0 ? (
          <div className="sd-empty">
            <span className="sd-empty__icon"><Building2 size={27} /></span>
            <h3>{query || filter !== 'all' ? 'No matching departments' : 'Your directory is empty'}</h3>
            <p>{query || filter !== 'all' ? 'Try a different search or filter.' : 'Create your first department to start organizing users.'}</p>
            {(query || filter !== 'all') ? (
              <button type="button" className="sd-button sd-button--secondary" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button>
            ) : (
              <button type="button" className="sd-button sd-button--secondary" onClick={openCreateModal}><Plus size={16} /> Add department</button>
            )}
          </div>
        ) : (
          <div className="sd-table-scroll">
            <table className="sd-table">
              <thead><tr><th scope="col">DEPARTMENT</th><th scope="col">ASSIGNED USERS</th><th scope="col">MEMBERSHIP</th><th scope="col">DEPARTMENT ID</th><th scope="col" className="sd-table__right">ACTION</th></tr></thead>
              <tbody>
                {visibleDepartments.map((department) => (
                  <tr key={department.id}>
                    <td>
                      <div className="sd-identity"><span className="sd-identity__icon"><Building2 size={19} /></span>
                        <div><strong>{department.name}</strong><small>Secura department</small></div>
                      </div>
                    </td>
                    <td><span className="sd-members"><UsersRound size={15} /> {department.userCount} {department.userCount === 1 ? 'user' : 'users'}</span></td>
                    <td><span className={`sd-status ${department.userCount > 0 ? 'sd-status--assigned' : 'sd-status--empty'}`}><i />{department.userCount > 0 ? 'Assigned' : 'Empty'}</span></td>
                    <td><span className="sd-id">#{department.id}</span></td>
                    <td className="sd-table__right"><button type="button" className="sd-delete" onClick={() => openDeleteModal(department)} title={`Delete ${department.name}`}><Trash2 size={15} /> Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="sd-directory__footer"><span><ShieldCheck size={15} /> Department access is controlled by the SECURA backend.</span><span>Showing {loading ? '—' : visibleDepartments.length} of {loading ? '—' : departments.length}</span></div>
      </section>

      <div className="sd-footnote"><CircleHelp size={16} /> Need to reassign users? Use <strong>Admin → User Management</strong> to change their department before deleting an occupied one.</div>

      {createOpen && (
        <div className="sd-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false) }}>
          <form className="sd-modal" onSubmit={handleCreateDepartment} role="dialog" aria-modal="true" aria-labelledby="sd-create-title">
            <button className="sd-modal__close" type="button" onClick={() => setCreateOpen(false)} disabled={creating} aria-label="Close dialog"><X size={19} /></button>
            <div className="sd-modal__icon"><Building2 size={23} /></div>
            <span className="sd-eyebrow">NEW ORGANIZATIONAL UNIT</span>
            <h2 id="sd-create-title">Create department</h2>
            <p className="sd-modal__subtitle">Add a department to organize users and support controlled document sharing.</p>
            <label className="sd-field"><span>Department name <b>*</b></span><input type="text" value={departmentName} onChange={(event) => { setDepartmentName(event.target.value); if (createError) setCreateError('') }} maxLength={100} autoFocus placeholder="e.g. Human Resources" required disabled={creating} /></label>
            {createError && <div className="sd-modal__error" role="alert"><AlertCircle size={16}/>{createError}</div>}
            <div className="sd-modal__info"><LockKeyhole size={17} /><span>Only authorized administrators can manage departments. Sharing rules remain enforced by the backend.</span></div>
            <div className="sd-modal__actions"><button type="button" className="sd-button sd-button--secondary" disabled={creating} onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="sd-button sd-button--primary" disabled={creating || !departmentName.trim()}>{creating ? 'Creating...' : <><Plus size={16} /> Create department</>}</button></div>
          </form>
        </div>
      )}

      {deleteDepartment && (
        <div className="sd-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteDepartment(null) }}>
          <section className="sd-modal sd-modal--danger" role="alertdialog" aria-modal="true" aria-labelledby="sd-delete-title" aria-describedby="sd-delete-description">
            <button className="sd-modal__close" type="button" onClick={() => setDeleteDepartment(null)} disabled={deleting} aria-label="Close dialog"><X size={19} /></button>
            <div className="sd-modal__icon sd-modal__icon--danger"><AlertTriangle size={23} /></div>
            <span className="sd-eyebrow">DEPARTMENT LIFECYCLE</span>
            <h2 id="sd-delete-title">Delete department?</h2>
            <p className="sd-modal__subtitle" id="sd-delete-description">You are about to permanently delete <strong>{deleteDepartment.name}</strong>.</p>
            <div className="sd-delete-summary"><span><UsersRound size={16} /> Assigned users</span><strong>{deleteDepartment.userCount}</strong></div>
            <div className="sd-modal__info sd-modal__info--warning"><AlertTriangle size={17} /><span>Deletion requires zero assigned users and no active document shares. The server performs final validation.</span></div>
            {deleteDepartment.userCount > 0 && <div className="sd-modal__error" role="alert"><LockKeyhole size={16} /> Move the assigned users to another department first.</div>}
            {deleteError && <div className="sd-modal__error" role="alert"><AlertCircle size={16} /> {deleteError}</div>}
            <div className="sd-modal__actions"><button type="button" className="sd-button sd-button--secondary" disabled={deleting} onClick={() => setDeleteDepartment(null)}>Cancel</button><button type="button" className="sd-button sd-button--danger" disabled={deleting || deleteDepartment.userCount > 0} onClick={handleDeleteDepartment}>{deleting ? 'Deleting...' : <><Trash2 size={16}/> Delete department</>}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminDepartmentManagement
