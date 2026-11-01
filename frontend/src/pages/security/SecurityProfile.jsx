import {
  Building2,
  Camera,
  Check,
  Fingerprint,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/useAuth'
import './SecurityProfileNeo.css'

function getInitials(name) {
  if (!name) {
    return 'SO'
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getApiError(error, fallback) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function SecurityProfile() {
  const photoInputRef = useRef(null)
  const photoUrlRef = useRef(null)

  const { verifySession } = useAuth()

  const [profile, setProfile] =
    useState(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
  })

  const [photoUrl, setPhotoUrl] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        const response =
          await api.get('/profile')

        if (cancelled) {
          return
        }

        setProfile(response.data)

        setForm({
          full_name:
            response.data.full_name || '',
          email:
            response.data.email || '',
        })

        if (
          response.data
            .has_profile_photo
        ) {
          try {
            const photoResponse =
              await api.get(
                '/profile/photo',
                {
                  responseType:
                    'blob',
                },
              )

            if (cancelled) {
              return
            }

            const objectUrl =
              URL.createObjectURL(
                photoResponse.data,
              )

            photoUrlRef.current =
              objectUrl

            setPhotoUrl(objectUrl)
          } catch {
            // Profile can still load
            // without a photo.
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load Security Officer profile.',
            ),
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true

      if (photoUrlRef.current) {
        URL.revokeObjectURL(
          photoUrlRef.current,
        )
      }
    }
  }, [])

  const handleSave = async (
    event,
  ) => {
    event.preventDefault()

    if (!profile) {
      return
    }

    const fullName =
      form.full_name.trim()

    const email =
      form.email
        .trim()
        .toLowerCase()

    if (!fullName) {
      setError(
        'Full name is required.',
      )

      return
    }

    if (!email) {
      setError(
        'Email is required.',
      )

      return
    }

    const payload = {}

    if (
      fullName !==
      (profile.full_name || '')
    ) {
      payload.full_name =
        fullName
    }

    if (
      email !==
      (profile.email || '')
        .toLowerCase()
    ) {
      payload.email = email
    }

    if (
      Object.keys(payload)
        .length === 0
    ) {
      setError('')

      setMessage(
        'No profile changes to save.',
      )

      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response =
        await api.patch(
          '/profile',
          payload,
        )

      setProfile(response.data)

      setForm({
        full_name:
          response.data.full_name || '',
        email:
          response.data.email || '',
      })

      await verifySession()

      setMessage(
        'Security Officer profile updated successfully.',
      )
    } catch (saveError) {
      setError(
        getApiError(
          saveError,
          'Unable to update Security Officer profile.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange =
    async (event) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) {
        return
      }

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase()

      const allowed = [
        'jpg',
        'jpeg',
        'png',
        'webp',
      ]

      if (
        !extension ||
        !allowed.includes(extension)
      ) {
        setError(
          'Only JPG, JPEG, PNG, and WEBP photos are allowed.',
        )

        return
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setError(
          'Profile photo cannot exceed 5 MB.',
        )

        return
      }

      setUploadingPhoto(true)
      setError('')
      setMessage('')

      try {
        const formData =
          new FormData()

        formData.append(
          'photo',
          file,
        )

        const response =
          await api.post(
            '/profile/photo',
            formData,
          )

        setProfile(response.data)

        const photoResponse =
          await api.get(
            '/profile/photo',
            {
              responseType: 'blob',
            },
          )

        const newPhotoUrl =
          URL.createObjectURL(
            photoResponse.data,
          )

        if (photoUrlRef.current) {
          URL.revokeObjectURL(
            photoUrlRef.current,
          )
        }

        photoUrlRef.current =
          newPhotoUrl

        setPhotoUrl(
          newPhotoUrl,
        )

        window.dispatchEvent(
          new Event(
            'secura-profile-photo-updated',
          ),
        )

        setMessage(
          'Profile photo updated successfully.',
        )
      } catch (photoError) {
        setError(
          getApiError(
            photoError,
            'Unable to update profile photo.',
          ),
        )
      } finally {
        setUploadingPhoto(false)
      }
    }

  const resetChanges = () => {
    if (!profile) {
      return
    }

    setForm({
      full_name:
        profile.full_name || '',
      email:
        profile.email || '',
    })

    setError('')
    setMessage('')
  }

  const hasChanges = Boolean(profile) && (
    form.full_name.trim() !== (profile.full_name || '') ||
    form.email.trim().toLowerCase() !== (profile.email || '').toLowerCase()
  )

  if (loading) {
    return (
      <section className="socp14 socp14--loading" aria-label="Loading Security Officer profile">
        <div className="socp14__skeleton socp14__skeleton--hero" />
        <div className="socp14__skeleton-row">
          <div className="socp14__skeleton socp14__skeleton--identity" />
          <div className="socp14__skeleton socp14__skeleton--editor" />
        </div>
      </section>
    )
  }

  return (
    <section className="socp14 page-enter">
      <header className="socp14__hero">
        <div className="socp14__hero-copy">
          <span className="socp14__eyebrow"><ShieldCheck size={13} /> SECURITY OPERATIONS / MY ACCOUNT</span>
          <h1 className="socp14__hero-title">
            <span className="socp14__hero-title-static">My</span>{' '}
            <span className="socp14__hero-title-wave">Profile.</span>
          </h1>
          <p>Your workspace identity, personal information and account access — all in one place.</p>
        </div>
        <div className="socp14__hero-mark" aria-hidden="true"><ShieldCheck size={44} strokeWidth={1.4} /></div>
        {profile && (
          <span className={`socp14__status ${profile.is_active ? 'socp14__status--active' : 'socp14__status--inactive'}`}>
            <i />{profile.is_active ? 'Account active' : 'Account inactive'}
          </span>
        )}
      </header>

      {message && (
        <div className="socp14__notice socp14__notice--success" role="status" aria-live="polite">
          <Check size={17} /><span>{message}</span>
          <button type="button" aria-label="Dismiss success message" onClick={() => setMessage('')}><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="socp14__notice socp14__notice--error" role="alert">
          <ShieldCheck size={17} /><span>{error}</span>
          <button type="button" aria-label="Dismiss error message" onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {profile ? (
        <div className="socp14__layout">
          <aside className="socp14__identity">
            <div className="socp14__identity-pattern" aria-hidden="true" />
            <div className="socp14__identity-top">
              <span className="socp14__overline">SECURA IDENTITY</span>
              <span className="socp14__identity-icon"><Fingerprint size={20} /></span>
            </div>
            <div className="socp14__avatar-wrap">
              <div className="socp14__avatar">
                {photoUrl ? <img src={photoUrl} alt="Your profile" /> : <span>{getInitials(profile.full_name || profile.username)}</span>}
              </div>
              <button type="button" className="socp14__camera" aria-label="Upload profile photo" title="Upload profile photo" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                <Camera size={17} />
              </button>
            </div>
            <input ref={photoInputRef} type="file" className="socp14__file-input" accept=".jpg,.jpeg,.png,.webp" aria-label="Select profile image" onChange={handlePhotoChange} />
            <h2>{profile.full_name || profile.username}</h2>
            <p className="socp14__identity-email">{profile.email}</p>
            <span className="socp14__role"><ShieldCheck size={15} /> Security Officer</span>
            <div className="socp14__identity-divider" />
            <button type="button" className="socp14__upload" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
              <Camera size={16} /> {uploadingPhoto ? 'Uploading photo...' : 'Change profile photo'}
            </button>
            <small className="socp14__upload-help">JPG, JPEG, PNG or WEBP · Up to 5 MB</small>
            <div className="socp14__identity-footer">
              <ShieldCheck size={19}/>
              <span><strong>Authorized security access</strong><small>Access is controlled by your assigned SECURA role.</small></span>
            </div>
          </aside>

          <div className="socp14__right">
            <form className="socp14__panel socp14__editor" onSubmit={handleSave}>
              <div className="socp14__panel-header">
                <span className="socp14__panel-icon"><UserRound size={19} /></span>
                <div><span className="socp14__overline">PERSONAL INFORMATION</span><h2>Account details</h2><p>Update how your name and email appear across the workspace.</p></div>
                {hasChanges && <span className="socp14__unsaved">Unsaved changes</span>}
              </div>
              <div className="socp14__form-grid">
                <label className="socp14__field" htmlFor="socp14-full-name">
                  <span>Full name</span>
                  <div className="socp14__field-wrap"><UserRound size={17} /><input id="socp14-full-name" type="text" autoComplete="name" value={form.full_name} onChange={(event) => setForm((current) => ({...current, full_name: event.target.value}))} disabled={saving} placeholder="Enter your full name" required /></div>
                </label>
                <label className="socp14__field" htmlFor="socp14-email">
                  <span>Work email</span>
                  <div className="socp14__field-wrap"><Mail size={17} /><input id="socp14-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({...current, email: event.target.value}))} disabled={saving} placeholder="name@company.com" required /></div>
                </label>
              </div>
              <div className="socp14__form-actions">
                <p>{hasChanges ? 'Changes are saved securely to your profile.' : 'Your profile information is up to date.'}</p>
                <div>
                  <button className="socp14__button socp14__button--ghost" type="button" disabled={!hasChanges || saving} onClick={resetChanges}>Discard</button>
                  <button className="socp14__button socp14__button--primary" type="submit" disabled={!hasChanges || saving}><Save size={15} /> {saving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </div>
            </form>

            <section className="socp14__panel socp14__access">
              <div className="socp14__panel-header">
                <span className="socp14__panel-icon socp14__panel-icon--green"><LockKeyhole size={19} /></span>
                <div><span className="socp14__overline">ACCESS & PERMISSIONS</span><h2>Security account</h2><p>System-managed information for your current access level.</p></div>
                <span className="socp14__read-only"><LockKeyhole size={12} /> Read only</span>
              </div>
              <div className="socp14__facts">
                <div className="socp14__fact"><span><UserRound size={18} /></span><div><small>Username</small><strong>{profile.username}</strong></div></div>
                <div className="socp14__fact"><span><ShieldCheck size={18} /></span><div><small>Role</small><strong>{profile.role}</strong></div></div>
                <div className="socp14__fact"><span><Building2 size={18} /></span><div><small>Department</small><strong>{profile.department_name || 'Not assigned'}</strong></div></div>
                <div className="socp14__fact"><span><Check size={18} /></span><div><small>Account status</small><strong className={profile.is_active ? 'socp14__positive' : 'socp14__negative'}>{profile.is_active ? 'Active' : 'Inactive'}</strong></div></div>
              </div>
              <div className="socp14__policy"><LockKeyhole size={18} /><p><strong>Account security is managed by your Administrator.</strong> Role, department, status and password resets cannot be changed from this page.</p></div>
            </section>
          </div>
        </div>
      ) : (
        <div className="socp14__unavailable"><ShieldCheck size={26} /><h2>Profile is unavailable</h2><p>We could not load your account information. Please check your connection and try again.</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
      )}
    </section>
  )
}

export default SecurityProfile
