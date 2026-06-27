import { useState } from 'react'
import {
  User, Lock, Bell, Moon, Sun, Shield, LogOut,
  Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  Phone, Building2, Clock, Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { authApi } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'

const DEPARTMENTS = ['Sales', 'Marketing', 'Support', 'Operations', 'Management', 'Other']

// ── Shared style helpers ───────────────────────────────────────────────────
const card  = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5'
const label = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'
const input = (err) =>
  `w-full border rounded-lg px-3 py-2 text-sm outline-none transition
   bg-white dark:bg-slate-800
   text-slate-800 dark:text-slate-100
   placeholder:text-slate-400 dark:placeholder:text-slate-500
   focus:ring-2 focus:ring-brand-500 focus:border-brand-400
   ${err
     ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
     : 'border-slate-200 dark:border-slate-700'}`

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = 'text-brand-600 dark:text-brand-400', bg = 'bg-brand-50 dark:bg-brand-900/30' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
        <Icon size={15} className={color} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Profile section ────────────────────────────────────────────────────────
function ProfileSection({ user, updateUser }) {
  const [form, setForm]   = useState({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) e.phone = 'Enter a valid phone number'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const res = await authApi.updateProfile(form)
      updateUser(res.data.data)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={card}>
      <SectionHeader icon={User} title="Profile" subtitle="Update your personal information" />

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
            {(user?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name || '—'}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{user?.email || '—'}</p>
          <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            user?.role === 'admin'
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
          }`}>
            <Shield size={9} />
            {user?.role === 'admin' ? 'Administrator' : 'Staff'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className={label}>Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Your full name"
            className={input(errors.name)}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.name}</p>}
        </div>

        {/* Email (readonly) */}
        <div>
          <label className={label}>Email Address</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          />
          <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
        </div>

        {/* Phone */}
        <div>
          <label className={label}>Phone Number</label>
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className={`${input(errors.phone)} pl-8`}
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.phone}</p>}
        </div>

        {/* Department */}
        <div>
          <label className={label}>Department</label>
          <div className="relative">
            <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              className={`${input(false)} pl-8 appearance-none`}
            >
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg transition"
        >
          {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

// ── Change password section ────────────────────────────────────────────────
function PasswordSection() {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [show, setShow]     = useState({ current: false, new: false, confirm: false })

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((p) => ({ ...p, [k]: '' })) }
  const toggleShow = (k) => setShow((p) => ({ ...p, [k]: !p[k] }))

  const validate = () => {
    const e = {}
    if (!form.currentPassword)               e.currentPassword = 'Current password is required'
    if (!form.newPassword)                   e.newPassword     = 'New password is required'
    else if (form.newPassword.length < 6)    e.newPassword     = 'Minimum 6 characters'
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const strength = () => {
    const p = form.newPassword
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500']
  const s = strength()

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password changed successfully')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const pwdField = (key, placeholder, showKey) => (
    <div className="relative">
      <input
        type={show[showKey] ? 'text' : 'password'}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={`${input(errors[key])} pr-9`}
      />
      <button
        type="button"
        onClick={() => toggleShow(showKey)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {show[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )

  return (
    <div className={card}>
      <SectionHeader
        icon={Lock}
        title="Change Password"
        subtitle="Use a strong password you don't use elsewhere"
        color="text-purple-600 dark:text-purple-400"
        bg="bg-purple-50 dark:bg-purple-900/30"
      />

      <div className="space-y-4">
        <div>
          <label className={label}>Current Password</label>
          {pwdField('currentPassword', 'Enter current password', 'current')}
          {errors.currentPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.currentPassword}</p>}
        </div>

        <div>
          <label className={label}>New Password</label>
          {pwdField('newPassword', 'Min 6 characters', 'new')}
          {errors.newPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.newPassword}</p>}
          {/* Strength bar */}
          {form.newPassword && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${s >= i ? strengthColor[s] : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>
              <p className={`text-[11px] font-medium ${s <= 1 ? 'text-red-500' : s === 2 ? 'text-amber-500' : s === 3 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                {strengthLabel[s]}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className={label}>Confirm New Password</label>
          {pwdField('confirmPassword', 'Re-enter new password', 'confirm')}
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.confirmPassword}</p>}
          {form.confirmPassword && form.newPassword === form.confirmPassword && (
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle2 size={11} />Passwords match</p>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg transition"
        >
          {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={14} />}
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}

// ── Account info section ───────────────────────────────────────────────────
function AccountInfoSection({ user }) {
  const infoRows = [
    { label: 'Role',        value: user?.role === 'admin' ? 'Administrator' : 'Staff', icon: Shield },
    { label: 'Status',      value: 'Active',                  icon: CheckCircle2 },
    { label: 'Last Login',  value: user?.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd MMM yyyy, h:mm a') : 'N/A', icon: Clock },
    { label: 'Member Since',value: user?.createdAt  ? format(new Date(user.createdAt),  'dd MMM yyyy')           : 'N/A', icon: Calendar },
  ]

  return (
    <div className={card}>
      <SectionHeader
        icon={Shield}
        title="Account Info"
        subtitle="Your account details"
        color="text-slate-600 dark:text-slate-400"
        bg="bg-slate-100 dark:bg-slate-800"
      />
      <div className="space-y-3">
        {infoRows.map(({ label: lbl, value, icon: Icon }) => (
          <div key={lbl} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon size={12} />
              {lbl}
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Preferences section ────────────────────────────────────────────────────
function PreferencesSection() {
  const { isDark, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [themeConfirm, setThemeConfirm]   = useState(false)

  const items = [
    {
      id: 'darkMode',
      icon: isDark ? Moon : Sun,
      title: 'Dark Mode',
      desc: isDark ? 'Currently using dark theme' : 'Currently using light theme',
      checked: isDark,
      onChange: () => setThemeConfirm(true),
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      desc: 'In-app alerts and reminders',
      checked: notifications,
      onChange: setNotifications,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    },
  ]

  return (
    <>
      <div className={card}>
        <SectionHeader
          icon={Bell}
          title="Preferences"
          subtitle="Customize your experience"
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
        <div className="space-y-2">
          {items.map(({ id, icon: Icon, title, desc, checked, onChange, iconColor, iconBg }) => (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={14} className={iconColor} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{desc}</p>
                </div>
              </div>
              <Toggle id={id} checked={checked} onChange={onChange} />
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={themeConfirm}
        variant="theme"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        message={isDark ? 'This will switch the app to light mode.' : 'This will switch the app to dark mode.'}
        confirmLabel="Switch"
        confirmColor="indigo"
        onConfirm={() => { toggleTheme(); setThemeConfirm(false) }}
        onCancel={() => setThemeConfirm(false)}
      />
    </>
  )
}

// ── Danger zone / logout ───────────────────────────────────────────────────
function DangerSection() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`${card} border-red-200 dark:border-red-900/50`}>
      <SectionHeader
        icon={LogOut}
        title="Session"
        subtitle="Manage your current session"
        color="text-red-600 dark:text-red-400"
        bg="bg-red-50 dark:bg-red-900/30"
      />

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-2 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Are you sure you want to sign out?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              Yes, Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main settings page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser } = useAuth()

  return (
    <div className="space-y-1">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage your account preferences and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <ProfileSection  user={user} updateUser={updateUser} />
          <PasswordSection />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AccountInfoSection user={user} />
          <PreferencesSection />
          <DangerSection />
        </div>
      </div>
    </div>
  )
}
