import {
  CheckCircle2,
  Eye,
  FileText,
  Hash,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'

import api from '../../api/client'

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'en-MY',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'en-MY',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function getApiError(error, fallback) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function shortHash(value) {
  if (!value) {
    return 'Unavailable'
  }

  if (value.length <= 22) {
    return value
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function getDisplayStatus(status) {
  if (status === 'APPROVED') {
    return {
      label: 'Approved',
      className: 'approved',
    }
  }

  if (
    status ===
    'REJECTED_BY_SECURITY'
  ) {
    return {
      label: 'Rejected',
      className: 'rejected',
    }
  }

  return {
    label: 'Pending Review',
    className: 'pending',
  }
}

function OriginalAccessReview() {
  const navigate = useNavigate()

  const [requests, setRequests] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [query, setQuery] =
    useState('')

  const [filter, setFilter] =
    useState('ALL')

  const [
    selectedRequestId,
    setSelectedRequestId,
  ] = useState(null)

  const [
    decisionLoadingId,
    setDecisionLoadingId,
  ] = useState(null)

  const [
    confirmDecision,
    setConfirmDecision,
  ] = useState(null)


  const [
    reviewStates,
    setReviewStates,
  ] = useState({})

  const [
    reviewLoadingId,
    setReviewLoadingId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    api
      .get(
        '/original-file-requests/security/reviews',
      )
      .then((response) => {
        if (cancelled) {
          return
        }

        setRequests(
          response.data,
        )

        if (
          response.data.length > 0
        ) {
          setSelectedRequestId(
            response.data[0].id,
          )
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load Security Officer reviews.',
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

  const counts = useMemo(() => {
    const approved =
      requests.filter(
        (request) =>
          request.status ===
          'APPROVED',
      ).length

    const rejected =
      requests.filter(
        (request) =>
          request.status ===
          'REJECTED_BY_SECURITY',
      ).length

    const pending =
      requests.filter(
        (request) =>
          request.status ===
          'PENDING_SECURITY',
      ).length

    return {
      total: requests.length,
      pending,
      approved,
      rejected,
    }
  }, [requests])

  const visibleRequests =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      return requests.filter(
        (request) => {
          const displayStatus =
            getDisplayStatus(
              request.status,
            )

          const matchesFilter =
            filter === 'ALL' ||
            displayStatus.label ===
              filter

          if (!matchesFilter) {
            return false
          }

          if (!normalizedQuery) {
            return true
          }

          return [
            request.id,
            request.requester_username,
            request.requester_full_name,
            request.owner_username,
            request.owner_full_name,
            request.original_filename,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(
              normalizedQuery,
            )
        },
      )
    }, [
      filter,
      query,
      requests,
    ])

  const selectedRequest =
    useMemo(() => {
      const selected =
        visibleRequests.find(
          (request) =>
            request.id ===
            selectedRequestId,
        )

      return (
        selected ||
        visibleRequests[0] ||
        null
      )
    }, [
      selectedRequestId,
      visibleRequests,
    ])


  const selectedReviewRequestId =
    selectedRequest?.id ?? null

  const selectedReviewRequestStatus =
    selectedRequest?.status ?? null

  const selectedReviewState =
    selectedReviewRequestId
      ? reviewStates[
          selectedReviewRequestId
        ]
      : null

  useEffect(() => {
    if (
      !selectedReviewRequestId ||
      selectedReviewRequestStatus !==
        'PENDING_SECURITY'
    ) {
      return undefined
    }

    let cancelled = false

    api
      .get(
        `/original-file-requests/${selectedReviewRequestId}/security-review-status`,
      )
      .then((response) => {
        if (cancelled) {
          return
        }

        setReviewStates(
          (current) => ({
            ...current,
            [selectedReviewRequestId]:
              response.data,
          }),
        )
      })
      .catch((statusError) => {
        if (cancelled) {
          return
        }

        setError(
          getApiError(
            statusError,
            'Unable to check the original-file review status.',
          ),
        )
      })

    return () => {
      cancelled = true
    }
  }, [
    selectedReviewRequestId,
    selectedReviewRequestStatus,
  ])

  const handleReviewOriginal =
    async (request) => {
      setReviewLoadingId(
        request.id,
      )

      setError('')
      setMessage('')

      const currentState =
        reviewStates[request.id]

      const fileType =
        currentState?.file_type
          ?.toLowerCase() || ''

      const previewInline = [
        'pdf',
        'txt',
        'csv',
      ].includes(fileType)

      let previewWindow = null

      if (previewInline) {
        previewWindow =
          window.open(
            'about:blank',
            '_blank',
          )
      }

      try {
        const response =
          await api.get(
            `/original-file-requests/${request.id}/security-review-original`,
            {
              responseType:
                'blob',
            },
          )

        const objectUrl =
          URL.createObjectURL(
            response.data,
          )

        if (previewInline) {
          if (previewWindow) {
            previewWindow.location.href =
              objectUrl
          } else {
            const link =
              document.createElement(
                'a',
              )

            link.href = objectUrl
            link.target = '_blank'
            link.rel =
              'noopener noreferrer'

            document.body.appendChild(
              link,
            )

            link.click()
            link.remove()
          }
        } else {
          const link =
            document.createElement(
              'a',
            )

          link.href = objectUrl
          link.download =
            request.original_filename

          document.body.appendChild(
            link,
          )

          link.click()
          link.remove()
        }

        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              objectUrl,
            )
          },
          60000,
        )

        setReviewStates(
          (current) => ({
            ...current,
            [request.id]: {
              ...(current[
                request.id
              ] || {}),
              review_attempted:
                true,
              reviewed: true,
              review_state:
                'REVIEWED',
              integrity_status:
                'VERIFIED',
              reviewed_at:
                new Date()
                  .toISOString(),
            },
          }),
        )

        setMessage(
          'Original file reviewed successfully. SHA-256 integrity is verified and the final decision is now available.',
        )
      } catch (reviewError) {
        if (previewWindow) {
          previewWindow.close()
        }

        setReviewStates(
          (current) => ({
            ...current,
            [request.id]: {
              ...(current[
                request.id
              ] || {}),
              review_attempted:
                true,
              reviewed: false,
              review_state:
                'FAILED',
              integrity_status:
                'FAILED',
              reviewed_at:
                new Date()
                  .toISOString(),
            },
          }),
        )

        setError(
          getApiError(
            reviewError,
            'Unable to review the original file.',
          ),
        )
      } finally {
        setReviewLoadingId(
          null,
        )
      }
    }

  const handleDecision =
    async (
      request,
      decision,
    ) => {
      setDecisionLoadingId(
        request.id,
      )

      setError('')
      setMessage('')

      try {
        const response =
          await api.patch(
            `/original-file-requests/${request.id}/security-decision`,
            {
              decision,
            },
          )

        setRequests(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                request.id
                  ? response.data
                  : item,
            ),
        )

        if (
          decision ===
          'APPROVE'
        ) {
          setMessage(
            'Original access approved successfully.',
          )
        } else {
          setMessage(
            'Original access request rejected.',
          )
        }

        setConfirmDecision(null)
      } catch (decisionError) {
        setError(
          getApiError(
            decisionError,
            'Unable to update the security review.',
          ),
        )
      } finally {
        setDecisionLoadingId(
          null,
        )
      }
    }

  const canApproveSelected =
    selectedRequest?.status ===
      'PENDING_SECURITY' &&
    selectedReviewState?.reviewed ===
      true &&
    selectedReviewState
      ?.integrity_status ===
      'VERIFIED'

  const canRejectSelected =
    selectedRequest?.status ===
      'PENDING_SECURITY' &&
    selectedReviewState
      ?.review_attempted === true

  const tabs = [
    'ALL',
    'Pending Review',
    'Approved',
    'Rejected',
  ]

  return (
    <>
      <header className="security-review-figma-header">
        <p className="secura-eyebrow">
          SECURITY OFFICER WORKSPACE
        </p>

        <h1>
          Original Access Review
        </h1>

        <p>
          Review owner-approved
          original-file requests and
          make the final Security
          Officer decision.
        </p>
      </header>

      {message && (
        <div className="security-review-figma-success">
          <CheckCircle2
            size={16}
          />

          <span>
            {message}
          </span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() =>
              setMessage('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div
          className="security-review-figma-error"
          role="alert"
        >
          <ShieldAlert
            size={16}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="security-review-figma-summary">
        <article>
          <span>
            Total Requests
          </span>

          <strong>
            {loading
              ? '—'
              : counts.total}
          </strong>
        </article>

        <article>
          <span>
            Pending Review
          </span>

          <strong>
            {loading
              ? '—'
              : counts.pending}
          </strong>
        </article>

        <article>
          <span>
            Approved
          </span>

          <strong>
            {loading
              ? '—'
              : counts.approved}
          </strong>
        </article>

        <article>
          <span>
            Rejected
          </span>

          <strong>
            {loading
              ? '—'
              : counts.rejected}
          </strong>
        </article>
      </section>

      <section className="security-review-figma-workspace">
        <section className="security-review-figma-list-panel">
          <div className="security-review-figma-tools">
            <div className="security-review-figma-search">
              <Search
                size={15}
              />

              <input
                value={query}
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="Search requester or filename"
              />

              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setQuery('')
                  }
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="security-review-figma-tabs">
              {tabs.map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      filter ===
                      item
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setFilter(
                        item,
                      )
                    }
                  >
                    {item ===
                    'ALL'
                      ? 'All'
                      : item}
                  </button>
                ),
              )}
            </div>
          </div>

          {loading ? (
            <div className="security-review-figma-loading">
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : visibleRequests.length ===
            0 ? (
            <div className="security-review-figma-empty">
              <span>
                <ShieldCheck
                  size={23}
                />
              </span>

              <b>
                No pending original
                access reviews.
              </b>

              <p>
                New owner-approved
                requests will appear
                here when they require
                Security Officer
                review.
              </p>
            </div>
          ) : (
            <div className="security-review-figma-table-wrap">
              <div className="security-review-figma-table">
                <div className="security-review-figma-row security-review-figma-heading">
                  <span>
                    Request ID
                  </span>

                  <span>
                    Requester
                  </span>

                  <span>
                    Owner
                  </span>

                  <span>File</span>

                  <span>
                    Submitted
                  </span>

                  <span>
                    Status
                  </span>
                </div>

                {visibleRequests.map(
                  (
                    request,
                    index,
                  ) => {
                    const status =
                      getDisplayStatus(
                        request.status,
                      )

                    return (
                      <button
                        type="button"
                        key={
                          request.id
                        }
                        className={[
                          'security-review-figma-row',
                          'security-review-figma-data-row',
                          selectedRequest
                            ?.id ===
                          request.id
                            ? 'selected'
                            : '',
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(' ')}
                        style={{
                          '--security-review-row-delay':
                            `${Math.min(index, 8) * 40}ms`,
                        }}
                        onClick={() =>
                          setSelectedRequestId(
                            request.id,
                          )
                        }
                      >
                        <b>
                          REQ-
                          {
                            request.id
                          }
                        </b>

                        <span>
                          {request.requester_full_name ||
                            request.requester_username}
                        </span>

                        <span>
                          {request.owner_full_name ||
                            request.owner_username}
                        </span>

                        <span className="security-review-figma-file">
                          {
                            request.original_filename
                          }
                        </span>

                        <span>
                          {formatDate(
                            request.requested_at,
                          )}
                        </span>

                        <span>
                          <em
                            className={`security-review-figma-status ${status.className}`}
                          >
                            {
                              status.label
                            }
                          </em>
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          )}

        </section>

        <aside className="security-review-figma-detail-panel">
          {selectedRequest ? (
            <div
              key={
                selectedRequest.id
              }
              className="security-review-figma-detail-content"
            >
              <p className="secura-eyebrow">
                REQUEST DETAILS
              </p>

              <div className="security-review-figma-detail-title">
                <h2>
                  REQ-
                  {
                    selectedRequest.id
                  }
                </h2>

                <em
                  className={`security-review-figma-status ${
                    getDisplayStatus(
                      selectedRequest.status,
                    ).className
                  }`}
                >
                  {
                    getDisplayStatus(
                      selectedRequest.status,
                    ).label
                  }
                </em>
              </div>

              <dl className="security-review-figma-detail-list">
                <div>
                  <dt>
                    Requester
                  </dt>

                  <dd>
                    {selectedRequest.requester_full_name ||
                      selectedRequest.requester_username}
                  </dd>
                </div>

                <div>
                  <dt>
                    Document owner
                  </dt>

                  <dd>
                    {selectedRequest.owner_full_name ||
                      selectedRequest.owner_username}
                  </dd>
                </div>

                <div>
                  <dt>
                    Requested file
                  </dt>

                  <dd>
                    {
                      selectedRequest.original_filename
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Reason for access
                  </dt>

                  <dd>
                    {selectedRequest.reason ||
                      'No reason provided.'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Submitted
                  </dt>

                  <dd>
                    {formatDateTime(
                      selectedRequest.requested_at,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Owner approval
                  </dt>

                  <dd>
                    <span className="security-review-figma-owner-approved">
                      Approved
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>
                    Owner approved
                    at
                  </dt>

                  <dd>
                    {formatDateTime(
                      selectedRequest.owner_reviewed_at,
                    )}
                  </dd>
                </div>
              </dl>

              {selectedRequest.status ===
                'PENDING_SECURITY' && (
                <section className="security-review-file-inspection">
                  <div className="security-review-file-inspection-heading">
                    <span>
                      <ShieldCheck
                        size={18}
                      />
                    </span>

                    <div>
                      <p className="secura-eyebrow">
                        ORIGINAL FILE SECURITY
                      </p>

                      <h3>
                        Review original before decision
                      </h3>
                    </div>

                    <em
                      className={`security-review-integrity-badge ${
                        !selectedReviewState
                          ? 'checking'
                          : selectedReviewState.integrity_status ===
                              'VERIFIED'
                            ? 'verified'
                            : 'failed'
                      }`}
                    >
                      {!selectedReviewState
                        ? 'Checking...'
                        : selectedReviewState.integrity_status ===
                            'VERIFIED'
                          ? 'Integrity verified'
                          : 'Integrity failed'}
                    </em>
                  </div>

                  <div className="security-review-file-inspection-grid">
                    <div>
                      <small>
                        Stored SHA-256
                      </small>

                      <code
                        title={
                          selectedReviewState?.original_sha256 ||
                          ''
                        }
                      >
                        {shortHash(
                          selectedReviewState?.original_sha256,
                        )}
                      </code>
                    </div>

                    <div>
                      <small>
                        Current SHA-256
                      </small>

                      <code
                        title={
                          selectedReviewState?.current_sha256 ||
                          ''
                        }
                      >
                        {shortHash(
                          selectedReviewState?.current_sha256,
                        )}
                      </code>
                    </div>
                  </div>

                  <div className="security-review-file-inspection-state">
                    <div>
                      <Hash
                        size={15}
                      />

                      <span>
                        {!selectedReviewState
                          ? 'Checking file integrity and previous review state...'
                          : selectedReviewState.reviewed
                            ? `Reviewed ${formatDateTime(
                                selectedReviewState.reviewed_at,
                              )}`
                            : selectedReviewState.review_attempted
                              ? 'Review attempted, but the file did not pass verification.'
                              : 'File review is required before Approve or Reject is unlocked.'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="security-review-open-original"
                      disabled={
                        reviewLoadingId ===
                        selectedRequest.id
                      }
                      onClick={() =>
                        handleReviewOriginal(
                          selectedRequest,
                        )
                      }
                    >
                      <Eye
                        size={15}
                      />

                      {reviewLoadingId ===
                      selectedRequest.id
                        ? 'Opening secure original...'
                        : selectedReviewState?.reviewed
                          ? 'Review original again'
                          : selectedReviewState?.review_attempted
                            ? 'Retry original review'
                            : 'Review original file'}
                    </button>
                  </div>

                  <p className="security-review-file-inspection-note">
                    PDF, TXT and CSV open for secure browser review. DOCX and XLSX are downloaded for local review. The backend decrypts in memory, verifies SHA-256, and records the review in the audit log.
                  </p>
                </section>
              )}

              <button
                type="button"
                className="security-review-related-link"
                onClick={() =>
                  navigate(
                    '/security/logs',
                  )
                }
              >
                View related security
                activity →
              </button>

              {selectedRequest.status ===
                'PENDING_SECURITY' && (
                <>
                  <p
                    className={`security-review-decision-lock ${
                      canApproveSelected
                        ? 'unlocked'
                        : selectedReviewState?.review_attempted
                          ? 'partial'
                          : 'locked'
                    }`}
                  >
                    {canApproveSelected
                      ? 'Original reviewed and verified. Final decision is unlocked.'
                      : canRejectSelected
                        ? 'Integrity review failed. Approval is blocked, but the request can be rejected.'
                        : 'Review the original file before making the final security decision.'}
                  </p>

                  <div className="security-review-figma-actions">
                    <button
                      type="button"
                      className="security-review-figma-approve"
                      disabled={
                        !canApproveSelected
                      }
                      onClick={() =>
                        setConfirmDecision(
                          {
                            request:
                              selectedRequest,
                            decision:
                              'APPROVE',
                          },
                        )
                      }
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      className="security-review-figma-reject"
                      disabled={
                        !canRejectSelected
                      }
                      onClick={() =>
                        setConfirmDecision(
                          {
                            request:
                              selectedRequest,
                            decision:
                              'REJECT',
                          },
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="security-review-figma-detail-empty">
              <span>
                <FileText
                  size={22}
                />
              </span>

              <b>
                Select a request
              </b>

              <p>
                Request details will
                appear here.
              </p>
            </div>
          )}
        </aside>
      </section>

      {confirmDecision && (
        <div
          className="security-review-figma-backdrop"
          onClick={() =>
            setConfirmDecision(
              null,
            )
          }
        >
          <section
            className="security-review-figma-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="security-review-figma-modal-close"
              aria-label="Close"
              onClick={() =>
                setConfirmDecision(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              ORIGINAL ACCESS REVIEW
            </p>

            {confirmDecision.decision ===
            'APPROVE' ? (
              <>
                <div className="security-review-figma-modal-icon approve">
                  <CheckCircle2
                    size={22}
                  />
                </div>

                <h2>
                  Approve original
                  access
                </h2>

                <p>
                  This will grant the
                  requester approved
                  access to the original
                  file. The action will
                  be recorded in the
                  audit log.
                </p>
              </>
            ) : (
              <>
                <div className="security-review-figma-modal-icon reject">
                  <ShieldAlert
                    size={22}
                  />
                </div>

                <h2>
                  Reject original
                  access
                </h2>

                <p>
                  This request will be
                  rejected by the
                  Security Officer and
                  original-file access
                  will not be granted.
                </p>
              </>
            )}

            <div className="security-review-figma-modal-file">
              <FileText
                size={15}
              />

              <span>
                {
                  confirmDecision.request
                    .original_filename
                }
              </span>
            </div>

            <div className="security-review-figma-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setConfirmDecision(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmDecision.decision ===
                  'APPROVE'
                    ? 'approve'
                    : 'reject'
                }
                disabled={
                  decisionLoadingId ===
                  confirmDecision
                    .request.id
                }
                onClick={() =>
                  handleDecision(
                    confirmDecision.request,
                    confirmDecision.decision,
                  )
                }
              >
                {decisionLoadingId ===
                confirmDecision
                  .request.id
                  ? 'Processing...'
                  : confirmDecision.decision ===
                      'APPROVE'
                    ? 'Approve access'
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
