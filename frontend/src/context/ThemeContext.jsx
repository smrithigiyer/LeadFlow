import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const ThemeContext = createContext(null)

const themeKey = (userId) => `theme_${userId}`

/** Direct, synchronous DOM update — no React cycle needed */
function applyDark(dark) {
  if (dark) document.documentElement.classList.add('dark')
  else      document.documentElement.classList.remove('dark')
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)
  const userIdRef  = useRef(null)
  const isDarkRef  = useRef(false)  // mirrors isDark; safe to read inside callbacks

  // Safety-net: keeps DOM in sync if state changes from outside (e.g. SSR, HMR)
  useEffect(() => {
    applyDark(isDark)
    isDarkRef.current = isDark
  }, [isDark])

  // Called by AuthContext after login / token-verify
  const loadForUser = useCallback((userId) => {
    userIdRef.current = userId
    const dark = !!(userId && localStorage.getItem(themeKey(userId)) === 'dark')
    isDarkRef.current = dark
    applyDark(dark)        // immediate DOM update
    setIsDark(dark)        // React state sync
  }, [])

  // Called by AuthContext on logout — always return to light
  const resetTheme = useCallback(() => {
    userIdRef.current  = null
    isDarkRef.current  = false
    applyDark(false)
    setIsDark(false)
  }, [])

  // Called from the Settings toggle and topbar button
  const toggleTheme = useCallback(() => {
    const next = !isDarkRef.current   // read ref — never stale
    isDarkRef.current = next
    applyDark(next)                   // immediate DOM update (synchronous)
    if (userIdRef.current) {
      localStorage.setItem(themeKey(userIdRef.current), next ? 'dark' : 'light')
    }
    setIsDark(next)                   // React state sync (triggers re-renders)
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, loadForUser, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
