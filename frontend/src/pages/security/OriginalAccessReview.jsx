import { useEffect, useState } from 'react'
import {
  Check,
  FileText,
  ScanSearch,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

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

function OriginalAccessReview() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [decisionLoadingId, setDecisionLoadingId] =
    useState(null)

  const [selectedRequest, setSelectedRequest] =
    useState(null)

  const [rejectRequest, setRejectRequest] =
    useState(null)

  useEffect(() => {
    let cancelled = false

    api
      .get('/original-file-requests/security/pending')
      .then((response) => {
        if (!cancelled) {
          setRequests(response.data)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load pending Security Officer reviews.',
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

  const handleDecision = async (
    request,
    decision,
  ) => {
    setDecisionLoadingId(request.id)
    setError('')
    setMessage('')

    try {
      await api.patch(
        `/original-file-requests/${request.id}/security-decision`,
        {
          decision,
        },
      )

      setRequests((current) =>
        current.filter(
          (item) => item.id !== request.id,
        ),
      )

      setSelectedRequest(null)
      setRejectRequest(null)

      if (decision === 'APPROVE') {
        setMessage(
          `${request.original_filename} has received final Security Officer approval.`,
        )
      } else {
        setMessage(
          `${request.original_filename} original access request was rejected.`,
        )
      }
    } catch (decisionError) {
      setError(
        getApiError(
          decisionError,
          'Unable to update the security review.',
        ),
      )
    } finally {
      setDecisionLoadingId(null)
    }
  }

  return (
    <>
      <header className="security-review-header">
        <p className="secura-eyebrow">
          SECURITY WORKSPACE
        </p>

        <h1>Original access review</h1>

        <p>
          Perform the final security review for original-file
          access requests approved by document owners.
        </p>
      </header>

      <section className="security-review-summary">
        <div>
          <span>
            <ScanSearch size={18} />
          </span>

          <div>
            <b>
              {loading ? '—' : requests.length}
            </b>

            <p>Pending security reviews</p>
          </div>
        </div>

        <p>
          Only requests approved by the document owner
          appear in this queue.
        </p>
      </section>

      {message && (
        <div className="security-review-success">
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
        <div className="security-review-error">
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

      {loading ? (
        <div className="security-review-loading">
          <div />
          <div />
        </div>
      ) : requests.length === 0 ? (
        <section className="security-review-empty">
          <span>
            <ShieldCheck size={22} />
          </span>

          <b>No pending security reviews</b>

          <p>
            Requests approved by document owners will
            appear here for final Security Officer review.
          </p>
        </section>
      ) : (
        <section className="security-review-list">
          {requests.map((request) => (
            <article
              key={request.id}
              className="security-review-card"
            >
              <div className="security-review-file">
                <span>
                  <FileText size={17} />
                </span>

                <div>
                  <b>
                    {request.original_filename}
                  </b>

                  <p>
                    Request #{request.id}
                  </p>
                </div>
              </div>

              <div className="security-review-person">
                <small>Requester</small>

                <p>
                  <UserRound size={13} />

                  {request.requester_full_name ||
                    request.requester_username}
                </p>
              </div>

              <div className="security-review-person">
                <small>Document owner</small>

                <p>
                  <UserRound size={13} />

                  {request.owner_full_name ||
                    request.owner_username}
                </p>
              </div>

              <div className="security-review-date">
                <small>Requested</small>

                <p>
                  {formatDate(
                    request.requested_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                className="security-review-open"
                onClick={() =>
                  setSelectedRequest(request)
                }
              >
                Review
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedRequest && (
        <div
          className="security-review-backdrop"
          onClick={() =>
            setSelectedRequest(null)
          }
        >
          <section
            className="security-review-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-review-close"
              onClick={() =>
                setSelectedRequest(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              SECURITY REVIEW
            </p>

            <h2>
              Original access request
            </h2>

            <p className="security-review-modal-file">
              {selectedRequest.original_filename}
            </p>

            <div className="security-review-details">
              <div>
                <small>Requester</small>

                <b>
                  {selectedRequest.requester_full_name ||
                    selectedRequest.requester_username}
                </b>
              </div>

              <div>
                <small>Document owner</small>

                <b>
                  {selectedRequest.owner_full_name ||
                    selectedRequest.owner_username}
                </b>
              </div>

              <div>
                <small>Requested</small>

                <b>
                  {formatDate(
                    selectedRequest.requested_at,
                  )}
                </b>
              </div>

              <div>
                <small>Owner approval</small>

                <b>
                  {formatDate(
                    selectedRequest.owner_reviewed_at,
                  )}
                </b>
              </div>
            </div>

            <div className="security-review-reason">
              <small>
                Reason for original access
              </small>

              <p>
                {selectedRequest.reason ||
                  'No reason provided.'}
              </p>
            </div>

            <div className="security-review-notice">
              <ShieldCheck size={17} />

              <p>
                Approval will allow the requester to
                retrieve the encrypted original through
                Secura's controlled access workflow.
              </p>
            </div>

            <div className="security-review-actions">
              <button
                type="button"
                className="security-review-reject"
                disabled={
                  decisionLoadingId ===
                  selectedRequest.id
                }
                onClick={() => {
                  setRejectRequest(
                    selectedRequest,
                  )

                  setSelectedRequest(null)
                }}
              >
                Reject
              </button>

              <button
                type="button"
                className="security-review-approve"
                disabled={
                  decisionLoadingId ===
                  selectedRequest.id
                }
                onClick={() =>
                  handleDecision(
                    selectedRequest,
                    'APPROVE',
                  )
                }
              >
                {decisionLoadingId ===
                selectedRequest.id
                  ? 'Approving...'
                  : 'Approve access'}
              </button>
            </div>
          </section>
        </div>
      )}

      {rejectRequest && (
        <div
          className="security-review-backdrop"
          onClick={() =>
            setRejectRequest(null)
          }
        >
          <section
            className="security-review-confirm"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-review-close"
              onClick={() =>
                setRejectRequest(null)
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              SECURITY REVIEW
            </p>

            <h2>Reject this request?</h2>

            <p>
              {rejectRequest.original_filename}
            </p>

            <div className="security-review-reject-warning">
              The request will be marked as rejected by
              the Security Officer and original-file access
              will not be granted.
            </div>

            <div className="security-review-actions">
              <button
                type="button"
                className="security-review-cancel"
                onClick={() =>
                  setRejectRequest(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="security-review-confirm-reject"
                disabled={
                  decisionLoadingId ===
                  rejectRequest.id
                }
                onClick={() =>
                  handleDecision(
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

export default OriginalAccessReview