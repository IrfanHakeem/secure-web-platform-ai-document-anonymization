import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  FileText,
  FolderCheck,
  Library,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'
import { useAuth } from '../../context/useAuth'

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

function getGreetingInfo(date) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) {
    return {
      text: 'Good morning',
      period: 'morning',
    }
  }

  if (hour >= 12 && hour < 17) {
    return {
      text: 'Good afternoon',
      period: 'afternoon',
    }
  }

  if (hour >= 17 && hour < 21) {
    return {
      text: 'Good evening',
      period: 'evening',
    }
  }

  return {
    text: 'Good night',
    period: 'night',
  }
}

function UserDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [requestCounts, setRequestCounts] =
    useState({
      myRequests: null,
      ownerApprovals: null,
    })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 60 * 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCounts = async () => {
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

        setRequestCounts({
          myRequests:
            myRequestsResponse.data.length,
          ownerApprovals:
            ownerPendingResponse.data.length,
        })
      } catch {
        if (cancelled) {
          return
        }

        setRequestCounts({
          myRequests: null,
          ownerApprovals: null,
        })
      }
    }

    loadCounts()

    return () => {
      cancelled = true
    }
  }, [])

  const displayName =
    user?.full_name ||
    user?.username ||
    'User'

  const firstName =
    displayName.split(' ')[0]

  const greeting =
    getGreetingInfo(currentTime)

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="secura-dashboard-shell">
      <div className="secura-dashboard-content">
        <header className="secura-topbar">
          <div className="secura-topbar-title">
            <div className="secura-topbar-brand">
              <span className="secura-brand-mark">
                S
              </span>

              <span>Secura</span>
            </div>

            <div>
              <p className="secura-eyebrow">
                SECURE WORKSPACE
              </p>

              <h1
                className={`secura-dashboard-greeting secura-dashboard-greeting-${greeting.period}`}
                aria-live="polite"
              >
                <span
                  key={greeting.text}
                  className="secura-dashboard-greeting-text"
                >
                  {greeting.text},
                </span>{' '}
                {firstName}!
              </h1>

              <p className="secura-subtitle">
                Here is an overview of your secure
                document workspace.
              </p>
            </div>
          </div>

          <div className="secura-header-actions">
            <button
              type="button"
              className="secura-user-menu"
              onClick={() =>
                navigate('/user/profile')
              }
            >
              <span className="secura-avatar">
                {getInitials(displayName)}
              </span>

              <span>
                <b>{displayName}</b>

                <small>
                  {user?.role || 'User'}
                </small>
              </span>

              <span className="secura-chevron">
                ⌄
              </span>
            </button>

            <button
              type="button"
              className="secura-logout-button"
              onClick={handleLogout}
            >
              Log out

              <LogOut size={14} />
            </button>
          </div>
        </header>

        <section className="secura-dashboard-intro">
          <p className="secura-eyebrow">
            YOUR SECURE WORKSPACE
          </p>

          <h2>
            What would you like to do?
          </h2>

          <p>
            Choose a workspace to continue
            managing your protected documents.
          </p>
        </section>

        <section className="secura-workspace-grid">
          <button
            type="button"
            className="secura-workspace-card"
            onClick={() =>
              navigate('/user/anonymize')
            }
          >
            <span className="secura-workspace-icon">
              <Sparkles size={20} />
            </span>

            <span className="secura-workspace-copy">
              <b>
                Anonymize document
              </b>

              <small>
                Upload a document and protect
                sensitive information.
              </small>
            </span>

            <ArrowRight
              className="secura-card-arrow"
              size={18}
            />
          </button>

          <button
            type="button"
            className="secura-workspace-card secura-accent-blue"
            onClick={() =>
              navigate('/user/library')
            }
          >
            <span className="secura-workspace-icon">
              <Library size={20} />
            </span>

            <span className="secura-workspace-copy">
              <b>
                Anonymized file library
              </b>

              <small>
                View your anonymized files and
                files shared with your
                department.
              </small>
            </span>

            <ArrowRight
              className="secura-card-arrow"
              size={18}
            />
          </button>

          <button
            type="button"
            className="secura-workspace-card secura-accent-mint"
            onClick={() =>
              navigate(
                '/user/approved-originals',
              )
            }
          >
            <span className="secura-workspace-icon">
              <FolderCheck size={20} />
            </span>

            <span className="secura-workspace-copy">
              <b>
                Approval file library
              </b>

              <small>
                View approved original files,
                verify their integrity, and
                securely download them.
              </small>
            </span>

            <ArrowRight
              className="secura-card-arrow"
              size={18}
            />
          </button>

          <article className="secura-workspace-card secura-original-card">
            <button
              type="button"
              className="secura-original-heading"
              onClick={() =>
                navigate(
                  '/user/original-access',
                )
              }
            >
              <span className="secura-workspace-icon">
                <Clock3 size={20} />
              </span>

              <span className="secura-workspace-copy">
                <b>
                  Original access
                </b>

                <small>
                  Request or review access to
                  original documents.
                </small>
              </span>

              <ArrowRight
                className="secura-card-arrow"
                size={18}
              />
            </button>

            <div className="secura-original-actions">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/my-requests',
                  )
                }
              >
                <span className="secura-action-label">
                  <FileText size={14} />

                  My requests
                </span>

                <span className="secura-action-right">
                  <span className="secura-pill-count">
                    {requestCounts.myRequests ??
                      '—'}
                  </span>

                  <ArrowRight
                    size={13}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/user/owner-approvals',
                  )
                }
              >
                <span className="secura-action-label">
                  <FileCheck2
                    size={14}
                  />

                  Owner approval
                </span>

                <span className="secura-action-right">
                  <span className="secura-pill-count">
                    {requestCounts.ownerApprovals ??
                      '—'}
                  </span>

                  <ArrowRight
                    size={13}
                  />
                </span>
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}

export default UserDashboard
