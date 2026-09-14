import {
  ArrowRight,
  Clock3,
  FileCheck2,
  FolderCheck,
  Library,
  LogOut,
  ShieldCheck,
  Sparkles,
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
      () => {
        setCurrentTime(new Date())
      },
      60 * 1000,
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDashboard =
      async () => {
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
            myRequestsResponse.data,
          )

          setOwnerPendingRequests(
            ownerPendingResponse.data,
          )
        } catch {
          if (!cancelled) {
            setError(
              'Unable to load your secure workspace summary.',
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

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="role-dashboard role-dashboard--user">
      <div className="role-dashboard__content">
        <header className="role-dashboard__topbar">
          <div className="role-dashboard__brand-area">
            <div className="role-dashboard__brand">
              <span>S</span>
              <b>Secura</b>
            </div>

            <div className="role-dashboard__welcome">
              <p className="secura-eyebrow">
                SECURE WORKSPACE
              </p>

              <h1>
                {getGreetingInfo(
                  currentTime,
                )}
                , {firstName}!
              </h1>

              <p>
                Manage protected documents
                and original-file access
                from one secure workspace.
              </p>
            </div>
          </div>

          <div className="role-dashboard__account">
            <button
              type="button"
              className="role-dashboard__account-button"
              onClick={() =>
                navigate(
                  '/user/profile',
                )
              }
            >
              <ProfileAvatar
                name={displayName}
                className="role-dashboard__avatar"
              />

              <span>
                <b>{displayName}</b>

                <small>
                  {user?.role ||
                    'User'}
                </small>
              </span>
            </button>

            <button
              type="button"
              className="role-dashboard__logout"
              onClick={
                handleLogout
              }
            >
              Log out
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <section className="role-dashboard__intro">
          <p className="secura-eyebrow">
            WORKSPACE OVERVIEW
          </p>

          <h2>
            Your secure document workspace
          </h2>

          <p>
            Anonymize documents, manage
            department sharing and track
            original-file approval requests.
          </p>
        </section>

        {error && (
          <div className="role-dashboard__error">
            <ShieldCheck
              size={16}
            />
            {error}
          </div>
        )}

        <section className="role-dashboard__status-banner">
          <div className="role-dashboard__status-icon user">
            <ShieldCheck
              size={23}
            />
          </div>

          <div className="role-dashboard__status-copy">
            <small>
              DOCUMENT PRIVACY
            </small>

            <div>
              <h3>
                Secure workspace ready
              </h3>

              <span className="role-dashboard__status-pill active">
                Protected
              </span>
            </div>

            <p>
              Original-file access is
              protected by owner approval
              and final Security Officer
              review.
            </p>
          </div>

          <div className="role-dashboard__status-meta">
            <small>
              Approved originals
            </small>

            <b>
              {loading
                ? '—'
                : statistics
                    .approvedOriginals}
            </b>
          </div>
        </section>

        <section className="role-dashboard__stats">
          <article>
            <span className="role-dashboard__stat-icon purple">
              <Clock3 size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .totalRequests}
              </b>

              <p>
                My requests
              </p>

              <small>
                Original access
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon blue">
              <Clock3 size={19} />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .pendingRequests}
              </b>

              <p>
                Pending requests
              </p>

              <small>
                Awaiting approval
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon green">
              <FolderCheck
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .approvedOriginals}
              </b>

              <p>
                Approved originals
              </p>

              <small>
                Ready for access
              </small>
            </div>
          </article>

          <article>
            <span className="role-dashboard__stat-icon peach">
              <FileCheck2
                size={19}
              />
            </span>

            <div>
              <b>
                {loading
                  ? '—'
                  : statistics
                      .ownerApprovals}
              </b>

              <p>
                Owner reviews
              </p>

              <small>
                Waiting for you
              </small>
            </div>
          </article>
        </section>

        <section className="role-dashboard__main-grid">
          <div className="role-dashboard__tools">
            <div className="role-dashboard__panel-heading">
              <div>
                <p className="secura-eyebrow">
                  DOCUMENT TOOLS
                </p>

                <h2>
                  Secure document tools
                </h2>
              </div>

              <ShieldCheck
                size={20}
              />
            </div>

            <div className="role-dashboard__actions">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/anonymize',
                  )
                }
              >
                <span className="role-dashboard__action-icon purple">
                  <Sparkles
                    size={20}
                  />
                </span>

                <span>
                  <b>
                    Anonymize document
                  </b>

                  <small>
                    Upload a document and
                    protect supported PII.
                  </small>
                </span>

                <ArrowRight
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/library',
                  )
                }
              >
                <span className="role-dashboard__action-icon blue">
                  <Library
                    size={20}
                  />
                </span>

                <span>
                  <b>
                    Anonymized file library
                  </b>

                  <small>
                    Manage your files and
                    department-shared
                    anonymized documents.
                  </small>
                </span>

                <ArrowRight
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/approved-originals',
                  )
                }
              >
                <span className="role-dashboard__action-icon green">
                  <FolderCheck
                    size={20}
                  />
                </span>

                <span>
                  <b>
                    Approval file library
                  </b>

                  <small>
                    Open fully approved
                    originals with integrity
                    verification.
                  </small>
                </span>

                <ArrowRight
                  size={17}
                />
              </button>
            </div>
          </div>

          <aside className="role-dashboard__side-panel">
            <p className="secura-eyebrow">
              ORIGINAL ACCESS
            </p>

            <div className="role-dashboard__side-shield">
              <ShieldCheck
                size={26}
              />
            </div>

            <h3>
              Approval workflow
            </h3>

            <p>
              Track requests you submitted
              and review requests for
              documents that you own.
            </p>

            <button
              type="button"
              className="role-dashboard__side-link"
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
              className="role-dashboard__side-link"
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
          </aside>
        </section>
      </div>
    </main>
  )
}

export default UserDashboard
