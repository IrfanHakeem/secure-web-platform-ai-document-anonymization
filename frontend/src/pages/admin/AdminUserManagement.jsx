import {
  Building2,
  Check,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '../../api/client'

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function getInitials(name) {
  if (!name) {
    return 'U'
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const EMPTY_CREATE_FORM = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'User',
  department_id: '',
}

function AdminUserManagement() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [query, setQuery] =
    useState('')

  const [roleFilter, setRoleFilter] =
    useState('ALL')

  const [createOpen, setCreateOpen] =
    useState(false)

  const [createForm, setCreateForm] =
    useState(EMPTY_CREATE_FORM)

  const [creating, setCreating] =
    useState(false)

  const [departmentUser, setDepartmentUser] =
    useState(null)

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState('')

  const [updatingDepartment, setUpdatingDepartment] =
    useState(false)

  const [resetUser, setResetUser] =
    useState(null)

  const [newPassword, setNewPassword] =
    useState('')

  const [resettingPassword, setResettingPassword] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/departments'),
    ])
      .then(
        ([
          usersResponse,
          departmentsResponse,
        ]) => {
          if (cancelled) {
            return
          }

          setUsers(usersResponse.data)
          setDepartments(
            departmentsResponse.data,
          )
        },
      )
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load user management data.',
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

  const visibleUsers = useMemo(() => {
    let filtered = users

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(
        (user) =>
          user.role === roleFilter,
      )
    }

    const normalizedQuery = query
      .trim()
      .toLowerCase()

    if (!normalizedQuery) {
      return filtered
    }

    return filtered.filter((user) =>
      [
        user.full_name,
        user.username,
        user.email,
        user.role,
        user.department_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [users, query, roleFilter])

  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE_FORM)
    setError('')
    setMessage('')
    setCreateOpen(true)
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()

    const payload = {
      full_name:
        createForm.full_name.trim(),
      username:
        createForm.username.trim(),
      email:
        createForm.email.trim().toLowerCase(),
      password:
        createForm.password,
      role:
        createForm.role,
      department_id:
        createForm.role === 'User'
          ? Number(
              createForm.department_id,
            )
          : null,
    }

    if (
      !payload.full_name ||
      !payload.username ||
      !payload.email ||
      !payload.password
    ) {
      setError(
        'Complete all required fields.',
      )
      return
    }

    if (
      payload.role === 'User' &&
      !createForm.department_id
    ) {
      setError(
        'Department is required for User accounts.',
      )
      return
    }

    setCreating(true)
    setError('')
    setMessage('')

    try {
      const response = await api.post(
        '/admin/users',
        payload,
      )

      setUsers((current) => [
        ...current,
        response.data,
      ])

      setCreateOpen(false)

      setMessage(
        `${response.data.full_name || response.data.username} account created successfully.`,
      )
    } catch (createError) {
      setError(
        getApiError(
          createError,
          'Unable to create the account.',
        ),
      )
    } finally {
      setCreating(false)
    }
  }

  const openDepartmentModal = (user) => {
    setDepartmentUser(user)

    setSelectedDepartmentId(
      user.department_id
        ? String(user.department_id)
        : '',
    )

    setError('')
    setMessage('')
  }

  const handleDepartmentUpdate = async () => {
    if (
      !departmentUser ||
      !selectedDepartmentId
    ) {
      return
    }

    setUpdatingDepartment(true)
    setError('')
    setMessage('')

    try {
      const response = await api.patch(
        `/admin/users/${departmentUser.id}/department`,
        {
          department_id:
            Number(selectedDepartmentId),
        },
      )

      setUsers((current) =>
        current.map((user) =>
          user.id === response.data.id
            ? response.data
            : user,
        ),
      )

      setDepartmentUser(null)

      setMessage(
        `${response.data.full_name || response.data.username} department updated successfully.`,
      )
    } catch (updateError) {
      setError(
        getApiError(
          updateError,
          'Unable to update the department.',
        ),
      )
    } finally {
      setUpdatingDepartment(false)
    }
  }

  const openResetModal = (user) => {
    setResetUser(user)
    setNewPassword('')
    setError('')
    setMessage('')
  }

  const handlePasswordReset = async () => {
    if (!resetUser || !newPassword) {
      return
    }

    setResettingPassword(true)
    setError('')
    setMessage('')

    try {
      await api.patch(
        `/admin/users/${resetUser.id}/reset-password`,
        {
          new_password: newPassword,
        },
      )

      const displayName =
        resetUser.full_name ||
        resetUser.username

      setResetUser(null)
      setNewPassword('')

      setMessage(
        `Password reset successfully for ${displayName}.`,
      )
    } catch (resetError) {
      setError(
        getApiError(
          resetError,
          'Unable to reset the password.',
        ),
      )
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <>
      <header className="admin-users-header">
        <div>
          <p className="secura-eyebrow">
            ADMIN WORKSPACE
          </p>

          <h1>User management</h1>

          <p>
            Create and manage Secura User and
            Security Officer accounts.
          </p>
        </div>

        <button
          type="button"
          className="admin-create-user-button"
          onClick={openCreateModal}
        >
          <Plus size={15} />
          Create user
        </button>
      </header>

      {message && (
        <div className="admin-users-success">
          <Check size={16} />

          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="admin-users-error">
          <ShieldCheck size={16} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="admin-users-card">
        <div className="admin-users-toolbar">
          <div className="admin-users-search">
            <Search size={15} />

            <input
              value={query}
              placeholder="Search name, email or username"
              onChange={(event) =>
                setQuery(event.target.value)
              }
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="admin-users-filters">
            {[
              ['ALL', 'All'],
              ['User', 'Users'],
              [
                'Security Officer',
                'Security Officers',
              ],
              [
                'Administrator',
                'Administrators',
              ],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  roleFilter === value
                    ? 'selected'
                    : ''
                }
                onClick={() =>
                  setRoleFilter(value)
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-users-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="admin-users-empty">
            <UserCog size={23} />

            <b>No matching accounts</b>

            <p>
              Try adjusting the search or
              role filter.
            </p>
          </div>
        ) : (
          <div className="admin-users-table-wrap">
            <div className="admin-users-table">
              <div className="admin-users-row admin-users-heading">
                <span>User</span>
                <span>Role</span>
                <span>Department</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {visibleUsers.map((user) => {
                const isAdministrator =
                  user.role ===
                  'Administrator'

                const isUser =
                  user.role === 'User'

                return (
                  <div
                    className="admin-users-row"
                    key={user.id}
                  >
                    <div className="admin-user-identity">
                      <span className="admin-user-avatar">
                        {getInitials(
                          user.full_name ||
                            user.username,
                        )}
                      </span>

                      <div>
                        <b>
                          {user.full_name ||
                            user.username}
                        </b>

                        <small>
                          {user.email || '—'}
                        </small>

                        <em>
                          @{user.username}
                        </em>
                      </div>
                    </div>

                    <span
                      className={`admin-role-badge ${
                        isAdministrator
                          ? 'administrator'
                          : isUser
                            ? 'user'
                            : 'security'
                      }`}
                    >
                      {user.role}
                    </span>

                    <span className="admin-department-value">
                      {user.department_name ||
                        '—'}
                    </span>

                    <span
                      className={
                        user.is_active
                          ? 'admin-account-status active'
                          : 'admin-account-status inactive'
                      }
                    >
                      {user.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>

                    <div className="admin-user-actions">
                      {isUser && (
                        <button
                          type="button"
                          onClick={() =>
                            openDepartmentModal(
                              user,
                            )
                          }
                        >
                          <Building2
                            size={13}
                          />
                          Department
                        </button>
                      )}

                      {!isAdministrator && (
                        <button
                          type="button"
                          onClick={() =>
                            openResetModal(
                              user,
                            )
                          }
                        >
                          <KeyRound
                            size={13}
                          />
                          Reset password
                        </button>
                      )}

                      {isAdministrator && (
                        <span className="admin-protected-account">
                          Protected
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {createOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() =>
            !creating &&
            setCreateOpen(false)
          }
        >
          <form
            className="admin-user-modal"
            onSubmit={handleCreateUser}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() =>
                setCreateOpen(false)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              USER MANAGEMENT
            </p>

            <h2>Create account</h2>

            <p className="admin-modal-subtitle">
              Create a User or Security Officer
              account.
            </p>

            <div className="admin-create-grid">
              <label>
                Full name

                <input
                  type="text"
                  value={
                    createForm.full_name
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        full_name:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label>
                Username

                <input
                  type="text"
                  value={
                    createForm.username
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        username:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label className="full">
                Email

                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        email:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label>
                Role

                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        role:
                          event.target
                            .value,
                        department_id:
                          '',
                      }),
                    )
                  }
                >
                  <option value="User">
                    User
                  </option>

                  <option value="Security Officer">
                    Security Officer
                  </option>
                </select>
              </label>

              <label>
                Department

                <select
                  disabled={
                    createForm.role !==
                    'User'
                  }
                  value={
                    createForm.department_id
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        department_id:
                          event.target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {
                          department.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="full">
                Temporary password

                <input
                  type="password"
                  value={
                    createForm.password
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        password:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>
            </div>

            <div className="admin-create-note">
              <ShieldCheck size={16} />

              <p>
                Administrator accounts cannot
                be created from this screen.
              </p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-modal-primary"
                disabled={creating}
              >
                {creating
                  ? 'Creating...'
                  : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {departmentUser && (
        <div
          className="admin-modal-backdrop"
          onClick={() =>
            !updatingDepartment &&
            setDepartmentUser(null)
          }
        >
          <section
            className="admin-small-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() =>
                setDepartmentUser(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              USER MANAGEMENT
            </p>

            <h2>Change department</h2>

            <p>
              {departmentUser.full_name ||
                departmentUser.username}
            </p>

            <label>
              Department

              <select
                value={
                  selectedDepartmentId
                }
                onChange={(event) =>
                  setSelectedDepartmentId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() =>
                  setDepartmentUser(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-modal-primary"
                disabled={
                  updatingDepartment ||
                  !selectedDepartmentId
                }
                onClick={
                  handleDepartmentUpdate
                }
              >
                {updatingDepartment
                  ? 'Updating...'
                  : 'Save department'}
              </button>
            </div>
          </section>
        </div>
      )}

      {resetUser && (
        <div
          className="admin-modal-backdrop"
          onClick={() =>
            !resettingPassword &&
            setResetUser(null)
          }
        >
          <section
            className="admin-small-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() =>
                setResetUser(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              PASSWORD RESET
            </p>

            <h2>Reset account password</h2>

            <p>
              {resetUser.full_name ||
                resetUser.username}
            </p>

            <label>
              New password

              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="admin-create-note">
              <KeyRound size={16} />

              <p>
                The new password takes effect
                immediately.
              </p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() =>
                  setResetUser(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-modal-primary"
                disabled={
                  resettingPassword ||
                  !newPassword
                }
                onClick={
                  handlePasswordReset
                }
              >
                {resettingPassword
                  ? 'Resetting...'
                  : 'Reset password'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default AdminUserManagement