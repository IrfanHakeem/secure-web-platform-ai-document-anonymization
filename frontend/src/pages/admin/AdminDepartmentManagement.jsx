import {
  AlertTriangle,
  Building2,
  Check,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
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

function AdminDepartmentManagement() {
  const [
    departments,
    setDepartments,
  ] = useState([])

  const [users, setUsers] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [query, setQuery] =
    useState('')

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [createOpen, setCreateOpen] =
    useState(false)

  const [
    departmentName,
    setDepartmentName,
  ] = useState('')

  const [creating, setCreating] =
    useState(false)

  const [
    deleteDepartment,
    setDeleteDepartment,
  ] = useState(null)

  const [deleting, setDeleting] =
    useState(false)

  const [
    deleteError,
    setDeleteError,
  ] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get('/admin/departments'),
      api.get('/admin/users'),
    ])
      .then(
        ([
          departmentsResponse,
          usersResponse,
        ]) => {
          if (cancelled) {
            return
          }

          setDepartments(
            departmentsResponse.data,
          )

          setUsers(
            usersResponse.data,
          )
        },
      )
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load department management data.',
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

  const departmentRows =
    useMemo(() => {
      return departments.map(
        (department) => {
          const assignedUsers =
            users.filter(
              (user) =>
                user.role ===
                  'User' &&
                user.department_id ===
                  department.id,
            )

          return {
            ...department,
            userCount:
              assignedUsers.length,
          }
        },
      )
    }, [
      departments,
      users,
    ])

  const visibleDepartments =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      if (!normalizedQuery) {
        return departmentRows
      }

      return departmentRows.filter(
        (department) =>
          department.name
            .toLowerCase()
            .includes(
              normalizedQuery,
            ),
      )
    }, [
      departmentRows,
      query,
    ])

  const totalAssignedUsers =
    departmentRows.reduce(
      (
        total,
        department,
      ) =>
        total +
        department.userCount,
      0,
    )

  const handleCreateDepartment =
    async (event) => {
      event.preventDefault()

      const name =
        departmentName.trim()

      if (!name) {
        setError(
          'Department name is required.',
        )
        return
      }

      setCreating(true)
      setError('')
      setMessage('')

      try {
        const response =
          await api.post(
            '/admin/departments',
            {
              name,
            },
          )

        setDepartments(
          (current) => [
            ...current,
            response.data,
          ],
        )

        setDepartmentName('')
        setCreateOpen(false)

        setMessage(
          `${response.data.name} department created successfully.`,
        )
      } catch (createError) {
        setError(
          getApiError(
            createError,
            'Unable to create the department.',
          ),
        )
      } finally {
        setCreating(false)
      }
    }

  const openDeleteModal =
    (department) => {
      setDeleteDepartment(
        department,
      )
      setDeleteError('')
      setError('')
      setMessage('')
    }

  const handleDeleteDepartment =
    async () => {
      if (!deleteDepartment) {
        return
      }

      if (
        deleteDepartment.userCount >
        0
      ) {
        setDeleteError(
          'Move all assigned users to another department before deleting this department.',
        )
        return
      }

      setDeleting(true)
      setDeleteError('')

      try {
        await api.delete(
          `/admin/departments/${deleteDepartment.id}`,
        )

        const deletedName =
          deleteDepartment.name

        setDepartments(
          (current) =>
            current.filter(
              (department) =>
                department.id !==
                deleteDepartment.id,
            ),
        )

        setDeleteDepartment(null)

        setMessage(
          `${deletedName} department deleted successfully.`,
        )
      } catch (deleteRequestError) {
        setDeleteError(
          getApiError(
            deleteRequestError,
            'Unable to delete the department.',
          ),
        )
      } finally {
        setDeleting(false)
      }
    }

  return (
    <>
      <header className="admin-departments-header">
        <div>
          <p className="secura-eyebrow">
            ADMIN WORKSPACE
          </p>

          <h1>
            Department management
          </h1>

          <p>
            Manage departments used
            to organize Secura User
            accounts.
          </p>
        </div>

        <button
          type="button"
          className="admin-create-department-button"
          onClick={() => {
            setDepartmentName('')
            setError('')
            setMessage('')
            setCreateOpen(true)
          }}
        >
          <Plus size={15} />
          Create department
        </button>
      </header>

      <section className="admin-department-stats">
        <article>
          <span>
            <Building2
              size={19}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : departments.length}
            </b>

            <p>
              Total departments
            </p>
          </div>
        </article>

        <article>
          <span className="users">
            <UsersRound
              size={19}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : totalAssignedUsers}
            </b>

            <p>
              Assigned users
            </p>
          </div>
        </article>
      </section>

      {message && (
        <div className="admin-departments-success">
          <Check size={16} />

          <span>
            {message}
          </span>

          <button
            type="button"
            onClick={() =>
              setMessage('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="admin-departments-error">
          <ShieldCheck
            size={16}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="admin-departments-card">
        <div className="admin-departments-toolbar">
          <div className="admin-departments-search">
            <Search size={15} />

            <input
              value={query}
              placeholder="Search department"
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery('')
                }
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="admin-departments-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleDepartments.length ===
          0 ? (
          <div className="admin-departments-empty">
            <span>
              <Building2
                size={22}
              />
            </span>

            <b>
              {query
                ? 'No matching departments'
                : 'No departments yet'}
            </b>

            <p>
              {query
                ? 'Try another search term.'
                : 'Create the first department for User accounts.'}
            </p>
          </div>
        ) : (
          <div className="admin-departments-table-wrap">
            <div className="admin-departments-table">
              <div className="admin-departments-row admin-departments-heading">
                <span>
                  Department
                </span>

                <span>
                  Assigned users
                </span>

                <span>
                  Department ID
                </span>

                <span>
                  Action
                </span>
              </div>

              {visibleDepartments.map(
                (department) => (
                  <div
                    className="admin-departments-row"
                    key={
                      department.id
                    }
                  >
                    <div className="admin-department-identity">
                      <span>
                        <Building2
                          size={17}
                        />
                      </span>

                      <div>
                        <b>
                          {
                            department.name
                          }
                        </b>

                        <small>
                          Secura department
                        </small>
                      </div>
                    </div>

                    <div className="admin-department-users">
                      <UsersRound
                        size={14}
                      />

                      <span>
                        {
                          department.userCount
                        }{' '}
                        {department.userCount ===
                        1
                          ? 'user'
                          : 'users'}
                      </span>
                    </div>

                    <code>
                      #{department.id}
                    </code>

                    <button
                      type="button"
                      className="admin-department-delete-button"
                      onClick={() =>
                        openDeleteModal(
                          department,
                        )
                      }
                    >
                      <Trash2
                        size={13}
                      />
                      Delete
                    </button>
                  </div>
                ),
              )}
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
            className="admin-department-modal"
            onSubmit={
              handleCreateDepartment
            }
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() =>
                setCreateOpen(
                  false,
                )
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              DEPARTMENT MANAGEMENT
            </p>

            <h2>
              Create department
            </h2>

            <p className="admin-department-modal-subtitle">
              Add a department that
              can be assigned to User
              accounts.
            </p>

            <label>
              Department name

              <input
                type="text"
                value={
                  departmentName
                }
                autoFocus
                maxLength={100}
                placeholder="e.g. Human Resources"
                onChange={(
                  event,
                ) =>
                  setDepartmentName(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="admin-department-note">
              <ShieldCheck
                size={16}
              />

              <p>
                Departments are used
                for controlled document
                sharing between users in
                the same department.
              </p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() =>
                  setCreateOpen(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-modal-primary"
                disabled={
                  creating ||
                  !departmentName
                    .trim()
                }
              >
                {creating
                  ? 'Creating...'
                  : 'Create department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteDepartment && (
        <div
          className="admin-modal-backdrop"
          onClick={() =>
            !deleting &&
            setDeleteDepartment(
              null,
            )
          }
        >
          <section
            className="admin-small-modal admin-delete-department-modal"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() =>
                setDeleteDepartment(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <span className="admin-delete-department-icon">
              <Trash2
                size={20}
              />
            </span>

            <p className="secura-eyebrow">
              DEPARTMENT LIFECYCLE
            </p>

            <h2>
              Delete department?
            </h2>

            <p>
              {
                deleteDepartment.name
              }
            </p>

            <div className="admin-delete-department-note">
              <AlertTriangle
                size={16}
              />

              <p>
                Permanent deletion is
                allowed only when no
                users are assigned and
                no active document
                shares reference this
                department.
              </p>
            </div>

            <div className="admin-delete-department-count">
              <span>
                Assigned users
              </span>

              <b>
                {
                  deleteDepartment.userCount
                }
              </b>
            </div>

            {deleteDepartment.userCount >
              0 && (
              <div className="admin-delete-blocked">
                Move all assigned
                users to another
                department first.
              </div>
            )}

            {deleteError && (
              <div className="admin-delete-blocked">
                {deleteError}
              </div>
            )}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={() =>
                  setDeleteDepartment(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-modal-danger"
                disabled={
                  deleting ||
                  deleteDepartment.userCount >
                    0
                }
                onClick={
                  handleDeleteDepartment
                }
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete department'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default AdminDepartmentManagement
