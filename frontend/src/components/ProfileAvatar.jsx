import {
  useEffect,
  useRef,
  useState,
} from 'react'

import api from '../api/client'

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

function ProfileAvatar({
  name,
  className = '',
  alt = 'Profile',
}) {
  const [photoUrl, setPhotoUrl] =
    useState(null)

  const objectUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const clearObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(
          objectUrlRef.current,
        )

        objectUrlRef.current = null
      }
    }

    const loadPhoto = async () => {
      try {
        const profileResponse =
          await api.get('/profile')

        if (
          cancelled ||
          !profileResponse.data
            .has_profile_photo
        ) {
          if (!cancelled) {
            clearObjectUrl()
            setPhotoUrl(null)
          }

          return
        }

        const photoResponse =
          await api.get(
            '/profile/photo',
            {
              responseType: 'blob',
            },
          )

        if (cancelled) {
          return
        }

        const nextUrl =
          URL.createObjectURL(
            photoResponse.data,
          )

        clearObjectUrl()
        objectUrlRef.current = nextUrl
        setPhotoUrl(nextUrl)
      } catch {
        if (!cancelled) {
          clearObjectUrl()
          setPhotoUrl(null)
        }
      }
    }

    const handlePhotoUpdated = () => {
      loadPhoto()
    }

    loadPhoto()

    window.addEventListener(
      'secura-profile-photo-updated',
      handlePhotoUpdated,
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        'secura-profile-photo-updated',
        handlePhotoUpdated,
      )

      clearObjectUrl()
    }
  }, [])

  return (
    <span
      className={[
        'secura-live-avatar',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${name || 'User'} profile photo`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={alt}
        />
      ) : (
        <span>
          {getInitials(name)}
        </span>
      )}
    </span>
  )
}

export default ProfileAvatar
