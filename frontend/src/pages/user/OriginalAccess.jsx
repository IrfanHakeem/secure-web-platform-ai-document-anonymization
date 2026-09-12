import { useEffect, useState } from 'react'
import {
  Check,
  Clock3,
  FileText,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import api from '../../api/client'

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function getStatusDetails(status) {
  const statuses = {
    PENDING_OWNER: {
      label: 'Pending owner approval',
      className: 'pending-owner',
    },
    PENDING_SECURITY: {
      label: 'Pending security review',
      className: 'pending-security',
    },
    APPROVED: {
      label: 'Approved',
      className: 'approved',
    },
    REJECTED_BY_OWNER: {
      label: 'Rejected by owner',
      className: 'rejected',
    },
    REJECTED_BY_SECURITY: {
      label: 'Rejected by Security Officer',
      className: 'rejected',
    },
  }

  return (
    statuses[status] ?? {
      label: status?.replaceAll('_', ' ') || 'Unknown',
      className: 'default',
    }
  )
}

function OriginalAccess() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = location.pathname.includes(
    '/owner-approvals',
  )
    ? 'owner'
    : 'my'

  const [myRequests, setMyRequests] = useState([])
  const [ownerRequests, setOwnerRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [decisionLoadingId, setDecisionLoadingId] =
    useState(null)

  const [rejectRequest, setRejectRequest] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadAccessData = async () => {
      setLoading(true)
      setError('')

      try {
        const [
          myRequestsResponse,
          ownerRequestsResponse,
        ] = await Promise.all([
          api.get('/original-file-requests/my-requests'),
          api.get('/original-file-requests/owner/pending'),
        ])

        if (cancelled) {
          return
        }

        setMyRequests(myRequestsResponse.data)
        setOwnerRequests(ownerRequestsResponse.data)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(
          getApiError(
            loadError,
            'Unable to load original access requests.',
          ),
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAccessData()

    return () => {
      cancelled = true
    }
  }, [])

  const changeTab = (tab) => {
    setMessage('')
    setError('')

    if (tab === 'owner') {
      navigate('/user/owner-approvals')
      return
    }

    navigate('/user/my-requests')
  }

  const handleOwnerDecision = async (
    request,
    decision,
  ) => {
    setDecisionLoadingId(request.id)
    setMessage('')
    setError('')

    try {
      const response = await api.patch(
        `/original-file-requests/${request.id}/owner-decision`,
        {
          decision,
        },
      )

      setOwnerRequests((current) =>
        current.filter(
          (item) => item.id !== request.id,
        ),
      )

      if (decision === 'APPROVE') {
        setMessage(
          `${request.original_filename} approved. The request has been forwarded to the Security Officer for final review.`,
        )
      } else {
        setMessage(
          `${request.original_filename} original access request was rejected.`,
        )
      }

      setRejectRequest(null)

      return response.data
    } catch (decisionError) {
      setError(
        getApiError(
          decisionError,
          'Unable to update the original access request.',
        ),
      )

      return null
    } finally {
      setDecisionLoadingId(null)
    }
  }

  return (
    <>
      <header className="access-page-header">
        <p className="secura-eyebrow">
          SECURE WORKSPACE
        </p>

        <h1>Original access</h1>

        <p>
          Manage your original-file requests and review
          access requests for documents you own.
        </p>
      </header>

      <div className="access-tabs-real">
        <button
          type="button"
          className={
            activeTab === 'my'
              ? 'selected'
              : ''
          }
          onClick={() => changeTab('my')}
        >
          My requests

          <span>{myRequests.length}</span>
        </button>

        <button
          type="button"
          className={
            activeTab === 'owner'
              ? 'selected'
              : ''
          }
          onClick={() => changeTab('owner')}
        >
          Owner approval

          <span>{ownerRequests.length}</span>
        </button>
      </div>

      {message && (
        <div className="access-success-banner">
          <Check size={16} />

          <span>{message}</span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setMessage('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div
          className="access-error-banner"
          role="alert"
        >
          <ShieldCheck size={16} />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setError('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="access-loading">
          <div />
          <div />
          <div />
        </div>
      ) : activeTab === 'my' ? (
        <section className="access-request-list">
          {myRequests.length === 0 ? (
            <div className="access-empty-state">
              <span>
                <Clock3 size={21} />
              </span>

              <b>No original access requests</b>

              <p>
                When you request access to another
                user's original document, its approval
                progress will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate('/user/library')
                }
              >
                Browse anonymized files
              </button>
            </div>
          ) : (
            myRequests.map((request) => {
              const status =
                getStatusDetails(request.status)

              return (
                <article
                  className="access-request-card"
                  key={request.id}
                >
                  <div className="access-request-file">
                    <span>
                      <FileText size={17} />
                    </span>

                    <div>
                      <b>
                        {
                          request.original_filename
                        }
                      </b>

                      <p>
                        Owner:{' '}
                        {request.owner_full_name ||
                          request.owner_username}
                      </p>
                    </div>
                  </div>

                  <div className="access-request-meta">
                    <small>Requested</small>

                    <p>
                      {formatDate(
                        request.requested_at,
                      )}
                    </p>
                  </div>

                  <div className="access-request-meta">
                    <small>Reason</small>

                    <p className="access-reason-preview">
                      {request.reason || '—'}
                    </p>
                  </div>

                  <div className="access-request-status">
                    <small>Current status</small>

                    <span
                      className={`access-status-badge ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </article>
              )
            })
          )}
        </section>
      ) : (
        <section className="access-request-list">
          {ownerRequests.length === 0 ? (
            <div className="access-empty-state">
              <span>
                <UserRound size={21} />
              </span>

              <b>No requests waiting for you</b>

              <p>
                Original-file access requests for
                documents you own will appear here.
              </p>
            </div>
          ) : (
            ownerRequests.map((request) => (
              <article
                className="access-request-card owner-request-card"
                key={request.id}
              >
                <div className="access-request-file">
                  <span>
                    <FileText size={17} />
                  </span>

                  <div>
                    <b>
                      {request.original_filename}
                    </b>

                    <p>
                      Requested by:{' '}
                      {request.requester_full_name ||
                        request.requester_username}
                    </p>
                  </div>
                </div>

                <div className="access-owner-reason">
                  <small>Reason for access</small>

                  <p>
                    {request.reason || 'No reason provided.'}
                  </p>

                  <em>
                    Requested:{' '}
                    {formatDate(request.requested_at)}
                  </em>
                </div>

                <div className="access-owner-actions">
                  <button
                    type="button"
                    className="access-approve-button"
                    disabled={
                      decisionLoadingId === request.id
                    }
                    onClick={() =>
                      handleOwnerDecision(
                        request,
                        'APPROVE',
                      )
                    }
                  >
                    {decisionLoadingId === request.id
                      ? 'Processing...'
                      : 'Approve'}
                  </button>

                  <button
                    type="button"
                    className="access-reject-button"
                    disabled={
                      decisionLoadingId === request.id
                    }
                    onClick={() =>
                      setRejectRequest(request)
                    }
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {rejectRequest && (
        <div
          className="access-modal-backdrop"
          onClick={() =>
            setRejectRequest(null)
          }
        >
          <section
            className="access-confirm-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="access-modal-close"
              aria-label="Close"
              onClick={() =>
                setRejectRequest(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              ORIGINAL ACCESS
            </p>

            <h2>Reject access request?</h2>

            <p className="access-modal-file">
              {rejectRequest.original_filename}
            </p>

            <p className="access-confirm-copy">
              This request will be marked as rejected
              and will not proceed to Security Officer
              review.
            </p>

            <div className="access-modal-actions">
              <button
                type="button"
                className="access-cancel-button"
                onClick={() =>
                  setRejectRequest(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="access-confirm-reject"
                disabled={
                  decisionLoadingId ===
                  rejectRequest.id
                }
                onClick={() =>
                  handleOwnerDecision(
                    rejectRequest,
                    'REJECT',
                  )
                }
              >
                {decisionLoadingId ===
                rejectRequest.id
                  ? 'Rejecting...'
                  : 'Reject request'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default OriginalAccess