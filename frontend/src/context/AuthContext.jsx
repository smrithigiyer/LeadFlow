import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../utils/api'
import { useTheme } from './ThemeContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)
  const { loadForUser, resetTheme } = useTheme()

  // On mount: verify stored token and load that user's theme
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    authApi.getMe()
      .then((res) => {
        const u = res.data.data
        setUser(u)
        loadForUser(u._id)   // restore this user's dark-mode preference
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        resetTheme()
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email, password) => {
    const res  = await authApi.login({ email, password })
    const { token, user: u } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('user',  JSON.stringify(u))
    setUser(u)
    loadForUser(u._id)   // load this user's saved theme
    return u
  }, [loadForUser])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    resetTheme()           // always return to light mode on logout
  }, [resetTheme])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
