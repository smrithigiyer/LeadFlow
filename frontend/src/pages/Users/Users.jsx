import { useEffect, useState, useCallback } from 'react'
import {
  UserPlus, RefreshCw, Search, X,
  Shield, ShieldCheck, Users, UserCheck, UserX,
  Pencil, Trash2, Power, Eye, EyeOff, Save, AlertCircle,
  Phone, Building2, Clock,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { userApi } from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmModal from '../../components/ConfirmModal'
import Portal from '../../components/Portal'

const DEPARTMENTS = ['Sales', 'Marketing', 'Support', 'Operations', 'Management', 'Other']

const ROLE_PERMISSIONS = {
  admin: [
    'View & manage all leads',
    'View & manage all follow-ups',
    'Create, edit and delete leads',
    'Import / export files (CSV & Excel)',
    'View dashboard analytics',
    'Manage users and permissions',
    'Access system settings',
    'Change password of own account',
  ],
  staff: [
    'View & manage all leads',
    'View & manage all follow-ups',
    'Create, edit and delete leads',
    'Import / export files (CSV & Excel)',
    'View dashboard analytics',
    'Change password of own account',
  ],
}

const RESTRICTED = [
  'Manage users and permissions',
  'Access system settings',
]

const ROLE_META = {
  admin: { label: 'Admin', cls: 'bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800' },
  staff: { label: 'Staff', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' },
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff', phone: '', department: '' }

export default function UsersPage() {
  const { user: me } = useAuth()

  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [showPerms, setShowPerms] = useState(null)
  const [deleteConfirm, setDeleteConfirm]   = useState({ open: false, user: null })
  const [toggleConfirm, setToggleConfirm]   = useState({ open: false, user: null })
  const [roleConfirm, setRoleConfirm]       = useState({ open: false, user: null, role: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userApi.getAll()
      setUsers(res.data.data || [])
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.department || '').toLowerCase().includes(q)
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total:    users.length,
    admins:   users.filter((u) => u.role === 'admin').length,
    staff:    users.filter((u) => u.role === 'staff').length,
    inactive: users.filter((u) => !u.isActive).length,
  }

  const handleToggleStatus = (u) => {
    setToggleConfirm({ open: true, user: u })
  }

  const confirmToggleStatus = async () => {
    const { user: u } = toggleConfirm
    setToggleConfirm({ open: false, user: null })
    try {
      await userApi.toggleStatus(u._id)
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`)
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Action failed')
    }
  }

  const handleDelete = (u) => {
    setDeleteConfirm({ open: true, user: u })
  }

  const confirmDelete = async () => {
    const { user: u } = deleteConfirm
    setDeleteConfirm({ open: false, user: null })
    try {
      await userApi.delete(u._id)
      toast.success('User deleted')
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Delete failed')
    }
  }

  const handleRoleChange = (u, role) => {
    if (u.role === role) return
    setRoleConfirm({ open: true, user: u, role })
  }

  const confirmRoleChange = async () => {
    const { user: u, role } = roleConfirm
    setRoleConfirm({ open: false, user: null, role: '' })
    try {
      await userApi.update(u._id, { role })
      toast.success(`${u.name}'s role changed to ${role}`)
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, role } : x))
      if (showPerms?._id === u._id) setShowPerms((p) => ({ ...p, role }))
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Role update failed')
    }
  }

  const handleRefresh = () => {
    setSearch('')
    setRoleFilter('')
    load()
  }

  const openCreate = () => { setEditUser(null); setShowModal(true) }
  const openEdit   = (u)  => { setEditUser(u);  setShowModal(true) }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: '#5C1B1B' }}>Users & Permissions</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage team members and their access levels</p>
        </div>
        {/* Mobile: compact icon button · sm+: pill with label */}
        <button
          onClick={openCreate}
          title="Add User"
          className="
            sm:hidden
            w-9 h-9 rounded-xl bg-[#5C1B1B] hover:bg-[#5C1B1B]
            flex items-center justify-center
            shadow-sm shadow-brand-900/30
            transition shrink-0
          "
        >
          <UserPlus size={16} className="text-white" />
        </button>
        <button
          onClick={openCreate}
          className="
            hidden sm:inline-flex items-center gap-2
            rounded-xl bg-[#5C1B1B] hover:bg-[#5C1B1B]
            px-4 py-2 text-xs font-semibold text-white
            shadow-sm shadow-brand-900/20
            transition shrink-0
          "
        >
          <UserPlus size={14} />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: stats.total,    icon: Users,      color: 'text-brand-600',  bg: 'bg-brand-50 dark:bg-brand-900/30'   },
          { label: 'Admins',       value: stats.admins,   icon: ShieldCheck,color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
          { label: 'Staff',        value: stats.staff,    icon: UserCheck,  color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
          { label: 'Inactive',     value: stats.inactive, icon: UserX,      color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800'     },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table + permissions */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">

        {/* User table */}
        <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Team Members</span>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-1.5 px-2 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 shrink-0"
              >
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-1.5 pl-7 pr-7 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={11} />
                  </button>
                )}
              </div>
              <button
                onClick={handleRefresh}
                title="Refresh"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shrink-0"
              >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Mobile card list (< md) ── */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <RefreshCw size={16} className="animate-spin opacity-50" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Users size={20} className="opacity-30" />
                <span className="text-xs">No users found</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <div key={u._id} className={`p-4 space-y-3 ${!u.isActive ? 'opacity-50' : ''}`}>
                    {/* Top row: avatar + info + badges */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                          {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{u.name}</p>
                          {u._id === me?._id && <span className="text-[10px] text-brand-500 font-medium">You</span>}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_META[u.role]?.cls}`}>
                          <Shield size={9} />{ROLE_META[u.role]?.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400 dark:text-slate-500">
                      {u.phone && <span className="flex items-center gap-1"><Phone size={10} />{u.phone}</span>}
                      {u.department && <span className="flex items-center gap-1"><Building2 size={10} />{u.department}</span>}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {u.lastLoginAt ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true }) : 'Never logged in'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPerms(showPerms?._id === u._id ? null : u)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border transition
                          ${showPerms?._id === u._id
                            ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                      >
                        <Shield size={12} /> Permissions
                      </button>
                      <button
                        onClick={() => openEdit(u)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      {u._id !== me?._id && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`py-1.5 px-3 rounded-lg border transition flex items-center justify-center
                            ${u.isActive
                              ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={13} />
                        </button>
                      )}
                      {u._id !== me?._id && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 transition flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  {['User', 'Contact', 'Department', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <RefreshCw size={16} className="animate-spin opacity-50" />
                        <span className="text-xs">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={20} className="opacity-30" />
                        <span className="text-xs">No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u._id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-brand-700 dark:text-brand-400">
                              {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{u.name}</p>
                            {u._id === me?._id && <span className="text-[10px] text-brand-500">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                        {u.phone && <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={9} />{u.phone}</p>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {u.department ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            <Building2 size={9} />{u.department}
                          </span>
                        ) : <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_META[u.role]?.cls}`}>
                          <Shield size={9} /> {ROLE_META[u.role]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1" title={format(new Date(u.lastLoginAt), 'dd MMM yyyy, h:mm a')}>
                            <Clock size={9} />{formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })}
                          </span>
                        ) : <span className="text-[10px] text-slate-300 dark:text-slate-600">Never</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Tip label="Permissions">
                            <button
                              onClick={() => setShowPerms(showPerms?._id === u._id ? null : u)}
                              className={`w-7 h-7 rounded-md border hover:shadow-sm transition flex items-center justify-center
                                ${showPerms?._id === u._id ? 'border-brand-300 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                            ><Shield size={13} /></button>
                          </Tip>
                          <Tip label="Edit">
                            <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center justify-center">
                              <Pencil size={13} />
                            </button>
                          </Tip>
                          {u._id !== me?._id && (
                            <Tip label={u.isActive ? 'Deactivate' : 'Activate'}>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`w-7 h-7 rounded-md border hover:shadow-sm transition flex items-center justify-center
                                  ${u.isActive ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'}`}
                              ><Power size={13} /></button>
                            </Tip>
                          )}
                          {u._id !== me?._id && (
                            <Tip label="Delete">
                              <button onClick={() => handleDelete(u)} className="w-7 h-7 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center">
                                <Trash2 size={13} />
                              </button>
                            </Tip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Panel — always in DOM, width animates open/closed */}
        <div
          style={{
            width:         showPerms ? '300px' : '0px',
            minWidth:      showPerms ? '300px' : '0px',
            opacity:       showPerms ? 1 : 0,
            pointerEvents: showPerms ? 'auto' : 'none',
            transition:    'width 0.32s cubic-bezier(0.4,0,0.2,1), min-width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
            overflow:      'hidden',
            flexShrink:    0,
          }}
          className="hidden xl:block"
        >
          {/* Inner div holds fixed width so content doesn't reflow during animation */}
          <div style={{ width: '300px' }}>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-fit">

              {showPerms && (
                <>
                  <div className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${showPerms.role === 'admin' ? 'bg-brand-600' : 'bg-indigo-600'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">
                          {showPerms.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{showPerms.name}</p>
                        <p className="text-[10px] text-white/70 capitalize">{showPerms.role} permissions</p>
                      </div>
                    </div>
                    <button onClick={() => setShowPerms(null)} className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
                      <X size={13} />
                    </button>
                  </div>

                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck size={13} className={showPerms.role === 'admin' ? 'text-brand-600' : 'text-indigo-600'} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {showPerms.role === 'admin' ? 'Full Access — Administrator' : 'Limited Access — Staff'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {showPerms.role === 'admin'
                        ? 'Can manage everything including users and system settings.'
                        : 'Can manage leads and follow-ups. Cannot access user management.'}
                    </p>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Granted Permissions</p>
                    {ROLE_PERMISSIONS[showPerms.role].map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">✓</span>
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{perm}</span>
                      </div>
                    ))}

                    {showPerms.role === 'staff' && (
                      <>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-3 mb-2">Restricted</p>
                        {RESTRICTED.map((perm) => (
                          <div key={perm} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                              <span className="text-red-500 text-[9px] font-bold">✕</span>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{perm}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {showPerms._id !== me?._id && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Change Role</p>
                        <div className="flex gap-2">
                          {['admin', 'staff'].map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(showPerms, role)}
                              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                                showPerms.role === role
                                  ? role === 'admin'
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {role === 'admin' ? 'Admin' : 'Staff'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Permissions modal — mobile/tablet (< xl, where the side panel is hidden) */}
      {showPerms && (
        <Portal>
          <div
            className="xl:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm"
            onClick={() => setShowPerms(null)}
          >
            <div
              className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle on mobile */}
              <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3" />

              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between ${showPerms.role === 'admin' ? 'bg-brand-600' : 'bg-indigo-600'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {showPerms.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{showPerms.name}</p>
                    <p className="text-[10px] text-white/70 capitalize">{showPerms.role} permissions</p>
                  </div>
                </div>
                <button onClick={() => setShowPerms(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
                  <X size={13} />
                </button>
              </div>

              {/* Access summary */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={13} className={showPerms.role === 'admin' ? 'text-brand-600' : 'text-indigo-600'} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {showPerms.role === 'admin' ? 'Full Access — Administrator' : 'Limited Access — Staff'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {showPerms.role === 'admin'
                    ? 'Can manage everything including users and system settings.'
                    : 'Can manage leads and follow-ups. Cannot access user management.'}
                </p>
              </div>

              {/* Permissions list */}
              <div className="p-4 space-y-1.5 max-h-[40vh] overflow-y-auto">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Granted Permissions</p>
                {ROLE_PERMISSIONS[showPerms.role].map((perm) => (
                  <div key={perm} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">✓</span>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300">{perm}</span>
                  </div>
                ))}
                {showPerms.role === 'staff' && (
                  <>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-3 mb-2">Restricted</p>
                    {RESTRICTED.map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                          <span className="text-red-500 text-[9px] font-bold">✕</span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{perm}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Change role */}
              {showPerms._id !== me?._id && (
                <div className="px-4 pb-5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Change Role</p>
                  <div className="flex gap-2">
                    {['admin', 'staff'].map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(showPerms, role)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                          showPerms.role === role
                            ? role === 'admin' ? 'bg-brand-600 text-white border-brand-600' : 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {role === 'admin' ? 'Admin' : 'Staff'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      {showModal && (
        <UserModal
          initial={editUser}
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onSaved={() => { setShowModal(false); setEditUser(null); load() }}
        />
      )}

      <ConfirmModal
        open={toggleConfirm.open}
        variant="warn"
        title={toggleConfirm.user?.isActive ? 'Deactivate User' : 'Activate User'}
        message={toggleConfirm.user?.isActive
          ? `Deactivating "${toggleConfirm.user?.name}" will prevent them from logging in.`
          : `Activating "${toggleConfirm.user?.name}" will restore their access.`}
        confirmLabel={toggleConfirm.user?.isActive ? 'Deactivate' : 'Activate'}
        confirmColor={toggleConfirm.user?.isActive ? 'amber' : 'brand'}
        onConfirm={confirmToggleStatus}
        onCancel={() => setToggleConfirm({ open: false, user: null })}
      />

      <ConfirmModal
        open={deleteConfirm.open}
        variant="delete"
        title="Delete User"
        message={`Are you sure you want to permanently delete "${deleteConfirm.user?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, user: null })}
      />

      <ConfirmModal
        open={roleConfirm.open}
        variant="warn"
        title="Change User Role"
        message={`Are you sure you want to change "${roleConfirm.user?.name}" from ${roleConfirm.user?.role === 'admin' ? 'Admin' : 'Staff'} to ${roleConfirm.role === 'admin' ? 'Admin' : 'Staff'}? ${roleConfirm.role === 'admin' ? 'This will grant them full access including user management.' : 'This will restrict their access to leads and follow-ups only.'}`}
        confirmLabel="Yes, Change Role"
        confirmColor="brand"
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleConfirm({ open: false, user: null, role: '' })}
      />
    </div>
  )
}

// ── Tooltip wrapper ────────────────────────────────────────────────────────
function Tip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </div>
  )
}

// ── User Create / Edit Modal ───────────────────────────────────────────────
function UserModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm]     = useState(
    isEdit
      ? { name: initial.name, email: initial.email, password: '', role: initial.role, phone: initial.phone || '', department: initial.department || '' }
      : { ...EMPTY_FORM }
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())          e.name     = 'Name is required'
    if (!isEdit && !form.email.trim()) e.email  = 'Email is required'
    if (!isEdit && !form.password)  e.password  = 'Password is required'
    if (form.password && form.password.length < 6) e.password = 'Min 6 characters'
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) e.phone = 'Enter a valid phone number'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) {
        const payload = { name: form.name, role: form.role, phone: form.phone, department: form.department }
        await userApi.update(initial._id, payload)
        toast.success('User updated')
      } else {
        await userApi.create(form)
        toast.success('User created successfully')
      }
      onSaved()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const inp = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand-500 focus:border-brand-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
      err ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'
    }`
  const lbl = 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block'

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r ${isEdit ? 'from-[#5C1B1B] to-[#5C1B1B]' : 'from-[#5C1B1B] to-[#5C1B1B]'}`}>
          <div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Edit User' : 'Add New User'}</h2>
            <p className="text-xs text-white/70 mt-0.5">{isEdit ? `Editing ${initial.name}` : 'Create a team member account'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">

          {/* Name */}
          <div>
            <label className={lbl}>Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ravi Kumar" className={inp(errors.name)} />
            {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={lbl}>Email Address *</label>
            <input
              type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="ravi@company.com" disabled={isEdit}
              className={`${inp(errors.email)} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.email}</p>}
            {isEdit && <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed after creation.</p>}
          </div>

          {/* Password — create only */}
          {!isEdit && (
            <div>
              <label className={lbl}>Password *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 characters" className={`${inp(errors.password)} pr-9`} />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.password}</p>}
            </div>
          )}

          {/* Phone + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <div className="relative">
                <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765…" className={`${inp(errors.phone)} pl-7`} />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className={lbl}>Department</label>
              <div className="relative">
                <Building2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select value={form.department} onChange={(e) => set('department', e.target.value)} className={`${inp(false)} pl-7 appearance-none`}>
                  <option value="">— Select —</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className={lbl}>Role & Permissions</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'admin', label: 'Admin', desc: 'Full access including user management', icon: ShieldCheck, sel: 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' },
                { value: 'staff', label: 'Staff',  desc: 'Leads & follow-ups access only',        icon: Users,       sel: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className={`p-3 rounded-xl border-2 text-left transition ${form.role === r.value ? r.sel : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}`}
                >
                  <r.icon size={15} className={`mb-1.5 ${form.role === r.value ? '' : 'text-slate-400'}`} />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{r.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {form.role === 'admin'
                ? 'Admin users can create and delete other accounts. Grant this role carefully.'
                : 'Staff users can manage leads and follow-ups but cannot access user management.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-300">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-[#5C1B1B] hover:bg-[#5C1B1B] disabled:opacity-60 text-white rounded-lg transition flex items-center gap-2"
          >
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
