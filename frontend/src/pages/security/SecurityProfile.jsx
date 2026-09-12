import {
  Camera,
  Check,
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

import api from '../../api/client'
import { useAuth } from '../../context/useAuth'

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

  if (loading) {
    return (
      <div className="security-profile-loading">
        <div />
        <div />
        <div />
      </div>
    )
  }

  return (
    <>
      <header className="security-profile-header">
        <p className="secura-eyebrow">
          SECURITY WORKSPACE
        </p>

        <h1>
          Security Officer profile
        </h1>

        <p>
          Manage your account information
          and Security Officer profile.
        </p>
      </header>

      {message && (
        <div className="security-profile-success">
          <Check size={16} />

          <span>
            {message}
          </span>

          <button
            type="button"
            aria-label="Dismiss message"
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
          className="security-profile-error"
          role="alert"
        >
          <ShieldCheck size={16} />

          <span>
            {error}
          </span>

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

      {profile && (
        <section className="security-profile-layout">
          <aside className="security-profile-identity">
            <div className="security-profile-avatar">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Security Officer profile"
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
              className="security-profile-photo-button"
              disabled={
                uploadingPhoto
              }
              onClick={() =>
                photoInputRef
                  .current
                  ?.click()
              }
            >
              <Camera size={14} />

              {uploadingPhoto
                ? 'Uploading...'
                : 'Change photo'}
            </button>

            <input
              ref={photoInputRef}
              type="file"
              className="security-profile-photo-input"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={
                handlePhotoChange
              }
            />

            <h2>
              {profile.full_name ||
                profile.username}
            </h2>

            <p>
              {profile.email}
            </p>

            <span className="security-profile-role">
              Security Officer
            </span>

            <div className="security-profile-status-card">
              <ShieldCheck
                size={18}
              />

              <div>
                <b>
                  Security access
                </b>

                <small>
                  Security monitoring
                  privileges active
                </small>
              </div>
            </div>
          </aside>

          <form
            className="security-profile-settings"
            onSubmit={
              handleSave
            }
          >
            <div className="security-profile-settings-heading">
              <div>
                <p className="secura-eyebrow">
                  ACCOUNT DETAILS
                </p>

                <h2>
                  Personal information
                </h2>
              </div>

              <span>
                <UserRound
                  size={19}
                />
              </span>
            </div>

            <div className="security-profile-form-grid">
              <label>
                Full name

                <input
                  type="text"
                  value={
                    form.full_name
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        full_name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label>
                Email address

                <div className="security-profile-input-icon">
                  <Mail
                    size={14}
                  />

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          email:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              </label>

              <label>
                Username

                <input
                  type="text"
                  value={
                    profile.username
                  }
                  disabled
                />
              </label>

              <label>
                Role

                <input
                  type="text"
                  value={
                    profile.role
                  }
                  disabled
                />
              </label>

              <label>
                Department

                <input
                  type="text"
                  value={
                    profile
                      .department_name ||
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

            <div className="security-profile-note">
              <ShieldCheck
                size={17}
              />

              <div>
                <b>
                  Protected Security Officer account
                </b>

                <p>
                  Username, role and
                  account status cannot
                  be changed from this
                  profile. Password reset
                  is managed by an
                  Administrator.
                </p>
              </div>
            </div>

            <div className="security-profile-actions">
              <button
                type="button"
                className="security-profile-reset"
                onClick={
                  resetChanges
                }
              >
                Reset changes
              </button>

              <button
                type="submit"
                className="security-profile-save"
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
    </>
  )
}

export default SecurityProfile