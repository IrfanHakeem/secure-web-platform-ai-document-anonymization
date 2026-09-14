import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  LockKeyhole,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'

const ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'txt',
  'xlsx',
  'csv',
]

const MAX_FILE_SIZE = 25 * 1024 * 1024

const PII_LABELS = {
  NAME: 'Names',
  EMAIL: 'Email addresses',
  PHONE: 'Phone numbers',
  MALAYSIAN_IC: 'Malaysian IC numbers',
}

function getExtension(filename) {
  return filename
    .split('.')
    .pop()
    ?.toLowerCase()
}

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

function buildOutputFilename(filename) {
  return `anonymized_${filename}`
}

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function AnonymizeDocument() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedDocument, setUploadedDocument] =
    useState(null)

  const [uploading, setUploading] = useState(false)
  const [anonymizing, setAnonymizing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [departments, setDepartments] = useState([])
  const [selectedDepartmentIds, setSelectedDepartmentIds] =
    useState([])
  const [sharedDepartmentIds, setSharedDepartmentIds] =
    useState([])

  const [showShare, setShowShare] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showReplacements, setShowReplacements] =
    useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let cancelled = false

    api
      .get('/departments')
      .then((response) => {
        if (!cancelled) {
          setDepartments(response.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDepartments([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const resetWorkflow = () => {
    setSelectedFile(null)
    setUploadedDocument(null)
    setUploading(false)
    setAnonymizing(false)
    setDragActive(false)
    setResult(null)
    setError('')
    setSelectedDepartmentIds([])
    setSharedDepartmentIds([])
    setShowShare(false)
    setShowReport(false)
    setShowReplacements(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file) => {
    setError('')
    setResult(null)
    setUploadedDocument(null)
    setSelectedDepartmentIds([])
    setSharedDepartmentIds([])
    setShowShare(false)
    setShowReport(false)

    if (!file) {
      return
    }

    const extension = getExtension(file.name)

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null)
      setError(
        'Unsupported file type. Please upload PDF, DOCX, TXT, XLSX, or CSV.',
      )
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setError(
        'The selected file exceeds the 25 MB upload limit.',
      )
      return
    }

    if (file.size === 0) {
      setSelectedFile(null)
      setError('The selected file is empty.')
      return
    }

    setSelectedFile(file)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post(
        '/documents/upload',
        formData,
      )

      setUploadedDocument(response.data)
    } catch (uploadError) {
      setSelectedFile(null)

      setError(
        getApiError(
          uploadError,
          'Unable to upload and validate the document.',
        ),
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (event) => {
    const file = event.target.files?.[0]

    if (file) {
      uploadFile(file)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      uploadFile(file)
    }
  }

  const handleAnonymize = async () => {
    if (!uploadedDocument?.id) {
      return
    }

    setError('')
    setAnonymizing(true)

    try {
      const response = await api.post(
        `/anonymization/${uploadedDocument.id}`,
      )

      setResult(response.data)
    } catch (anonymizeError) {
      setError(
        getApiError(
          anonymizeError,
          'AI anonymization could not be completed.',
        ),
      )
    } finally {
      setAnonymizing(false)
    }
  }

  const handleDownload = async () => {
    if (!result?.document_id) {
      return
    }

    setError('')

    try {
      const response = await api.get(
        `/document-library/${result.document_id}/download-anonymized`,
        {
          responseType: 'blob',
        },
      )

      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')

      link.href = url
      link.download = buildOutputFilename(result.filename)

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(
        getApiError(
          downloadError,
          'Unable to download the anonymized document.',
        ),
      )
    }
  }

  const toggleDepartment = (departmentId) => {
    if (sharedDepartmentIds.includes(departmentId)) {
      return
    }

    setSelectedDepartmentIds((current) =>
      current.includes(departmentId)
        ? current.filter((id) => id !== departmentId)
        : [...current, departmentId],
    )
  }

  const handleShare = async () => {
    const pendingDepartmentIds =
      selectedDepartmentIds.filter(
        (id) => !sharedDepartmentIds.includes(id),
      )

    if (
      !result?.document_id ||
      pendingDepartmentIds.length === 0
    ) {
      return
    }

    setSharing(true)
    setError('')

    const requests = pendingDepartmentIds.map(
      async (departmentId) => {
        await api.post(
          `/document-library/${result.document_id}/share`,
          {
            department_id: departmentId,
          },
        )

        return departmentId
      },
    )

    const responses = await Promise.allSettled(requests)

    const successfulIds = responses
      .filter((response) => response.status === 'fulfilled')
      .map((response) => response.value)

    const failedCount = responses.filter(
      (response) => response.status === 'rejected',
    ).length

    setSharedDepartmentIds((current) => [
      ...new Set([...current, ...successfulIds]),
    ])

    setSelectedDepartmentIds((current) =>
      current.filter(
        (id) => !successfulIds.includes(id),
      ),
    )

    if (failedCount === 0) {
      setShowShare(false)
    } else {
      setError(
        `${failedCount} department share request could not be completed.`,
      )
    }

    setSharing(false)
  }

  const piiRows = Object.entries(
    result?.pii_counts ?? {},
  ).map(([type, count]) => ({
    type,
    label: PII_LABELS[type] ?? type,
    count,
  }))

  const selectedDepartmentNames =
    departments
      .filter((department) =>
        selectedDepartmentIds.includes(department.id),
      )
      .map((department) => department.name)

  return (
    <>
      <button
        type="button"
        className="anonymize-mobile-back"
        onClick={() => navigate('/user/dashboard')}
      >
        <ArrowLeft size={16} />
        Back to home
      </button>

      <header className="anonymize-header">
        <p className="secura-eyebrow">
          SECURE WORKSPACE
        </p>

        <h1>Anonymize document</h1>

        <p>
          Upload a document and let Secura protect sensitive
          information.
        </p>
      </header>

      {error && (
        <div
          className="anonymize-error"
          role="alert"
        >
          <ShieldCheck size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!result ? (
        <div className="anonymize-layout">
          <section className="anonymize-panel upload-panel">
            <div className="anonymize-step">
              <span>1</span>

              <div>
                <h2>Upload document</h2>

                <p>
                  Supported formats: PDF, DOCX, TXT, XLSX,
                  CSV · Maximum 25 MB
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              className="anonymize-file-input"
              type="file"
              accept=".pdf,.docx,.txt,.xlsx,.csv"
              onChange={handleFileInput}
            />

            <button
              type="button"
              className={[
                'anonymize-dropzone',
                uploadedDocument ? 'uploaded' : '',
                dragActive ? 'drag-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={uploading}
              onClick={() => {
                if (!uploading) {
                  fileInputRef.current?.click()
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setDragActive(false)
              }}
              onDrop={handleDrop}
            >
              <span className="anonymize-upload-icon">
                {uploadedDocument ? (
                  <FileText size={21} />
                ) : (
                  <UploadCloud size={22} />
                )}
              </span>

              <b>
                {uploading
                  ? 'Securing document...'
                  : selectedFile
                    ? selectedFile.name
                    : 'Drop your file here, or browse'}
              </b>

              {uploading && (
                <span className="anonymize-upload-progress">
                  Validating and encrypting your document...
                </span>
              )}

              {!selectedFile && !uploading && (
                <small>
                  Your document will be securely validated
                  before processing.
                </small>
              )}

              {uploadedDocument && !uploading && (
                <span className="anonymize-file-meta">
                  <small>
                    {formatBytes(
                      uploadedDocument.file_size,
                    )}
                  </small>

                  <small>
                    <Check size={13} />
                    File validated
                  </small>

                  <small>
                    <LockKeyhole size={13} />
                    Original encrypted
                  </small>

                  <small>
                    <ShieldCheck size={13} />
                    SHA-256 generated
                  </small>
                </span>
              )}
            </button>
          </section>

          <section className="anonymize-panel ai-panel">
            <div className="anonymize-step">
              <span>2</span>

              <div>
                <h2>AI processing</h2>

                <p>
                  AI automatically detects and anonymizes
                  sensitive data.
                </p>
              </div>
            </div>

            <div
              className={[
                'anonymize-ai-orbit',
                anonymizing ? 'processing' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>
                <Sparkles size={23} />
              </span>

              <i />
              <i />
              <i />
            </div>

            {uploadedDocument ? (
              <div className="anonymize-ai-status">
                <p>
                  <Check size={14} />
                  Document validated
                </p>

                <p>
                  <Check size={14} />
                  Sensitive data scan ready
                </p>

                <p>
                  <Check size={14} />
                  Ready to anonymize
                </p>
              </div>
            ) : (
              <div className="anonymize-ai-waiting">
                <b>Waiting for document</b>

                <p>
                  Upload a document to begin AI analysis and
                  anonymization.
                </p>
              </div>
            )}

            <button
              type="button"
              className="anonymize-primary-button"
              disabled={
                !uploadedDocument ||
                uploading ||
                anonymizing
              }
              onClick={handleAnonymize}
            >
              {anonymizing
                ? 'AI processing...'
                : 'Anonymize with AI'}

              <Sparkles size={16} />
            </button>
          </section>
        </div>
      ) : (
        <section className="anonymize-completion">
          <div className="anonymize-process-grid">
            <article className="anonymize-process-card">
              <h2>1. Upload document</h2>

              <b>{uploadedDocument.original_filename}</b>

              <p>
                {formatBytes(uploadedDocument.file_size)}
              </p>

              <div className="anonymize-process-divider" />

              <strong>Security checks</strong>

              <p>
                <Check size={13} />
                File validated
              </p>

              <p>
                <Check size={13} />
                Original encrypted
              </p>

              <p>
                <Check size={13} />
                SHA-256 generated
              </p>
            </article>

            <article className="anonymize-process-card processing-card">
              <h2>2. AI processing</h2>

              <p>
                <Check size={13} />
                Analysis completed
              </p>

              <p>
                <Check size={13} />
                Anonymization completed
              </p>

              <div className="anonymize-process-divider" />

              <strong>
                Total sensitive data points protected
              </strong>

              <p className="anonymize-protected-label">
                {result.pii_count} data point
                {result.pii_count === 1 ? '' : 's'} protected
                <Check size={14} />
              </p>
            </article>
          </div>

          <section className="anonymize-ready-card">
            <div>
              <b>
                <Check size={17} />
                Your anonymized file is ready
              </b>

              <p>
                {buildOutputFilename(result.filename)}
              </p>
            </div>

            <div className="anonymize-result-actions">
              <button
                type="button"
                className="anonymize-secondary-button"
                onClick={handleDownload}
              >
                <Download size={15} />
                Download anonymized
              </button>

              <button
                type="button"
                className={[
                  'anonymize-share-button',
                  sharedDepartmentIds.length
                    ? 'shared'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  setShowShare((current) => !current)
                }
              >
                <Share2 size={15} />

                {sharedDepartmentIds.length
                  ? `Shared with ${sharedDepartmentIds.length} department${
                      sharedDepartmentIds.length > 1
                        ? 's'
                        : ''
                    }`
                  : 'Share with department'}
              </button>

              <button
                type="button"
                className="anonymize-secondary-button"
                onClick={resetWorkflow}
              >
                Anonymize another document
              </button>
            </div>
          </section>

          {showShare && (
            <section className="anonymize-department-picker">
              <div>
                <b>Share with departments</b>

                <p>
                  Select one or more departments that can
                  access this anonymized file.
                </p>
              </div>

              {departments.length === 0 ? (
                <p className="anonymize-empty-departments">
                  No departments are currently available.
                </p>
              ) : (
                <div className="anonymize-department-options">
                  {departments.map((department) => {
                    const shared =
                      sharedDepartmentIds.includes(
                        department.id,
                      )

                    return (
                      <label
                        key={department.id}
                        className={
                          shared
                            ? 'already-shared'
                            : ''
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={shared}
                          checked={
                            shared ||
                            selectedDepartmentIds.includes(
                              department.id,
                            )
                          }
                          onChange={() =>
                            toggleDepartment(
                              department.id,
                            )
                          }
                        />

                        <span>{department.name}</span>

                        {shared && (
                          <small>Shared</small>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="anonymize-department-footer">
                <small>
                  {selectedDepartmentNames.length
                    ? `${selectedDepartmentNames.join(', ')} selected`
                    : 'No new departments selected'}
                </small>

                <button
                  type="button"
                  className="anonymize-primary-compact"
                  disabled={
                    sharing ||
                    selectedDepartmentIds.length === 0
                  }
                  onClick={handleShare}
                >
                  {sharing
                    ? 'Sharing...'
                    : 'Share file'}
                </button>
              </div>
            </section>
          )}

          <section className="anonymize-detection-panel">
            <div className="anonymize-detection-header">
              <div>
                <p className="secura-eyebrow">
                  AI DETECTION REPORT
                </p>

                <h2>
                  {result.pii_count} sensitive data point
                  {result.pii_count === 1 ? '' : 's'} detected
                  and protected
                </h2>
              </div>

              <button
                type="button"
                className="anonymize-report-button"
                onClick={() =>
                  setShowReport((current) => !current)
                }
              >
                {showReport
                  ? 'Hide details'
                  : 'View details'}

                {showReport ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>

            <div className="anonymize-detection-list">
              {piiRows.length === 0 ? (
                <p>
                  <b>0</b>
                  No supported PII categories detected
                </p>
              ) : (
                piiRows.map((item) => (
                  <p key={item.type}>
                    <b>{item.count}</b>
                    {item.label}
                  </p>
                ))
              )}
            </div>

            {showReport && (
              <div className="anonymize-detection-detail">
                <div>
                  <b>Detected category</b>
                  <span>Occurrences</span>
                </div>

                {piiRows.map((item) => (
                  <div key={item.type}>
                    <p>{item.label}</p>

                    <span>
                      {item.count} protected
                    </span>
                  </div>
                ))}

                {result.replacements?.length > 0 && (
                  <div className="anonymize-before-after-row">
                    <div>
                      <p>
                        Before / After replacements
                      </p>

                      <small>
                        Review the exact replacements from
                        this anonymization run.
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowReplacements(true)
                      }
                    >
                      View Before / After
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="anonymize-privacy-note">
            <ShieldCheck size={19} />

            <div>
              <b>
                Your original document stays protected
              </b>

              <p>
                Every upload is encrypted and original-file
                access is restricted through an approval
                workflow.
              </p>
            </div>
          </aside>
        </section>
      )}

      {showReplacements && result && (
        <div
          className="anonymize-modal-backdrop"
          onClick={() => setShowReplacements(false)}
        >
          <section
            className="anonymize-replacements-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="anonymize-modal-close"
              onClick={() =>
                setShowReplacements(false)
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              AI ANONYMIZATION RESULT
            </p>

            <h2>Before / After</h2>

            <p className="anonymize-modal-lead">
              These replacements are shown only from the
              current anonymization response.
            </p>

            <div className="anonymize-replacement-table">
              <div className="anonymize-replacement-heading">
                <span>Type</span>
                <span>Before</span>
                <span>After</span>
              </div>

              {result.replacements.map(
                (replacement, index) => (
                  <div
                    className="anonymize-replacement-row"
                    key={`${replacement.type}-${index}`}
                  >
                    <span>
                      {PII_LABELS[
                        replacement.type
                      ] ?? replacement.type}
                    </span>

                    <code>
                      {replacement.original}
                    </code>

                    <code>
                      {replacement.replacement}
                    </code>
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              className="anonymize-primary-button"
              onClick={() =>
                setShowReplacements(false)
              }
            >
              Done
            </button>
          </section>
        </div>
      )}
    </>
  )
}

export default AnonymizeDocument