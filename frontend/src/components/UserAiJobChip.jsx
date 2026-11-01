import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import api from '../api/client'

// SECURA V15.7.1 — display-only job status in the User sidebar.
// No modal, popup, arrow, navigation, or external progress state.
// Data is read from the existing V15.7 authenticated job endpoint.
function UserAiJobChip() {
  const [job, setJob] = useState(null)
  const [justFinished, setJustFinished] = useState(false)
  const activeId = useRef(null)
  const hideTimer = useRef(null)

  const check = useCallback(async (signal) => {
    try {
      const { data } = await api.get('/anonymization-jobs/recent', { signal })
      if (signal.aborted) return

      const list = Array.isArray(data) ? data : []
      const active = list.find((item) => ['QUEUED', 'PROCESSING', 'CANCEL_REQUESTED'].includes(item.status))

      if (active) {
        if (hideTimer.current) window.clearTimeout(hideTimer.current)
        activeId.current = active.job_id
        setJustFinished(false)
        setJob(active)
        return
      }

      if (activeId.current) {
        const completed = list.find((item) => item.job_id === activeId.current)
        activeId.current = null
        setJob(completed?.status === 'COMPLETED' ? completed : null)
        if (completed?.status === 'COMPLETED') {
          setJustFinished(true)
          hideTimer.current = window.setTimeout(() => {
            setJustFinished(false)
            setJob(null)
          }, 12000)
        }
      }
    } catch {
      // Failed polling must not be presented as successful anonymization.
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const poll = () => { void check(controller.signal) }
    poll()
    const interval = window.setInterval(poll, 3000)

    return () => {
      controller.abort()
      window.clearInterval(interval)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [check])

  if (!job || (!justFinished && !['QUEUED', 'PROCESSING', 'CANCEL_REQUESTED'].includes(job.status))) {
    return null
  }

  const done = justFinished
  const percent = done ? 100 : Math.max(0, Math.min(100, Number(job.progress_percent ?? 0)))

  return (
    <div className={`sun157__job ${done ? 'is-done' : ''}`}
      style={{ cursor: 'default', pointerEvents: 'none', transition: 'none' }}
      role="status" aria-live="off"
      aria-label={`${done ? 'Document ready' : 'Document processing'}, ${job.filename}, ${percent} percent`}>
      <span className="sun157__job-icon" aria-hidden="true">
        {done ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
      </span>
      <span className="sun157__job-copy">
        <b>{done ? 'Document ready' : job.status === 'CANCEL_REQUESTED' ? 'Stopping AI safely' : 'AI protection running'}</b>
        <small>{job.filename}</small>
        <span className="sun157__job-track" aria-hidden="true">
          <i style={{ width: `${percent}%` }} />
        </span>
        <em>{done ? 'Anonymized file is ready' : job.status === 'CANCEL_REQUESTED' ? `${percent}% · Cancellation requested` : `${percent}% · ${job.progress_stage || 'Queued'}`}</em>
      </span>
    </div>
  )
}

export default UserAiJobChip
