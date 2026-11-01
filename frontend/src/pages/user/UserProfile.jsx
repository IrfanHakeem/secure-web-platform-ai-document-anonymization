import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  LockKeyhole,
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
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function UserProfile() {
  const navigate = useNavigate()
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
            // Profile remains usable
            // without a stored photo.
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            getApiError(
              loadError,
              'Unable to load your profile.',
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

        setPhotoUrl(newPhotoUrl)

        await verifySession()

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
            'Unable to update your profile photo.',
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
      <div className="bold-profile-loading">
        <div />
        <div />
        <div />
      </div>
    )
  }

  return (
    <section className="bold-profile-page page-enter">
      <div className="bold-profile-page__grid" />
      <div className="bold-profile-page__orb bold-profile-page__orb--one" />
      <div className="bold-profile-page__orb bold-profile-page__orb--two" />

      <div className="bold-profile-page__content">
        <header className="bold-profile-header">
          <div>
            <p className="secura-bold-kicker">
              SECURE WORKSPACE ACCOUNT
            </p>

            <h1>Profile</h1>

            <p>
              Manage your personal information
              and Secura workspace identity.
            </p>
          </div>

          <div className="bold-profile-header__actions">
            <button
              type="button"
              className="bold-profile-back"
              onClick={() =>
                navigate(
                  '/user/dashboard',
                )
              }
            >
              <ArrowLeft size={14} />
              Back to dashboard
            </button>

            {profile && (
              <span
                className={[
                  'bold-profile-status',
                  profile.is_active
                    ? 'is-active'
                    : 'is-inactive',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <i />
                {profile.is_active
                  ? 'Account active'
                  : 'Account inactive'}
              </span>
            )}
          </div>
        </header>

        {message && (
          <div className="bold-profile-feedback success">
            <Check size={16} />
            <span>{message}</span>

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
            className="bold-profile-feedback error"
            role="alert"
          >
            <ShieldCheck size={16} />
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

        {profile && (
          <div className="bold-profile-layout">
            <aside className="bold-profile-identity">
              <div className="bold-profile-identity__mesh" />

              <div className="bold-profile-avatar-wrap">
                <div className="bold-profile-avatar-ring">
                  <div className="bold-profile-avatar">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="User profile"
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
                </div>

                <button
                  type="button"
                  className="bold-profile-camera"
                  aria-label="Change profile photo"
                  disabled={
                    uploadingPhoto
                  }
                  onClick={() =>
                    photoInputRef
                      .current
                      ?.click()
                  }
                >
                  <Camera size={15} />
                </button>
              </div>

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

              <p>{profile.email}</p>

              <div className="bold-profile-role">
                <UserRound size={13} />
                {profile.role}
              </div>

              <button
                type="button"
                className="bold-profile-photo-action"
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
                  : 'Change profile photo'}
              </button>

              <small className="bold-profile-photo-help">
                JPG, JPEG, PNG or WEBP.
                Maximum 5 MB.
              </small>

              <div className="bold-profile-access-note">
                <span>
                  <ShieldCheck size={18} />
                </span>

                <div>
                  <b>Workspace access active</b>
                  <small>
                    Anonymization and approved
                    original-access workflows
                    are available for this account.
                  </small>
                </div>
              </div>
            </aside>

            <div className="bold-profile-main">
              <form
                className="bold-profile-card"
                onSubmit={handleSave}
              >
                <div className="bold-profile-card__head">
                  <div>
                    <p className="secura-bold-kicker">
                      PERSONAL INFORMATION
                    </p>

                    <h2>Account details</h2>

                    <p>
                      Update the information
                      associated with your account.
                    </p>
                  </div>

                  <span>
                    <UserRound size={18} />
                  </span>
                </div>

                <div className="bold-profile-edit-grid">
                  <label>
                    <span>Full name</span>

                    <div className="bold-profile-input">
                      <UserRound size={15} />

                      <input
                        type="text"
                        maxLength={150}
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
                    </div>
                  </label>

                  <label>
                    <span>Email address</span>

                    <div className="bold-profile-input">
                      <Mail size={15} />

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
                </div>

                <div className="bold-profile-card__actions">
                  <button
                    type="button"
                    className="bold-profile-reset"
                    onClick={
                      resetChanges
                    }
                  >
                    Reset changes
                  </button>

                  <button
                    type="submit"
                    className="bold-profile-save"
                    disabled={saving}
                  >
                    <Save size={14} />

                    {saving
                      ? 'Saving...'
                      : 'Save changes'}
                  </button>
                </div>
              </form>

              <section className="bold-profile-card">
                <div className="bold-profile-card__head">
                  <div>
                    <p className="secura-bold-kicker">
                      SYSTEM INFORMATION
                    </p>

                    <h2>Workspace account</h2>

                    <p>
                      These values are managed by
                      Secura and are read-only here.
                    </p>
                  </div>

                  <span>
                    <LockKeyhole size={18} />
                  </span>
                </div>

                <div className="bold-profile-facts">
                  <article>
                    <span>
                      <UserRound size={16} />
                    </span>

                    <div>
                      <small>Username</small>
                      <b>{profile.username}</b>
                    </div>
                  </article>

                  <article>
                    <span>
                      <ShieldCheck size={16} />
                    </span>

                    <div>
                      <small>Role</small>
                      <b>{profile.role}</b>
                    </div>
                  </article>

                  <article>
                    <span>
                      <Building2 size={16} />
                    </span>

                    <div>
                      <small>Department</small>
                      <b>
                        {profile.department_name ||
                          'Not assigned'}
                      </b>
                    </div>
                  </article>

                  <article>
                    <span>
                      <Check size={16} />
                    </span>

                    <div>
                      <small>Account status</small>
                      <b>
                        {profile.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </b>
                    </div>
                  </article>
                </div>

                <div className="bold-profile-managed-note">
                  <ShieldCheck size={18} />

                  <div>
                    <b>Protected Secura account</b>
                    <p>
                      Username, role, department and
                      account status are managed by an
                      Administrator. Password resets are
                      also handled by an Administrator.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default UserProfile
