import {
  Camera,
  Check,
  ChevronLeft,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
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

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function UserProfile() {
  const navigate = useNavigate()
  const photoInputRef = useRef(null)

  const { verifySession } = useAuth()

  const [profile, setProfile] = useState(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
  })

  const [photoUrl, setPhotoUrl] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    let createdPhotoUrl = null

    const loadProfile = async () => {
      try {
        const response = await api.get('/profile')

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

        if (response.data.has_profile_photo) {
          try {
            const photoResponse = await api.get(
              '/profile/photo',
              {
                responseType: 'blob',
              },
            )

            if (cancelled) {
              return
            }

            createdPhotoUrl =
              URL.createObjectURL(
                photoResponse.data,
              )

            setPhotoUrl(createdPhotoUrl)
          } catch {
            // Profile data can still load even
            // if the stored photo is unavailable.
          }
        }
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(
          getApiError(
            loadError,
            'Unable to load your profile.',
          ),
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true

      if (createdPhotoUrl) {
        URL.revokeObjectURL(
          createdPhotoUrl,
        )
      }
    }
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()

    if (!profile) {
      return
    }

    const fullName =
      form.full_name.trim()

    const email =
      form.email.trim().toLowerCase()

    if (!fullName) {
      setError('Full name is required.')
      return
    }

    if (!email) {
      setError('Email is required.')
      return
    }

    const payload = {}

    if (
      fullName !==
      (profile.full_name || '')
    ) {
      payload.full_name = fullName
    }

    if (
      email !==
      (profile.email || '').toLowerCase()
    ) {
      payload.email = email
    }

    if (Object.keys(payload).length === 0) {
      setMessage('No profile changes to save.')
      setError('')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await api.patch(
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
        'Profile updated successfully.',
      )
    } catch (saveError) {
      setError(
        getApiError(
          saveError,
          'Unable to update your profile.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (event) => {
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

    const allowedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'webp',
    ]

    if (
      !extension ||
      !allowedExtensions.includes(
        extension,
      )
    ) {
      setError(
        'Only JPG, JPEG, PNG, and WEBP photos are allowed.',
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
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

      const response = await api.post(
        '/profile/photo',
        formData,
      )

      setProfile(response.data)

      const photoResponse = await api.get(
        '/profile/photo',
        {
          responseType: 'blob',
        },
      )

      const newPhotoUrl =
        URL.createObjectURL(
          photoResponse.data,
        )

      setPhotoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(
            current,
          )
        }

        return newPhotoUrl
      })

      setMessage(
        'Profile photo updated successfully.',
      )
    } catch (photoError) {
      setError(
        getApiError(
          photoError,
          'Unable to update your profile photo.',
        ),
      )
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) {
    return (
      <main className="profile-page-shell">
        <div className="profile-loading-card">
          <div />
          <div />
          <div />
        </div>
      </main>
    )
  }

  return (
    <main className="profile-page-shell">
      <div className="profile-page-content">
        <button
          type="button"
          className="profile-back-button"
          onClick={() =>
            navigate('/user/dashboard')
          }
        >
          <ChevronLeft size={15} />
          Back to dashboard
        </button>

        <header className="profile-page-header">
          <p className="secura-eyebrow">
            SECURE WORKSPACE
          </p>

          <h1>Profile</h1>

          <p>
            Manage your Secura account information
            and profile photo.
          </p>
        </header>

        {message && (
          <div className="profile-success-message">
            <Check size={16} />

            <span>{message}</span>

            <button
              type="button"
              onClick={() =>
                setMessage('')
              }
            >
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="profile-error-message">
            <ShieldCheck size={16} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
            >
              <X size={14} />
            </button>
          </div>
        )}

        {profile && (
          <section className="profile-layout">
            <aside className="profile-identity-card">
              <div className="profile-avatar-large">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                  />
                ) : (
                  <span>
                    {getInitials(
                      profile.full_name ||
                        profile.username,
                    )}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="profile-photo-button"
                disabled={uploadingPhoto}
                onClick={() =>
                  photoInputRef.current?.click()
                }
              >
                <Camera size={14} />

                {uploadingPhoto
                  ? 'Uploading...'
                  : 'Change photo'}
              </button>

              <input
                ref={photoInputRef}
                className="profile-photo-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={
                  handlePhotoChange
                }
              />

              <h2>
                {profile.full_name ||
                  profile.username}
              </h2>

              <p>{profile.email}</p>

              <span className="profile-role-badge">
                {profile.role}
              </span>

              <small>
                JPG, PNG or WEBP · Max 5 MB
              </small>
            </aside>

            <form
              className="profile-settings-card"
              onSubmit={handleSave}
            >
              <div className="profile-settings-heading">
                <div>
                  <p className="secura-eyebrow">
                    ACCOUNT DETAILS
                  </p>

                  <h2>
                    Personal information
                  </h2>
                </div>

                <span>
                  <UserRound size={18} />
                </span>
              </div>

              <div className="profile-form-grid">
                <label>
                  Full name

                  <input
                    type="text"
                    value={form.full_name}
                    maxLength={150}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        full_name:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Email address

                  <div className="profile-input-icon">
                    <Mail size={14} />

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email:
                            event.target.value,
                        }))
                      }
                    />
                  </div>
                </label>

                <label>
                  Username

                  <input
                    type="text"
                    value={profile.username}
                    disabled
                  />
                </label>

                <label>
                  Role

                  <input
                    type="text"
                    value={profile.role}
                    disabled
                  />
                </label>

                <label>
                  Department

                  <input
                    type="text"
                    value={
                      profile.department_name ||
                      'Not assigned'
                    }
                    disabled
                  />
                </label>

                <label>
                  Account status

                  <input
                    type="text"
                    value={
                      profile.is_active
                        ? 'Active'
                        : 'Inactive'
                    }
                    disabled
                  />
                </label>
              </div>

              <div className="profile-security-note">
                <ShieldCheck size={17} />

                <div>
                  <b>
                    Secura account security
                  </b>

                  <p>
                    Username, role and department
                    are controlled by the system
                    administrator and cannot be
                    edited here.
                  </p>
                </div>
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={() =>
                    setForm({
                      full_name:
                        profile.full_name ||
                        '',
                      email:
                        profile.email || '',
                    })
                  }
                >
                  Reset changes
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={saving}
                >
                  <Save size={14} />

                  {saving
                    ? 'Saving...'
                    : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

export default UserProfile