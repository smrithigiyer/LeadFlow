import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ContactRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      await login(form.email, form.password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.friendlyMessage || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-tertiary/50 blur-3xl rounded-full" />

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        {/* Center Layout */}
        <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_480px] gap-10 items-center">

          {/* Left Content */}
          <div className="hidden lg:flex flex-col justify-center text-white">

            {/* Logo */}
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 mb-8">

              <ContactRound size={38} />
            </div>

            {/* Heading */}
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Manage Leads
              <span className="text-brand-400 block">
                Smarter & Faster
              </span>
            </h1>

            {/* Description */}
            <p className="text-tertiary text-lg leading-relaxed max-w-md">

              Streamline your lead management workflow with a modern,
              secure, and scalable CRM experience.
            </p>

            {/* Stats */}
            <div className="flex gap-6 mt-10 text-sm text-tertiary/80">


              <div>
                <h3 className="text-3xl font-bold text-white mb-1">
                  10K+
                </h3>
                Leads Managed
              </div>

              <div>
                <h3 className="text-3xl font-bold text-white mb-1">
                  99.9%
                </h3>
                Secure Access
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">

            {/* Mobile Logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">

              <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl mb-4">

                <ContactRound size={30} className="text-white" />
              </div>

              <h1 className="text-2xl font-bold text-white">
                LeadFlow
              </h1>

              <p className="text-slate-400 text-sm mt-1">
                Lead Management System
              </p>
            </div>

            {/* Card */}
            <div className="backdrop-blur-xl bg-white/95 border border-white/20 rounded-[32px] shadow-2xl p-6 sm:p-8">

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome Back
                </h2>

                <p className="text-gray-500 mt-2">
                  Sign in to continue to your dashboard
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">

                  <AlertCircle
                    size={18}
                    className="text-red-500 shrink-0 mt-0.5"
                  />

                  <span className="text-sm text-red-600">
                    {error}
                  </span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="admin@leadflow.app"
                      autoComplete="email"
                      className=" w-full h-14 rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-sm outline-none transition-all duration-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>

                  <div className="flex items-center justify-between mb-2">

                    <label className="text-sm font-semibold text-gray-700">
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="
                        w-full
                        h-14
                        rounded-2xl
                        border
                        border-gray-200
                        bg-white
                        pl-12
                        pr-12
                        text-sm
                        outline-none
                        transition-all
                        duration-200
                        focus:border-brand-500
                        focus:ring-4
                        focus:ring-brand-100
                      "
                    />

                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        text-gray-400
                        hover:text-gray-700
                        transition
                      "
                    >
                      {showPwd ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <div className="flex items-center justify-between text-sm">

                  <label className="flex items-center gap-2 text-gray-600">

                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />

                    Remember me
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full
                    h-14
                    rounded-2xl
                    bg-brand-600
                    hover:bg-brand-700
                    disabled:opacity-70
                    text-white
                    font-semibold
                    transition-all
                    duration-200
                    shadow-lg
                    hover:shadow-brand-500/30
                    flex
                    items-center
                    justify-center
                  "
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-sm text-gray-500 mt-8">
                Need access?
                <span className="text-brand-600 font-medium ml-1 cursor-pointer hover:text-brand-700">
                  Contact Administrator
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

  