import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../api/client'
import AuthContext from './AuthContext'

function AuthProvider({ children }) {
  const existingToken = localStorage.getItem('secura_access_token')

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(existingToken))

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('secura_access_token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return null
    }

    setLoading(true)

    try {
      const response = await api.get('/auth/verify')
      setUser(response.data)
      return response.data
    } catch (error) {
      localStorage.removeItem('secura_access_token')
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('secura_access_token')

    if (!token) {
      return
    }

    let cancelled = false

    api
      .get('/auth/verify')
      .then((response) => {
        if (!cancelled) {
          setUser(response.data)
        }
      })
      .catch(() => {
        localStorage.removeItem('secura_access_token')

        if (!cancelled) {
          setUser(null)
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

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    })

    const token = response.data.access_token

    if (!token) {
      throw new Error('Authentication token was not returned by the server.')
    }

    localStorage.setItem('secura_access_token', token)

    try {
      const verifyResponse = await api.get('/auth/verify')
      setUser(verifyResponse.data)
      return verifyResponse.data
    } catch (error) {
      localStorage.removeItem('secura_access_token')
      setUser(null)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('secura_access_token')
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      verifySession,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, verifySession],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider