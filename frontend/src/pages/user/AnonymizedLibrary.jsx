import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'

import api from '../../api/client'

const ACTIVE_REQUEST_STATUSES = new Set([
  'PENDING_OWNER',
  'PENDING_SECURITY',
])

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  }).format(date)
}

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function getFileIcon(type) {
  if (type === 'xlsx' || type === 'csv') {
    return FileSpreadsheet
  }

  return FileText
}

function AnonymizedLibrary() {
  const [myFiles, setMyFiles] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [myRequests, setMyRequests] = useState([])

  const [activeTab, setActiveTab] = useState('all')
  const [query, setQuery] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [requestFile, setRequestFile] = useState(null)
  const [reason, setReason] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestSuccess, setRequestSuccess] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    const loadLibrary = async () => {
      setLoading(true)
      setError('')

      try {
        const [
          myFilesResponse,
          sharedFilesResponse,
          myRequestsResponse,
        ] = await Promise.all([
          api.get('/document-library/my-anonymized'),
          api.get('/document-library/shared-with-me'),
          api.get('/original-file-requests/my-requests'),
        ])

        if (cancelled) {
          return
        }

        setMyFiles(myFilesResponse.data)
        setSharedFiles(sharedFilesResponse.data)
        setMyRequests(myRequestsResponse.data)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(
          getApiError(
            loadError,
            'Unable to load the anonymized file library.',
          ),
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLibrary()

    return () => {
      cancelled = true
    }
  }, [])

  const activeRequestDocumentIds = useMemo(
    () =>
      new Set(
        myRequests
          .filter((request) =>
            ACTIVE_REQUEST_STATUSES.has(
              request.status,
            ),
          )
          .map((request) => request.document_id),
      ),
    [myRequests],
  )

  const allFiles = useMemo(() => {
    const mappedMyFiles = myFiles.map((file) => ({
      ...file,
      libraryGroup: 'my',
    }))

    const ownIds = new Set(
      mappedMyFiles.map((file) => file.id),
    )

    const mappedSharedFiles = sharedFiles
      .filter((file) => !ownIds.has(file.id))
      .map((file) => ({
        ...file,
        libraryGroup: 'department',
      }))

    return [...mappedMyFiles, ...mappedSharedFiles]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      )
  }, [myFiles, sharedFiles])

  const visibleFiles = useMemo(() => {
    let files = allFiles

    if (activeTab === 'my') {
      files = allFiles.filter(
        (file) => file.libraryGroup === 'my',
      )
    }

    if (activeTab === 'department') {
      files = allFiles.filter(
        (file) =>
          file.libraryGroup === 'department',
      )
    }

    const normalizedQuery = query
      .trim()
      .toLowerCase()

    if (!normalizedQuery) {
      return files
    }

    return files.filter((file) =>
      [
        file.original_filename,
        file.owner_username,
        file.file_type,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [activeTab, allFiles, query])

  const handleDownload = async (file) => {
    setError('')

    try {
      const response = await api.get(
        `/document-library/${file.id}/download-anonymized`,
        {
          responseType: 'blob',
        },
      )

      const objectUrl = URL.createObjectURL(
        response.data,
      )

      const link =
        document.createElement('a')

      link.href = objectUrl
      link.download =
        `anonymized_${file.original_filename}`

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(objectUrl)
    } catch (downloadError) {
      setError(
        getApiError(
          downloadError,
          'Unable to download the anonymized document.',
        ),
      )
    }
  }

  const openRequestModal = (file) => {
    setRequestFile(file)
    setReason('')
    setRequestSuccess(false)
    setError('')
  }

  const closeRequestModal = () => {
    if (requesting) {
      return
    }

    setRequestFile(null)
    setReason('')
    setRequestSuccess(false)
  }

  const submitOriginalRequest = async () => {
    const trimmedReason = reason.trim()

    if (!requestFile || !trimmedReason) {
      return
    }

    setRequesting(true)
    setError('')

    try {
      const response = await api.post(
        `/original-file-requests/${requestFile.id}`,
        {
          reason: trimmedReason,
        },
      )

      setMyRequests((current) => [
        response.data,
        ...current,
      ])

      setRequestSuccess(true)
    } catch (requestError) {
      setError(
        getApiError(
          requestError,
          'Unable to submit the original access request.',
        ),
      )
    } finally {
      setRequesting(false)
    }
  }

  return (
    <>
      <header className="library-page-header">
        <p className="secura-eyebrow">
          SECURE WORKSPACE
        </p>

        <h1>Anonymized file library</h1>

        <p>
          Access your anonymized files and files shared
          with your department.
        </p>
      </header>

      {error && (
        <div
          className="library-error"
          role="alert"
        >
          <ShieldCheck size={17} />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError('')}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="library-card">
        <div className="library-tabs-real">
          <button
            type="button"
            className={
              activeTab === 'all'
                ? 'selected'
                : ''
            }
            onClick={() => setActiveTab('all')}
          >
            All files
            <span>{allFiles.length}</span>
          </button>

          <button
            type="button"
            className={
              activeTab === 'my'
                ? 'selected'
                : ''
            }
            onClick={() => setActiveTab('my')}
          >
            My files
            <span>{myFiles.length}</span>
          </button>

          <button
            type="button"
            className={
              activeTab === 'department'
                ? 'selected'
                : ''
            }
            onClick={() =>
              setActiveTab('department')
            }
          >
            Department shared
            <span>
              {
                allFiles.filter(
                  (file) =>
                    file.libraryGroup ===
                    'department',
                ).length
              }
            </span>
          </button>
        </div>

        <div className="library-toolbar-real">
          <div className="library-search-real">
            <Search size={15} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search filename or owner"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="library-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleFiles.length === 0 ? (
          <div className="library-empty-state">
            <span>
              <FileText size={21} />
            </span>

            <b>
              {query
                ? 'No matching files'
                : 'No anonymized files yet'}
            </b>

            <p>
              {query
                ? 'Try adjusting your search or file filter.'
                : activeTab === 'department'
                  ? 'Anonymized files shared with your department will appear here.'
                  : 'Anonymized documents will appear here after processing.'}
            </p>
          </div>
        ) : (
          <div className="library-table-wrap">
            <div className="library-table-real">
              <div className="library-row-real library-heading-real">
                <span>File</span>
                <span>Owner</span>
                <span>Access</span>
                <span>Date</span>
                <span>Action</span>
              </div>

              {visibleFiles.map((file) => {
                const FileIcon =
                  getFileIcon(file.file_type)

                const isOwn =
                  file.libraryGroup === 'my'

                const hasActiveRequest =
                  activeRequestDocumentIds.has(
                    file.id,
                  )

                return (
                  <div
                    className="library-row-real"
                    key={`${file.libraryGroup}-${file.id}`}
                  >
                    <div className="library-file-real">
                      <span
                        className={`library-file-icon-real ${file.file_type}`}
                      >
                        <FileIcon size={16} />
                      </span>

                      <div>
                        <b>
                          {
                            file.original_filename
                          }
                        </b>

                        <small>
                          {file.file_type.toUpperCase()}
                          {' · '}
                          {formatBytes(
                            file.file_size,
                          )}
                        </small>
                      </div>
                    </div>

                    <span className="library-owner">
                      {isOwn
                        ? 'You'
                        : file.owner_username}
                    </span>

                    <span>
                      <em
                        className={
                          isOwn
                            ? file.is_private
                              ? 'library-access-private'
                              : 'library-access-shared'
                            : 'library-access-department'
                        }
                      >
                        {isOwn
                          ? file.is_private
                            ? 'Private'
                            : 'Shared'
                          : 'Department shared'}
                      </em>
                    </span>

                    <span className="library-date">
                      {formatDate(
                        file.created_at,
                      )}
                    </span>

                    <div className="library-actions-real">
                      <button
                        type="button"
                        className="library-download-button"
                        onClick={() =>
                          handleDownload(file)
                        }
                      >
                        <Download size={14} />
                        Download
                      </button>

                      {!isOwn && (
                        <button
                          type="button"
                          className="library-request-button"
                          disabled={
                            hasActiveRequest
                          }
                          onClick={() =>
                            openRequestModal(
                              file,
                            )
                          }
                        >
                          {hasActiveRequest
                            ? 'Request pending'
                            : 'Request original'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {requestFile && (
        <div
          className="library-modal-backdrop"
          onClick={closeRequestModal}
        >
          <section
            className="library-request-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={closeRequestModal}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {requestSuccess ? (
              <div className="library-request-success">
                <span>
                  <CheckCircle2 size={22} />
                </span>

                <h2>Request submitted</h2>

                <p>
                  Your request for{' '}
                  <b>
                    {
                      requestFile.original_filename
                    }
                  </b>{' '}
                  has been sent to the document
                  owner for review.
                </p>

                <button
                  type="button"
                  className="library-primary-button"
                  onClick={closeRequestModal}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="secura-eyebrow">
                  ORIGINAL ACCESS
                </p>

                <h2>
                  Request original file
                </h2>

                <p className="library-modal-file">
                  {
                    requestFile.original_filename
                  }
                </p>

                <label>
                  Reason for access

                  <textarea
                    value={reason}
                    maxLength={500}
                    onChange={(event) =>
                      setReason(
                        event.target.value,
                      )
                    }
                    placeholder="Explain why you need access to the original file..."
                  />
                </label>

                <div className="library-reason-count">
                  {reason.length}/500
                </div>

                <p className="library-access-note">
                  <ShieldCheck size={15} />

                  Original file access requires
                  approval from the document owner
                  and a Security Officer.
                </p>

                <div className="library-modal-actions">
                  <button
                    type="button"
                    className="library-cancel-button"
                    onClick={
                      closeRequestModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="library-primary-compact"
                    disabled={
                      requesting ||
                      !reason.trim()
                    }
                    onClick={
                      submitOriginalRequest
                    }
                  >
                    {requesting
                      ? 'Submitting...'
                      : 'Submit request'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}

export default AnonymizedLibrary