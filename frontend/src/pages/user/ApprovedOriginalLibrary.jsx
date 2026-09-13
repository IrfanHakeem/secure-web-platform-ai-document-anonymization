import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Hash,
  Search,
  ShieldAlert,
  ShieldCheck,
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

  if (value.length <= 18) {
    return value
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function ApprovedOriginalLibrary() {
  const [records, setRecords] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [query, setQuery] =
    useState('')

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState(null)

  const [
    downloadingId,
    setDownloadingId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    api
      .get('/approved-original-access')
      .then((response) => {
        if (!cancelled) {
          setRecords(
            response.data,
          )
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load approved original files.',
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

  const visibleRecords =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      if (!normalizedQuery) {
        return records
      }

      return records.filter(
        (record) =>
          [
            record.original_filename,
            record.owner_username,
            record.security_officer_username,
            record.integrity_status,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(
              normalizedQuery,
            ),
      )
    }, [query, records])

  const verifiedCount =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.integrity_status ===
            'VERIFIED',
        ).length,
      [records],
    )

  const failedCount =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.integrity_status ===
            'FAILED',
        ).length,
      [records],
    )

  const handleDownload =
    async (record) => {
      if (
        record.integrity_status !==
        'VERIFIED'
      ) {
        setError(
          'Original file download is blocked because the integrity check failed.',
        )

        return
      }

      setDownloadingId(
        record.request_id,
      )

      setError('')

      try {
        const response =
          await api.get(
            `/original-file-requests/${record.request_id}/download-original`,
            {
              responseType:
                'blob',
            },
          )

        const objectUrl =
          URL.createObjectURL(
            response.data,
          )

        const link =
          document.createElement(
            'a',
          )

        link.href = objectUrl

        link.download =
          record.original_filename

        document.body.appendChild(
          link,
        )

        link.click()
        link.remove()

        URL.revokeObjectURL(
          objectUrl,
        )
      } catch (downloadError) {
        setError(
          getApiError(
            downloadError,
            'Unable to download the approved original file.',
          ),
        )
      } finally {
        setDownloadingId(null)
      }
    }

  return (
    <>
      <header className="approved-library-header">
        <p className="secura-eyebrow">
          SECURE WORKSPACE
        </p>

        <h1>
          Approval file library
        </h1>

        <p>
          Access original documents
          that have completed both
          owner and Security Officer
          approval.
        </p>
      </header>

      <section className="approved-library-summary">
        <article>
          <span className="approved-summary-icon">
            <FileCheck2
              size={19}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : records.length}
            </b>

            <p>
              Approved originals
            </p>
          </div>
        </article>

        <article>
          <span className="approved-summary-icon verified">
            <ShieldCheck
              size={19}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : verifiedCount}
            </b>

            <p>
              Integrity verified
            </p>
          </div>
        </article>

        <article>
          <span className="approved-summary-icon failed">
            <ShieldAlert
              size={19}
            />
          </span>

          <div>
            <b>
              {loading
                ? '—'
                : failedCount}
            </b>

            <p>
              Integrity failed
            </p>
          </div>
        </article>
      </section>

      {error && (
        <div
          className="approved-library-error"
          role="alert"
        >
          <ShieldAlert
            size={16}
          />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="approved-library-card">
        <div className="approved-library-toolbar">
          <div className="approved-library-toolbar-copy">
            <span>
              <ShieldCheck
                size={16}
              />
            </span>

            <div>
              <b>
                Fully approved access
              </b>

              <small>
                Only requests approved
                by both review stages
                appear here.
              </small>
            </div>
          </div>

          <div className="approved-library-search">
            <Search size={15} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search approved files"
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
        </div>

        {loading ? (
          <div className="approved-library-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleRecords.length ===
          0 ? (
          <div className="approved-library-empty">
            <span>
              <FileCheck2
                size={24}
              />
            </span>

            <b>
              {query
                ? 'No matching approved files'
                : 'No approved original files yet'}
            </b>

            <p>
              {query
                ? 'Try adjusting your search.'
                : 'Files will appear here after both the document owner and Security Officer approve your request.'}
            </p>
          </div>
        ) : (
          <div className="approved-library-table-wrap">
            <div className="approved-library-table">
              <div className="approved-library-row approved-library-heading">
                <span>File</span>
                <span>Owner</span>
                <span>
                  Security Officer
                </span>
                <span>Integrity</span>
                <span>
                  Final approval
                </span>
                <span>Action</span>
              </div>

              {visibleRecords.map(
                (
                  record,
                  index,
                ) => {
                  const verified =
                    record.integrity_status ===
                    'VERIFIED'

                  return (
                    <div
                      className="approved-library-row approved-library-animated-row"
                      style={{
                        '--approved-row-delay':
                          `${Math.min(index, 8) * 45}ms`,
                      }}
                      key={
                        record.request_id
                      }
                    >
                      <div className="approved-file-cell">
                        <span>
                          <FileText
                            size={16}
                          />
                        </span>

                        <div>
                          <b>
                            {
                              record.original_filename
                            }
                          </b>

                          <small>
                            Request #
                            {
                              record.request_id
                            }
                          </small>
                        </div>
                      </div>

                      <span className="approved-library-muted">
                        {
                          record.owner_username
                        }
                      </span>

                      <span className="approved-library-muted">
                        {record.security_officer_username ||
                          '—'}
                      </span>

                      <span
                        className={
                          verified
                            ? 'approved-integrity verified'
                            : 'approved-integrity failed'
                        }
                      >
                        {verified ? (
                          <CheckCircle2
                            size={13}
                          />
                        ) : (
                          <ShieldAlert
                            size={13}
                          />
                        )}

                        {
                          record.integrity_status
                        }
                      </span>

                      <span className="approved-library-muted">
                        {formatDate(
                          record.security_reviewed_at,
                        )}
                      </span>

                      <div className="approved-library-actions">
                        <button
                          type="button"
                          className="approved-details-button"
                          onClick={() =>
                            setSelectedRecord(
                              record,
                            )
                          }
                        >
                          Details
                        </button>

                        <button
                          type="button"
                          className="approved-download-button"
                          disabled={
                            !verified ||
                            downloadingId ===
                              record.request_id
                          }
                          onClick={() =>
                            handleDownload(
                              record,
                            )
                          }
                        >
                          <Download
                            size={13}
                          />

                          {downloadingId ===
                          record.request_id
                            ? 'Downloading...'
                            : 'Download original'}
                        </button>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </div>
        )}
      </section>

      {selectedRecord && (
        <div
          className="approved-details-backdrop"
          onClick={() =>
            setSelectedRecord(null)
          }
        >
          <section
            className="approved-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="approved-details-close"
              aria-label="Close"
              onClick={() =>
                setSelectedRecord(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              ORIGINAL FILE ACCESS
            </p>

            <h2>
              Approved original
              details
            </h2>

            <p className="approved-details-filename">
              {
                selectedRecord.original_filename
              }
            </p>

            <div className="approved-details-status">
              <span
                className={
                  selectedRecord.integrity_status ===
                  'VERIFIED'
                    ? 'verified'
                    : 'failed'
                }
              >
                {selectedRecord.integrity_status ===
                'VERIFIED' ? (
                  <ShieldCheck
                    size={17}
                  />
                ) : (
                  <ShieldAlert
                    size={17}
                  />
                )}

                Integrity{' '}
                {
                  selectedRecord.integrity_status
                }
              </span>
            </div>

            <div className="approved-details-flow">
              <div>
                <span>
                  <CheckCircle2
                    size={14}
                  />
                </span>

                <div>
                  <b>
                    Owner approved
                  </b>

                  <small>
                    {formatDate(
                      selectedRecord.owner_reviewed_at,
                    )}
                  </small>
                </div>
              </div>

              <i />

              <div>
                <span>
                  <ShieldCheck
                    size={14}
                  />
                </span>

                <div>
                  <b>
                    Security approved
                  </b>

                  <small>
                    {formatDate(
                      selectedRecord.security_reviewed_at,
                    )}
                  </small>
                </div>
              </div>

              <i />

              <div>
                <span>
                  <Hash size={14} />
                </span>

                <div>
                  <b>
                    Integrity checked
                  </b>

                  <small>
                    {
                      selectedRecord.integrity_status
                    }
                  </small>
                </div>
              </div>
            </div>

            <div className="approved-details-grid">
              <div>
                <small>
                  Document owner
                </small>

                <b>
                  {
                    selectedRecord.owner_username
                  }
                </b>
              </div>

              <div>
                <small>
                  Security Officer
                </small>

                <b>
                  {selectedRecord.security_officer_username ||
                    '—'}
                </b>
              </div>
            </div>

            <div className="approved-hash-section">
              <div>
                <small>
                  Original SHA-256
                </small>

                <code>
                  {
                    selectedRecord.original_sha256
                  }
                </code>
              </div>

              <div>
                <small>
                  Current SHA-256
                </small>

                <code>
                  {selectedRecord.current_sha256 ||
                    'Unavailable'}
                </code>
              </div>
            </div>

            <div className="approved-hash-comparison">
              <ShieldCheck
                size={16}
              />

              <p>
                Stored hash:{' '}
                <b>
                  {shortHash(
                    selectedRecord.original_sha256,
                  )}
                </b>

                <br />

                Current hash:{' '}
                <b>
                  {shortHash(
                    selectedRecord.current_sha256,
                  )}
                </b>
              </p>
            </div>

            <button
              type="button"
              className="approved-modal-download"
              disabled={
                selectedRecord.integrity_status !==
                  'VERIFIED' ||
                downloadingId ===
                  selectedRecord.request_id
              }
              onClick={() =>
                handleDownload(
                  selectedRecord,
                )
              }
            >
              <Download
                size={15}
              />

              {downloadingId ===
              selectedRecord.request_id
                ? 'Downloading...'
                : 'Download original file'}
            </button>
          </section>
        </div>
      )}
    </>
  )
}

export default ApprovedOriginalLibrary
