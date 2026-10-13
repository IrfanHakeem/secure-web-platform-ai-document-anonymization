import {
  ArrowUpRight,
  Clock3,
  FileCheck2,
  FolderCheck,
  Library,
  LogOut,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'
import ProfileAvatar from '../../components/ProfileAvatar'
import { useAuth } from '../../context/useAuth'

function getGreetingInfo(date) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  }

  if (hour >= 17 && hour < 21) {
    return 'Good evening'
  }

  return 'Good night'
}

function UserDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [myRequests, setMyRequests] =
    useState([])

  const [
    ownerPendingRequests,
    setOwnerPendingRequests,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrentTime(new Date()),
      60 * 1000,
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const [
          myRequestsResponse,
          ownerPendingResponse,
        ] = await Promise.all([
          api.get(
            '/original-file-requests/my-requests',
          ),
          api.get(
            '/original-file-requests/owner/pending',
          ),
        ])

        if (cancelled) {
          return
        }

        setMyRequests(
          Array.isArray(
            myRequestsResponse.data,
          )
            ? myRequestsResponse.data
            : [],
        )

        setOwnerPendingRequests(
          Array.isArray(
            ownerPendingResponse.data,
          )
            ? ownerPendingResponse.data
            : [],
        )
      } catch {
        if (!cancelled) {
          setError(
            'Unable to load your workspace summary.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const statistics =
    useMemo(() => {
      const pending =
        myRequests.filter(
          (request) =>
            request.status ===
              'PENDING_OWNER' ||
            request.status ===
              'PENDING_SECURITY',
        ).length

      const approved =
        myRequests.filter(
          (request) =>
            request.status ===
            'APPROVED',
        ).length

      return {
        totalRequests:
          myRequests.length,
        pendingRequests:
          pending,
        approvedOriginals:
          approved,
        ownerApprovals:
          ownerPendingRequests.length,
      }
    }, [
      myRequests,
      ownerPendingRequests,
    ])

  const displayName =
    user?.full_name ||
    user?.username ||
    'User'

  const firstName =
    displayName.split(' ')[0]

  const stats = [
    {
      label: 'My requests',
      value:
        statistics.totalRequests,
      note: 'Original access',
      path: '/user/my-requests',
      icon: Clock3,
      tone: 'purple',
    },
    {
      label: 'Pending requests',
      value:
        statistics.pendingRequests,
      note: 'Awaiting approval',
      path: '/user/my-requests',
      icon: Clock3,
      tone: 'cyan',
    },
    {
      label: 'Approved originals',
      value:
        statistics.approvedOriginals,
      note: 'Ready for access',
      path: '/user/approved-originals',
      icon: FolderCheck,
      tone: 'green',
    },
    {
      label: 'Owner reviews',
      value:
        statistics.ownerApprovals,
      note: 'Waiting for you',
      path: '/user/owner-approvals',
      icon: UserRoundCheck,
      tone: 'pink',
    },
  ]

  const tools = [
    {
      title: 'Anonymize document',
      copy:
        'Upload a supported file and protect sensitive information with AI.',
      path: '/user/anonymize',
      icon: Sparkles,
      tone: 'purple',
    },
    {
      title: 'Anonymized file library',
      copy:
        'Manage private, shared and archived anonymized documents.',
      path: '/user/library',
      icon: Library,
      tone: 'cyan',
    },
    {
      title: 'Original access',
      copy:
        'Request an original file or review requests for documents you own.',
      path: '/user/original-access',
      icon: Clock3,
      tone: 'pink',
    },
    {
      title: 'Approval file library',
      copy:
        'Open fully approved originals with integrity verification.',
      path: '/user/approved-originals',
      icon: FileCheck2,
      tone: 'green',
    },
  ]

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="secura-bold-dashboard">
      <div className="secura-bold-dashboard__bg-grid" />
      <div className="secura-bold-dashboard__blob secura-bold-dashboard__blob--one" />
      <div className="secura-bold-dashboard__blob secura-bold-dashboard__blob--two" />

      <div className="secura-bold-dashboard__content">
        <header className="secura-bold-hero">
          <div className="secura-bold-hero__copy">
            <p className="secura-bold-kicker">
              SECURE WORKSPACE
            </p>

            <h1>
              {getGreetingInfo(currentTime)},{' '}
              <span>{firstName}</span>
            </h1>

            <p>
              Protect documents, manage
              sharing and control original-file
              access from one workspace.
            </p>
          </div>

          <div className="secura-bold-hero__visual" aria-hidden="true">
            <div className="secura-bold-visual__ring secura-bold-visual__ring--outer" />
            <div className="secura-bold-visual__ring secura-bold-visual__ring--inner" />

            <div className="secura-bold-visual__core">
              <span className="secura-bold-visual__cube secura-bold-visual__cube--one" />
              <span className="secura-bold-visual__cube secura-bold-visual__cube--two" />
              <span className="secura-bold-visual__cube secura-bold-visual__cube--three" />
              <span className="secura-bold-visual__beam" />
              <FileCheck2 size={34} />
            </div>

            <span className="secura-bold-visual__dot secura-bold-visual__dot--one" />
            <span className="secura-bold-visual__dot secura-bold-visual__dot--two" />
            <span className="secura-bold-visual__dot secura-bold-visual__dot--three" />
          </div>

          <div className="secura-bold-hero__account">
            <button
              type="button"
              className="secura-bold-account"
              onClick={() =>
                navigate(
                  '/user/profile',
                )
              }
            >
              <ProfileAvatar
                name={displayName}
                className="secura-bold-account__avatar"
              />

              <span>
                <b>{displayName}</b>
                <small>
                  {user?.role ||
                    'User'}
                </small>
              </span>

              <ArrowUpRight size={14} />
            </button>

            <button
              type="button"
              className="secura-bold-logout"
              aria-label="Log out"
              title="Log out"
              onClick={handleLogout}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {error && (
          <div className="secura-bold-error">
            {error}
          </div>
        )}

        <section className="secura-bold-section-head">
          <div>
            <p className="secura-bold-kicker">
              WORKSPACE OVERVIEW
            </p>

            <h2>
              Important activity at a glance
            </h2>
          </div>

        </section>

        <section className="secura-bold-stats">
          {stats.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.label}
                className={`secura-bold-stat tone-${item.tone}`}
              >
                <span className="secura-bold-stat__icon">
                  <Icon size={18} />
                </span>

                <strong>
                  {loading
                    ? '—'
                    : item.value}
                </strong>

                <b>{item.label}</b>
                <small>{item.note}</small>
              </article>
            )
          })}
        </section>

        <section className="secura-bold-main-grid">
          <div className="secura-bold-tools-panel">
            <div className="secura-bold-panel-head">
              <div>
                <p className="secura-bold-kicker">
                  DOCUMENT TOOLS
                </p>

                <h2>
                  Secure document tools
                </h2>
              </div>

              <span>4 tools</span>
            </div>

            <div className="secura-bold-tools-grid">
              {tools.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`secura-bold-tool tone-${item.tone}`}
                    onClick={() =>
                      navigate(
                        item.path,
                      )
                    }
                  >
                    <span className="secura-bold-tool__glow" />

                    <span className="secura-bold-tool__icon">
                      <Icon size={19} />
                    </span>

                    <span className="secura-bold-tool__copy">
                      <b>{item.title}</b>
                      <small>
                        {item.copy}
                      </small>
                    </span>

                    <ArrowUpRight
                      className="secura-bold-tool__arrow"
                      size={16}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="secura-bold-workflow">
            <div className="secura-bold-workflow__head">
              <div>
                <p className="secura-bold-kicker">
                  ORIGINAL ACCESS
                </p>

                <h2>
                  Approval workflow
                </h2>
              </div>

              <span>
                <FileCheck2 size={19} />
              </span>
            </div>

            <p>
              Original documents stay protected
              until owner and Security Officer
              approval are complete.
            </p>

            <div className="secura-bold-flow">
              <article>
                <span>01</span>

                <div>
                  <b>Owner review</b>
                  <small>
                    Business justification
                  </small>
                </div>
              </article>

              <i />

              <article>
                <span>02</span>

                <div>
                  <b>Security review</b>
                  <small>
                    Final access decision
                  </small>
                </div>
              </article>
            </div>

            <div className="secura-bold-workflow__links">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/my-requests',
                  )
                }
              >
                <span>
                  My requests
                </span>

                <b>
                  {loading
                    ? '—'
                    : statistics
                        .totalRequests}
                </b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/owner-approvals',
                  )
                }
              >
                <span>
                  Owner approvals
                </span>

                <b>
                  {loading
                    ? '—'
                    : statistics
                        .ownerApprovals}
                </b>
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default UserDashboard
