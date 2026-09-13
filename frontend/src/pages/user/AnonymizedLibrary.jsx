import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Files,
  FileText,
  LockKeyhole,
  MoreVertical,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function getFileIcon(type) {
  if (
    type === 'xlsx' ||
    type === 'csv'
  ) {
    return FileSpreadsheet
  }

  return FileText
}

function AnonymizedLibrary() {
  const navigate = useNavigate()

  const [myFiles, setMyFiles] =
    useState([])

  const [sharedFiles, setSharedFiles] =
    useState([])

  const [archivedFiles, setArchivedFiles] =
    useState([])

  const [myRequests, setMyRequests] =
    useState([])

  const [departments, setDepartments] =
    useState([])

  const [activeTab, setActiveTab] =
    useState('all')

  const [query, setQuery] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    requestFile,
    setRequestFile,
  ] = useState(null)

  const [reason, setReason] =
    useState('')

  const [
    requesting,
    setRequesting,
  ] = useState(false)

  const [
    requestSuccess,
    setRequestSuccess,
  ] = useState(false)

  const [
    accessFile,
    setAccessFile,
  ] = useState(null)

  const [
    accessLoading,
    setAccessLoading,
  ] = useState(false)

  const [
    accessSaving,
    setAccessSaving,
  ] = useState(false)

  const [
    accessDepartmentIds,
    setAccessDepartmentIds,
  ] = useState([])

  const [
    originalAccessDepartmentIds,
    setOriginalAccessDepartmentIds,
  ] = useState([])

  const [
    accessError,
    setAccessError,
  ] = useState('')

  const [
    accessSuccess,
    setAccessSuccess,
  ] = useState('')

  const [
    rowMenuFileId,
    setRowMenuFileId,
  ] = useState(null)

  const [
    archiveFile,
    setArchiveFile,
  ] = useState(null)

  const [
    archiving,
    setArchiving,
  ] = useState(false)

  const [
    archiveError,
    setArchiveError,
  ] = useState('')

  const [
    archiveSuccess,
    setArchiveSuccess,
  ] = useState('')

  const [
    restoringFileId,
    setRestoringFileId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadLibrary = async () => {
      setLoading(true)
      setError('')

      try {
        const [
          myFilesResponse,
          sharedFilesResponse,
          archivedFilesResponse,
          myRequestsResponse,
          departmentsResponse,
        ] = await Promise.all([
          api.get(
            '/document-library/my-anonymized',
          ),
          api.get(
            '/document-library/shared-with-me',
          ),
          api.get(
            '/document-library/archived',
          ),
          api.get(
            '/original-file-requests/my-requests',
          ),
          api.get('/departments'),
        ])

        if (cancelled) {
          return
        }

        setMyFiles(
          myFilesResponse.data,
        )

        setSharedFiles(
          sharedFilesResponse.data,
        )

        setArchivedFiles(
          archivedFilesResponse.data,
        )

        setMyRequests(
          myRequestsResponse.data,
        )

        setDepartments(
          departmentsResponse.data,
        )
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

  const activeRequestDocumentIds =
    useMemo(
      () =>
        new Set(
          myRequests
            .filter((request) =>
              ACTIVE_REQUEST_STATUSES.has(
                request.status,
              ),
            )
            .map(
              (request) =>
                request.document_id,
            ),
        ),
      [myRequests],
    )

  const approvedRequestDocumentIds =
    useMemo(
      () =>
        new Set(
          myRequests
            .filter(
              (request) =>
                request.status ===
                'APPROVED',
            )
            .map(
              (request) =>
                request.document_id,
            ),
        ),
      [myRequests],
    )

  const allFiles = useMemo(() => {
    const mappedMyFiles =
      myFiles.map((file) => ({
        ...file,
        libraryGroup: 'my',
      }))

    const ownIds = new Set(
      mappedMyFiles.map(
        (file) => file.id,
      ),
    )

    const mappedSharedFiles =
      sharedFiles
        .filter(
          (file) =>
            !ownIds.has(file.id),
        )
        .map((file) => ({
          ...file,
          libraryGroup:
            'department',
        }))

    return [
      ...mappedMyFiles,
      ...mappedSharedFiles,
    ].sort(
      (a, b) =>
        new Date(
          b.created_at,
        ).getTime() -
        new Date(
          a.created_at,
        ).getTime(),
    )
  }, [myFiles, sharedFiles])

  const departmentSharedCount =
    useMemo(
      () =>
        allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'department',
        ).length,
      [allFiles],
    )

  const privateFileCount =
    useMemo(
      () =>
        myFiles.filter(
          (file) =>
            file.is_private,
        ).length,
      [myFiles],
    )

  const sharedByMeCount =
    useMemo(
      () =>
        myFiles.filter(
          (file) =>
            !file.is_private,
        ).length,
      [myFiles],
    )

  const visibleFiles =
    useMemo(() => {
      let files = allFiles

      if (activeTab === 'my') {
        files = allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'my',
        )
      }

      if (
        activeTab ===
        'department'
      ) {
        files = allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'department',
        )
      }

      if (
        activeTab ===
        'archived'
      ) {
        files =
          archivedFiles.map(
            (file) => ({
              ...file,
              libraryGroup:
                'archived',
            }),
          )
      }

      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      if (!normalizedQuery) {
        return files
      }

      return files.filter(
        (file) =>
          [
            file.original_filename,
            file.owner_username,
            file.file_type,
          ]
            .join(' ')
            .toLowerCase()
            .includes(
              normalizedQuery,
            ),
      )
    }, [
      activeTab,
      allFiles,
      archivedFiles,
      query,
    ])

  const refreshFileLists =
    async () => {
      const [
        myFilesResponse,
        sharedFilesResponse,
        archivedFilesResponse,
      ] = await Promise.all([
        api.get(
          '/document-library/my-anonymized',
        ),
        api.get(
          '/document-library/shared-with-me',
        ),
        api.get(
          '/document-library/archived',
        ),
      ])

      setMyFiles(
        myFilesResponse.data,
      )

      setSharedFiles(
        sharedFilesResponse.data,
      )

      setArchivedFiles(
        archivedFilesResponse.data,
      )
    }

  const handleDownload =
    async (file) => {
      setError('')

      try {
        const response =
          await api.get(
            `/document-library/${file.id}/download-anonymized`,
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
          `anonymized_${file.original_filename}`

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
            'Unable to download the anonymized document.',
          ),
        )
      }
    }

  const openRequestModal = (
    file,
  ) => {
    setRequestFile(file)
    setReason('')
    setRequestSuccess(false)
    setError('')
  }

  const closeRequestModal =
    () => {
      if (requesting) {
        return
      }

      setRequestFile(null)
      setReason('')
      setRequestSuccess(false)
    }

  const submitOriginalRequest =
    async () => {
      const trimmedReason =
        reason.trim()

      if (
        !requestFile ||
        !trimmedReason
      ) {
        return
      }

      setRequesting(true)
      setError('')

      try {
        const response =
          await api.post(
            `/original-file-requests/${requestFile.id}`,
            {
              reason:
                trimmedReason,
            },
          )

        setMyRequests(
          (current) => [
            response.data,
            ...current,
          ],
        )

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

  const loadAccessShares =
    async (file) => {
      const response =
        await api.get(
          `/document-library/${file.id}/shares`,
        )

      return response.data.map(
        (share) =>
          share.department_id,
      )
    }

  const openAccessModal =
    async (file) => {
      setAccessFile(file)
      setAccessLoading(true)
      setAccessSaving(false)
      setAccessError('')
      setAccessSuccess('')
      setAccessDepartmentIds([])
      setOriginalAccessDepartmentIds(
        [],
      )

      try {
        const ids =
          await loadAccessShares(
            file,
          )

        setAccessDepartmentIds(
          ids,
        )

        setOriginalAccessDepartmentIds(
          ids,
        )
      } catch (shareError) {
        setAccessError(
          getApiError(
            shareError,
            'Unable to load document access settings.',
          ),
        )
      } finally {
        setAccessLoading(false)
      }
    }

  const closeAccessModal = () => {
    if (accessSaving) {
      return
    }

    setAccessFile(null)
    setAccessDepartmentIds([])
    setOriginalAccessDepartmentIds(
      [],
    )
    setAccessError('')
    setAccessSuccess('')
  }

  const toggleAccessDepartment = (
    departmentId,
  ) => {
    if (accessSaving) {
      return
    }

    setAccessSuccess('')

    setAccessDepartmentIds(
      (current) =>
        current.includes(
          departmentId,
        )
          ? current.filter(
              (id) =>
                id !==
                departmentId,
            )
          : [
              ...current,
              departmentId,
            ],
    )
  }

  const makeAccessPrivate = () => {
    if (accessSaving) {
      return
    }

    setAccessSuccess('')
    setAccessDepartmentIds([])
  }

  const saveAccessChanges =
    async () => {
      if (!accessFile) {
        return
      }

      const toAdd =
        accessDepartmentIds.filter(
          (id) =>
            !originalAccessDepartmentIds.includes(
              id,
            ),
        )

      const toRemove =
        originalAccessDepartmentIds.filter(
          (id) =>
            !accessDepartmentIds.includes(
              id,
            ),
        )

      if (
        toAdd.length === 0 &&
        toRemove.length === 0
      ) {
        setAccessSuccess(
          'No access changes to save.',
        )

        return
      }

      setAccessSaving(true)
      setAccessError('')
      setAccessSuccess('')

      try {
        for (
          const departmentId
          of toAdd
        ) {
          await api.post(
            `/document-library/${accessFile.id}/share`,
            {
              department_id:
                departmentId,
            },
          )
        }

        for (
          const departmentId
          of toRemove
        ) {
          await api.delete(
            `/document-library/${accessFile.id}/share/${departmentId}`,
          )
        }

        const syncedIds =
          await loadAccessShares(
            accessFile,
          )

        setAccessDepartmentIds(
          syncedIds,
        )

        setOriginalAccessDepartmentIds(
          syncedIds,
        )

        setAccessFile(
          (current) =>
            current
              ? {
                  ...current,
                  is_private:
                    syncedIds.length ===
                    0,
                }
              : current,
        )

        await refreshFileLists()

        setAccessSuccess(
          syncedIds.length === 0
            ? 'Document is now private.'
            : `Access updated for ${syncedIds.length} department${syncedIds.length === 1 ? '' : 's'}.`,
        )
      } catch (saveError) {
        setAccessError(
          getApiError(
            saveError,
            'Unable to update document access.',
          ),
        )

        try {
          const syncedIds =
            await loadAccessShares(
              accessFile,
            )

          setAccessDepartmentIds(
            syncedIds,
          )

          setOriginalAccessDepartmentIds(
            syncedIds,
          )

          await refreshFileLists()
        } catch {
          // Keep the modal open so
          // the user can retry.
        }
      } finally {
        setAccessSaving(false)
      }
    }

  const openArchiveModal =
    (file) => {
      setRowMenuFileId(null)
      setArchiveFile(file)
      setArchiveError('')
      setArchiveSuccess('')
    }

  const closeArchiveModal =
    () => {
      if (archiving) {
        return
      }

      setArchiveFile(null)
      setArchiveError('')
    }

  const archiveDocument =
    async () => {
      if (!archiveFile) {
        return
      }

      setArchiving(true)
      setArchiveError('')
      setError('')

      try {
        await api.patch(
          `/document-library/${archiveFile.id}/archive`,
        )

        const archivedName =
          archiveFile.original_filename

        await refreshFileLists()

        setArchiveFile(null)

        setArchiveSuccess(
          `${archivedName} was removed from the active library.`,
        )
      } catch (archiveRequestError) {
        setArchiveError(
          getApiError(
            archiveRequestError,
            'Unable to remove this document from the library.',
          ),
        )
      } finally {
        setArchiving(false)
      }
    }

  const restoreDocument =
    async (file) => {
      setRestoringFileId(file.id)
      setError('')
      setArchiveSuccess('')

      try {
        await api.patch(
          `/document-library/${file.id}/restore`,
        )

        await refreshFileLists()

        setArchiveSuccess(
          `${file.original_filename} was restored to My Files as a private document.`,
        )

        setActiveTab('my')
      } catch (restoreError) {
        setError(
          getApiError(
            restoreError,
            'Unable to restore this document.',
          ),
        )
      } finally {
        setRestoringFileId(null)
      }
    }

  return (
    <>
      <header className="library-page-header">
        <p className="secura-eyebrow">
          SECURE WORKSPACE
        </p>

        <h1>
          Anonymized file library
        </h1>

        <p>
          Access your anonymized
          files and files shared
          with your department.
        </p>
      </header>

      {error && (
        <div
          className="library-error"
          role="alert"
        >
          <ShieldCheck
            size={17}
          />

          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() =>
              setError('')
            }
          >
            <X size={15} />
          </button>
        </div>
      )}

      {archiveSuccess && (
        <div className="library-archive-success">
          <CheckCircle2
            size={17}
          />

          <span>
            {archiveSuccess}
          </span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() =>
              setArchiveSuccess('')
            }
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="library-summary">
        <article>
          <span className="library-summary-icon all">
            <Files size={18} />
          </span>

          <div>
            <b>
              {myFiles.length}
            </b>

            <p>My anonymized files</p>
          </div>
        </article>

        <article>
          <span className="library-summary-icon private">
            <LockKeyhole
              size={18}
            />
          </span>

          <div>
            <b>
              {privateFileCount}
            </b>

            <p>Private files</p>
          </div>
        </article>

        <article>
          <span className="library-summary-icon shared">
            <Share2 size={18} />
          </span>

          <div>
            <b>
              {sharedByMeCount}
            </b>

            <p>Shared by me</p>
          </div>
        </article>

        <article>
          <span className="library-summary-icon department">
            <Building2
              size={18}
            />
          </span>

          <div>
            <b>
              {departmentSharedCount}
            </b>

            <p>Shared with me</p>
          </div>
        </article>
      </section>

      <section className="library-card">
        <div className="library-card-top">
          <div className="library-tabs-real">
            <button
              type="button"
              className={
                activeTab === 'all'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setActiveTab('all')
              }
            >
              All files
              <span>
                {allFiles.length}
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab === 'my'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setActiveTab('my')
              }
            >
              My files
              <span>
                {myFiles.length}
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab ===
                'department'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  'department',
                )
              }
            >
              Department shared
              <span>
                {
                  departmentSharedCount
                }
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab ===
                'archived'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  'archived',
                )
              }
            >
              Archived
              <span>
                {archivedFiles.length}
              </span>
            </button>
          </div>

          <div className="library-toolbar-real">
            <div className="library-search-real">
              <Search size={15} />

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
                placeholder="Search filename or owner"
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    setQuery('')
                  }
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="library-loading">
            <div />
            <div />
            <div />
          </div>
        ) : visibleFiles.length ===
          0 ? (
          <div className="library-empty-state">
            <span>
              <FileText
                size={21}
              />
            </span>

            <b>
              {query
                ? 'No matching files'
                : activeTab ===
                    'archived'
                  ? 'No archived files'
                  : 'No anonymized files yet'}
            </b>

            <p>
              {query
                ? 'Try adjusting your search or file filter.'
                : activeTab ===
                    'department'
                  ? 'Anonymized files shared with your department will appear here.'
                  : activeTab ===
                      'archived'
                    ? 'Files you remove from the active library will appear here and can be restored.'
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

              {visibleFiles.map(
                (
                  file,
                  index,
                ) => {
                  const FileIcon =
                    getFileIcon(
                      file.file_type,
                    )

                  const isArchived =
                    file.libraryGroup ===
                    'archived'

                  const isOwn =
                    file.libraryGroup ===
                      'my' ||
                    isArchived

                  const hasActiveRequest =
                    activeRequestDocumentIds.has(
                      file.id,
                    )

                  const hasApprovedOriginal =
                    approvedRequestDocumentIds.has(
                      file.id,
                    )

                  return (
                    <div
                      className="library-row-real library-animated-row"
                      style={{
                        '--library-row-delay':
                          `${Math.min(index, 8) * 45}ms`,
                      }}
                      key={`${file.libraryGroup}-${file.id}`}
                    >
                      <div className="library-file-real">
                        <span
                          className={`library-file-icon-real ${file.file_type}`}
                        >
                          <FileIcon
                            size={16}
                          />
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
                        {isArchived ? (
                          <em className="library-access-archived">
                            Archived
                          </em>
                        ) : isOwn ? (
                          <button
                            type="button"
                            className="library-access-editor"
                            onClick={() =>
                              openAccessModal(
                                file,
                              )
                            }
                            aria-label={`Manage access for ${file.original_filename}`}
                          >
                            <em
                              className={
                                file.is_private
                                  ? 'library-access-private'
                                  : 'library-access-shared'
                              }
                            >
                              {file.is_private
                                ? 'Private'
                                : 'Shared'}
                            </em>

                            <ChevronDown
                              size={13}
                            />
                          </button>
                        ) : (
                          <em className="library-access-department">
                            Department shared
                          </em>
                        )}
                      </span>

                      <span className="library-date">
                        {formatDate(
                          isArchived
                            ? file.archived_at
                            : file.created_at,
                        )}
                      </span>

                      <div className="library-actions-real">
                        {isArchived ? (
                          <button
                            type="button"
                            className="library-restore-button"
                            disabled={
                              restoringFileId ===
                              file.id
                            }
                            onClick={() =>
                              restoreDocument(
                                file,
                              )
                            }
                          >
                            <RotateCcw
                              size={14}
                            />

                            {restoringFileId ===
                            file.id
                              ? 'Restoring...'
                              : 'Restore'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="library-download-button"
                            onClick={() =>
                              handleDownload(
                                file,
                              )
                            }
                          >
                            <Download
                              size={14}
                            />
                            Download
                          </button>
                        )}

                        {isOwn &&
                          !isArchived && (
                          <div className="library-row-menu-wrap">
                            <button
                              type="button"
                              className="library-row-menu-trigger"
                              aria-label={`More actions for ${file.original_filename}`}
                              onClick={() =>
                                setRowMenuFileId(
                                  (current) =>
                                    current === file.id
                                      ? null
                                      : file.id,
                                )
                              }
                            >
                              <MoreVertical
                                size={15}
                              />
                            </button>

                            {rowMenuFileId ===
                              file.id && (
                              <div className="library-row-menu">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openArchiveModal(
                                      file,
                                    )
                                  }
                                >
                                  <Archive
                                    size={14}
                                  />

                                  <span>
                                    Remove from library
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!isOwn &&
                          !isArchived &&
                          (hasApprovedOriginal ? (
                            <button
                              type="button"
                              className="library-approved-button"
                              onClick={() =>
                                navigate(
                                  '/user/approved-originals',
                                )
                              }
                            >
                              <CheckCircle2
                                size={14}
                              />
                              Original approved
                            </button>
                          ) : (
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
                          ))}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </div>
        )}
      </section>

      {accessFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeAccessModal
          }
        >
          <section
            className="library-access-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={
                closeAccessModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              DOCUMENT ACCESS
            </p>

            <h2>Manage access</h2>

            <p className="library-modal-file">
              {
                accessFile.original_filename
              }
            </p>

            {accessError && (
              <div className="library-access-feedback error">
                <ShieldCheck
                  size={15}
                />

                <span>
                  {accessError}
                </span>
              </div>
            )}

            {accessSuccess && (
              <div className="library-access-feedback success">
                <CheckCircle2
                  size={15}
                />

                <span>
                  {accessSuccess}
                </span>
              </div>
            )}

            {accessLoading ? (
              <div className="library-access-loading">
                <div />
                <div />
                <div />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={[
                    'library-private-choice',
                    accessDepartmentIds.length ===
                    0
                      ? 'selected'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={
                    makeAccessPrivate
                  }
                >
                  <span>
                    <LockKeyhole
                      size={17}
                    />
                  </span>

                  <div>
                    <b>
                      Private only
                    </b>

                    <small>
                      Only you can access
                      this anonymized file.
                    </small>
                  </div>

                  {accessDepartmentIds.length ===
                    0 && (
                    <Check
                      size={17}
                    />
                  )}
                </button>

                <div className="library-access-separator">
                  <span>
                    OR SHARE WITH
                    DEPARTMENTS
                  </span>
                </div>

                {departments.length ===
                0 ? (
                  <p className="library-access-empty">
                    No departments are
                    currently available.
                  </p>
                ) : (
                  <div className="library-access-departments">
                    {departments.map(
                      (
                        department,
                      ) => {
                        const selected =
                          accessDepartmentIds.includes(
                            department.id,
                          )

                        return (
                          <button
                            key={
                              department.id
                            }
                            type="button"
                            className={
                              selected
                                ? 'selected'
                                : ''
                            }
                            onClick={() =>
                              toggleAccessDepartment(
                                department.id,
                              )
                            }
                          >
                            <span>
                              <Building2
                                size={16}
                              />
                            </span>

                            <b>
                              {
                                department.name
                              }
                            </b>

                            <i>
                              {selected && (
                                <Check
                                  size={13}
                                />
                              )}
                            </i>
                          </button>
                        )
                      },
                    )}
                  </div>
                )}

                <div className="library-access-summary">
                  <Share2
                    size={15}
                  />

                  <span>
                    {accessDepartmentIds.length ===
                    0
                      ? 'Private: no departments have access.'
                      : `Shared with ${accessDepartmentIds.length} department${accessDepartmentIds.length === 1 ? '' : 's'}.`}
                  </span>
                </div>

                <div className="library-modal-actions">
                  <button
                    type="button"
                    className="library-cancel-button"
                    onClick={
                      closeAccessModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="library-primary-compact"
                    disabled={
                      accessSaving
                    }
                    onClick={
                      saveAccessChanges
                    }
                  >
                    {accessSaving
                      ? 'Saving...'
                      : 'Save access'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {archiveFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeArchiveModal
          }
        >
          <section
            className="library-archive-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={
                closeArchiveModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <span className="library-archive-modal-icon">
              <Archive
                size={22}
              />
            </span>

            <p className="secura-eyebrow">
              DOCUMENT LIFECYCLE
            </p>

            <h2>
              Remove from library?
            </h2>

            <p className="library-modal-file">
              {
                archiveFile.original_filename
              }
            </p>

            <p className="library-archive-description">
              This is a soft removal.
              Secura keeps the document
              record for audit and approval
              history instead of permanently
              deleting security records.
            </p>

            <div className="library-archive-impact">
              <div>
                <Share2
                  size={15}
                />

                <span>
                  Department sharing will
                  stop immediately.
                </span>
              </div>

              <div>
                <LockKeyhole
                  size={15}
                />

                <span>
                  The file will disappear
                  from the active anonymized
                  library.
                </span>
              </div>

              <div>
                <ShieldCheck
                  size={15}
                />

                <span>
                  New original-access
                  requests will be blocked.
                </span>
              </div>
            </div>

            <div className="library-archive-warning">
              <AlertTriangle
                size={16}
              />

              <span>
                Pending original-access
                requests must be resolved
                before this document can
                be removed.
              </span>
            </div>

            {archiveError && (
              <div className="library-access-feedback error">
                <ShieldCheck
                  size={15}
                />

                <span>
                  {archiveError}
                </span>
              </div>
            )}

            <div className="library-modal-actions">
              <button
                type="button"
                className="library-cancel-button"
                onClick={
                  closeArchiveModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="library-archive-confirm"
                disabled={archiving}
                onClick={
                  archiveDocument
                }
              >
                <Archive
                  size={14}
                />

                {archiving
                  ? 'Removing...'
                  : 'Remove document'}
              </button>
            </div>
          </section>
        </div>
      )}

      {requestFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeRequestModal
          }
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
              onClick={
                closeRequestModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {requestSuccess ? (
              <div className="library-request-success">
                <span>
                  <CheckCircle2
                    size={22}
                  />
                </span>

                <h2>
                  Request submitted
                </h2>

                <p>
                  Your request for{' '}
                  <b>
                    {
                      requestFile.original_filename
                    }
                  </b>{' '}
                  has been sent to
                  the document owner
                  for review.
                </p>

                <button
                  type="button"
                  className="library-primary-button"
                  onClick={
                    closeRequestModal
                  }
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
                  Request original
                  file
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
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Explain why you need access to the original file..."
                  />
                </label>

                <div className="library-reason-count">
                  {reason.length}/500
                </div>

                <p className="library-access-note">
                  <ShieldCheck
                    size={15}
                  />

                  Original file access
                  requires approval
                  from the document
                  owner and a Security
                  Officer.
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
