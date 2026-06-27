import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

// Apply the current user's saved theme before first paint to prevent flash
;(function () {
  try {
    const stored = localStorage.getItem('user')
    const userId = stored ? JSON.parse(stored)?._id : null
    if (userId && localStorage.getItem(`theme_${userId}`) === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch (_) { /* ignore */ }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#14b8a6', secondary: '#f8fafc' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#f8fafc' } },
          }}
        />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
