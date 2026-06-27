import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { followUpApi } from '../utils/api'
import { isToday, isPast, formatDistanceToNow, format } from 'date-fns'
import ConfirmModal from './ConfirmModal'
import Portal from './Portal'

import {
  LayoutDashboard,
  Users,
  PhoneCall,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ContactRound,
  UserCog,
  Sun,
  Moon,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  UserCheck,
  XCircle,
} from 'lucide-react'

const BASE_NAV = [
  { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/admin/leads',      icon: Users,           label: 'Leads'      },
  { to: '/admin/followups',  icon: PhoneCall,       label: 'Follow Ups' },
  { to: '/admin/calendar',   icon: CalendarDays,    label: 'Calendar'   },
  { to: '/admin/lost-leads', icon: XCircle,         label: 'Lost Leads' },
  { to: '/admin/customers',  icon: UserCheck,       label: 'Customers'  },
]

const ADMIN_NAV = [
  { to: '/admin/users', icon: UserCog, label: 'Users & Permissions' },
]

export default function AdminLayout() {
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [themeConfirm, setThemeConfirm]       = useState(false)
  const [showNotif, setShowNotif]             = useState(false)
  const [notifications, setNotifications]     = useState([])
  const [notifLoading, setNotifLoading]       = useState(false)
  const notifRef = useRef(null)

  // Close notification panel on click outside
  useEffect(() => {
    if (!showNotif) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotif])

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await followUpApi.getAll({ limit: 500 })
      const all = res.data.data || []
      const notifs = []
      all.forEach((f) => {
        try {
          const d = new Date(f.scheduledAt)
          if (f.outcome !== 'pending') return
          if (isPast(d) && !isToday(d)) {
            notifs.push({
              id:        f._id + '_o',
              type:      'overdue',
              title:     'Overdue Follow-up',
              desc:      `${f.lead?.name || 'Unknown'} — ${formatDistanceToNow(d, { addSuffix: true })}`,
              Icon:      AlertTriangle,
              iconColor: 'text-red-500 dark:text-red-400',
              iconBg:    'bg-red-50 dark:bg-red-900/30',
            })
          } else if (isToday(d)) {
            notifs.push({
              id:        f._id + '_t',
              type:      'today',
              title:     'Due Today',
              desc:      `${f.lead?.name || 'Unknown'} at ${format(d, 'h:mm a')}`,
              Icon:      CalendarDays,
              iconColor: 'text-brand-600 dark:text-brand-400',
              iconBg:    'bg-brand-50 dark:bg-brand-900/30',
            })
          }
        } catch { /* skip bad dates */ }
      })
      setNotifications(notifs)
    } catch { /* silent fail */ } finally {
      setNotifLoading(false)
    }
  }, [])

  // Fetch once on mount
  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50
          h-screen w-[260px]
          bg-gray-900 dark:bg-slate-950
          border-r border-gray-800 dark:border-slate-800
          flex flex-col
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* LOGO */}
        <div className="h-16 px-5 border-b border-gray-800 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/30">
              <ContactRound size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm leading-none">LeadFlow</h2>
              <p className="text-gray-500 text-[11px] mt-0.5">Lead Management</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div>
            <p className="px-2 text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">
              Main Menu
            </p>
            <div className="space-y-1">
              {BASE_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                    ${isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  <ChevronRight size={13} className="ml-auto opacity-0 group-hover:opacity-50 transition" />
                </NavLink>
              ))}
            </div>
          </div>

          {user?.role === 'admin' && (
            <div>
              <p className="px-2 text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">
                Administration
              </p>
              <div className="space-y-0.5">
                {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                      ${isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    <ChevronRight size={13} className="ml-auto opacity-0 group-hover:opacity-50 transition" />
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM */}
        <div className="p-3 border-t border-gray-800 dark:border-slate-800 space-y-0.5">
          <NavLink
            to="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <Settings size={16} />
            Settings
          </NavLink>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DARK MODE TOGGLE */}
            <button
              onClick={() => setThemeConfirm(true)}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif((v) => !v)}
                className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400"
                title="Notifications"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {/* PANEL */}
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                          {notifications.length} pending
                        </span>
                      )}
                      <button
                        onClick={() => fetchNotifications()}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                        title="Refresh"
                      >
                        <CalendarDays size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10">
                        <CheckCircle2 size={28} className="text-emerald-400" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">All caught up!</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">No overdue or pending alerts</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.slice(0, 8).map(({ id, title, desc, Icon, iconColor, iconBg }) => (
                          <div
                            key={id}
                            onClick={() => { navigate('/admin/followups'); setShowNotif(false) }}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                              <Icon size={13} className={iconColor} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <button
                      onClick={() => { navigate('/admin/followups'); setShowNotif(false) }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                      View all follow-ups <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* USER AVATAR */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <span className="text-brand-700 dark:text-brand-400 font-semibold text-xs">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'Admin'}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <Outlet />
        </main>
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

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <LogOut className="text-red-500" size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Confirm Logout</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Are you sure you want to sign out?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 rounded-xl text-sm font-medium transition text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  )
}
