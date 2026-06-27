import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Pencil, Trash2, PhoneCall,
  CalendarDays, Download, X, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Users,
  ChevronLeft, ChevronRight, Phone, Mail, Video, Layers, Tag, StickyNote,
} from 'lucide-react'
import { format, isToday, isTomorrow, isYesterday, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import FollowUpForm from './FollowUpForm'
import ConfirmModal from '../../components/ConfirmModal'
import NotesDrawer from '../../components/NotesDrawer'
import { followUpApi } from '../../utils/api'

// ── Maps ──────────────────────────────────────────────────────────────────────
const OUTCOME_META = {
  pending:     { label: 'Pending',     badge: 'bg-yellow-50 text-yellow-600 border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
  completed:   { label: 'Completed',   badge: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  no_answer:   { label: 'No Answer',   badge: 'bg-red-50 text-red-500 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  rescheduled: { label: 'Rescheduled', badge: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  cancelled:   { label: 'Cancelled',   badge: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
}

const TYPE_META = {
  call:    { label: 'Call',    icon: Phone  },
  email:   { label: 'Email',   icon: Mail   },
  meeting: { label: 'Meeting', icon: Video  },
  demo:    { label: 'Demo',    icon: Layers },
  other:   { label: 'Other',   icon: Layers },
}

const ALL_OUTCOMES = ['pending', 'completed', 'no_answer', 'rescheduled', 'cancelled']
const ITEMS_PER_PAGE = 10

function scheduledLabel(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isToday(d))    return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    if (isPast(d))     return 'Overdue'
    return format(d, 'dd MMM yyyy')
  } catch { return '—' }
}

function scheduledColor(iso, outcome) {
  if (!iso || outcome !== 'pending') return 'text-slate-500 dark:text-slate-400'
  try {
    const d = new Date(iso)
    if (isToday(d))    return 'text-brand-600 dark:text-brand-400 font-semibold'
    if (isTomorrow(d)) return 'text-emerald-600 dark:text-emerald-400 font-semibold'
    if (isPast(d))     return 'text-red-500 dark:text-red-400 font-semibold'
    return 'text-slate-600 dark:text-slate-300'
  } catch { return 'text-slate-500 dark:text-slate-400' }
}

export default function FollowUps() {
  const [followups, setFollowups]           = useState([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [outcomeFilter, setOutcomeFilter]   = useState('')
  const [scheduleFilter, setScheduleFilter] = useState('')
  const [currentPage, setCurrentPage]       = useState(1)
  const [showForm, setShowForm]             = useState(false)
  const [editItem, setEditItem]             = useState(null)
  const [formLead, setFormLead]             = useState(null)
  const [deleteConfirm, setDeleteConfirm]   = useState({ open: false, item: null })
  const [completeConfirm, setCompleteConfirm] = useState({ open: false, id: null })
  const [notesDrawer, setNotesDrawer]       = useState({ open: false, item: null })

  // ── Bulk state ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]             = useState(new Set())
  const [bulkPanel, setBulkPanel]                 = useState(null) // 'outcome' | null
  const [bulkOutcome, setBulkOutcome]             = useState('')
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fuRes = await followUpApi.getAll({ limit: 500 })
      setFollowups(fuRes.data.data || [])
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, outcomeFilter, scheduleFilter])
  useEffect(() => { setSelectedIds(new Set()); setBulkPanel(null) }, [currentPage, search, outcomeFilter, scheduleFilter])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:   followups.length,
    pending: followups.filter((f) => f.outcome === 'pending').length,
    today:   followups.filter((f) => { try { return isToday(new Date(f.scheduledAt)) } catch { return false } }).length,
    overdue: followups.filter((f) => {
      try { return f.outcome === 'pending' && isPast(new Date(f.scheduledAt)) && !isToday(new Date(f.scheduledAt)) } catch { return false }
    }).length,
  }

  // ── Client-side filter + paginate ─────────────────────────────────────────
  const filtered = followups.filter((f) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      (f.lead?.name  || '').toLowerCase().includes(q) ||
      (f.lead?.email || '').toLowerCase().includes(q) ||
      (f.lead?.phone || '').toLowerCase().includes(q) ||
      (f.notes       || '').toLowerCase().includes(q)
    const matchOutcome  = !outcomeFilter || f.outcome === outcomeFilter
    const matchSchedule = !scheduleFilter || (() => {
      if (!f.scheduledAt) return false
      try {
        const d = new Date(f.scheduledAt)
        if (scheduleFilter === 'yesterday') return isYesterday(d)
        if (scheduleFilter === 'today')     return isToday(d)
        if (scheduleFilter === 'tomorrow')  return isTomorrow(d)
      } catch { return false }
      return false
    })()
    return matchSearch && matchOutcome && matchSchedule
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allOnPageSelected  = paginated.length > 0 && paginated.every((f) => selectedIds.has(f._id))
  const someOnPageSelected = !allOnPageSelected && paginated.some((f) => selectedIds.has(f._id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map((f) => f._id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSelection = () => { setSelectedIds(new Set()); setBulkPanel(null); setBulkOutcome('') }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setSearch(''); setOutcomeFilter(''); setScheduleFilter(''); setCurrentPage(1); load()
  }

  const openCreate = () => { setEditItem(null); setFormLead(null); setShowForm(true) }
  const openEdit   = (item) => { setEditItem(item); setFormLead(item.lead || null); setShowForm(true) }

  const handleOutcomeChange = async (id, outcome) => {
    setFollowups((prev) => prev.map((f) => f._id === id ? { ...f, outcome } : f))
    try {
      await followUpApi.updateOutcome(id, outcome)
      toast.success('Outcome updated')
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Update failed')
      load()
    }
  }

  const handleDelete = (item) => setDeleteConfirm({ open: true, item })

  const confirmDelete = async () => {
    const { item } = deleteConfirm
    setDeleteConfirm({ open: false, item: null })
    try {
      await followUpApi.delete(item._id)
      toast.success('Follow-up deleted')
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Delete failed')
    }
  }

  const handleExport = () => {
    const source = selectedIds.size > 0 ? filtered.filter((f) => selectedIds.has(f._id)) : filtered
    const headers = ['Lead Name', 'Lead Email', 'Lead Phone', 'Type', 'Scheduled At', 'Outcome', 'Notes']
    const rows = source.map((f) => [
      f.lead?.name  || '', f.lead?.email || '', f.lead?.phone || '',
      f.type,
      f.scheduledAt ? format(new Date(f.scheduledAt), 'dd MMM yyyy HH:mm') : '',
      f.outcome, f.notes || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: selectedIds.size > 0 ? 'followups-selected.csv' : 'followups.csv',
    })
    a.click()
    toast.success(`${source.length} follow-ups exported`)
  }

  // ── Bulk handlers ─────────────────────────────────────────────────────────
  const handleBulkOutcome = async () => {
    try {
      const { data } = await followUpApi.bulk({ ids: [...selectedIds], action: 'outcome', outcome: bulkOutcome })
      toast.success(`${data.data.modified} follow-ups updated`)
      setFollowups((prev) => prev.map((f) => selectedIds.has(f._id) ? { ...f, outcome: bulkOutcome } : f))
      clearSelection()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk update failed')
    }
  }

  const handleBulkComplete = async () => {
    try {
      const { data } = await followUpApi.bulk({ ids: [...selectedIds], action: 'outcome', outcome: 'completed' })
      toast.success(`${data.data.modified} follow-ups marked complete`)
      setFollowups((prev) => prev.map((f) => selectedIds.has(f._id) ? { ...f, outcome: 'completed' } : f))
      clearSelection()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk complete failed')
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { data } = await followUpApi.bulk({ ids: [...selectedIds], action: 'delete' })
      toast.success(`${data.data.modified} follow-ups deleted`)
      setBulkDeleteConfirm(false)
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk delete failed')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Follow-ups</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track all scheduled follow-up activities</p>
        </div>
        <button
          onClick={openCreate}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
        >
          <Plus size={14} /> Add Follow-up
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: stats.total,   icon: Users,         color: 'text-brand-600 dark:text-brand-400',   bg: 'bg-brand-50 dark:bg-brand-900/30'   },
          { label: 'Pending', value: stats.pending, icon: Clock,         color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
          { label: 'Today',   value: stats.today,   icon: CalendarDays,  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/30'     },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-500 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/30'       },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon size={17} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          {selectedIds.size > 0 ? (
            /* ── Bulk action bar ── */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                  <X size={13} />
                </button>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Mark Complete */}
              <button
                onClick={handleBulkComplete}
                className="inline-flex items-center gap-1 rounded-lg border border-[#5C1B1B] bg-[#5C1B1B]/10 text-[#5C1B1B] dark:bg-[#5C1B1B]/20 dark:border-[#5C1B1B] dark:text-[#5C1B1B] px-2.5 py-1.5 text-xs font-medium hover:bg-[#5C1B1B]/20 dark:hover:bg-[#5C1B1B]/30 transition"
              >
                <CheckCircle2 size={12} /> Mark Complete
              </button>

              {/* Set Outcome */}
              <button
                onClick={() => setBulkPanel(bulkPanel === 'outcome' ? null : 'outcome')}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  bulkPanel === 'outcome'
                    ? 'border-brand-300 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Tag size={12} /> Set Outcome
              </button>
              {bulkPanel === 'outcome' && (
                <div className="flex items-center gap-1">
                  <select
                    value={bulkOutcome}
                    onChange={(e) => setBulkOutcome(e.target.value)}
                    autoFocus
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                  >
                    <option value="">Pick outcome…</option>
                    {ALL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{OUTCOME_META[o]?.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkOutcome}
                    disabled={!bulkOutcome}
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Export selected */}
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <Download size={12} /> Export
              </button>

              {/* Delete */}
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-2.5 py-1.5 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ) : (
            /* ── Normal toolbar ── */
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Follow-ups</span>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 rounded-full px-2 py-0.5">
                  {filtered.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search lead..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 py-1.5 pl-7 pr-7 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={11} />
                    </button>
                  )}
                </div>

                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                >
                  <option value="">All Outcomes</option>
                  {ALL_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{OUTCOME_META[o]?.label}</option>
                  ))}
                </select>

                <select
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                >
                  <option value="">All Scheduled</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition"
                >
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = someOnPageSelected }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                  />
                </th>
                {['Lead', 'Phone', 'Type', 'Scheduled', 'Outcome', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw size={16} className="animate-spin opacity-50" />
                      <span className="text-xs">Loading follow-ups…</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
                      <PhoneCall size={20} />
                      <span className="text-xs text-slate-400">No follow-ups found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const oMeta    = OUTCOME_META[item.outcome] || OUTCOME_META.pending
                  const tMeta    = TYPE_META[item.type]       || TYPE_META.call
                  const TypeIcon = tMeta.icon
                  const isOverdue = item.outcome === 'pending' && (() => {
                    try { return isPast(new Date(item.scheduledAt)) && !isToday(new Date(item.scheduledAt)) } catch { return false }
                  })()

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        selectedIds.has(item._id) ? 'bg-brand-50/40 dark:bg-brand-900/10' :
                        isOverdue ? 'bg-red-50/20 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item._id)}
                          onChange={() => toggleSelect(item._id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                        />
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.lead?.name || '—'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.lead?.email || ''}</p>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.lead?.phone || '—'}</span>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                          <TypeIcon size={9} />
                          {tMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`text-xs ${scheduledColor(item.scheduledAt, item.outcome)}`}>
                          {scheduledLabel(item.scheduledAt)}
                        </span>
                        {item.scheduledAt && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {format(new Date(item.scheduledAt), 'HH:mm')}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${oMeta.badge}`}>
                          {oMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 max-w-[160px]">
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.notes || '—'}</p>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* Complete */}
                          <div className="relative group/tip">
                            <button
                              onClick={() => setCompleteConfirm({ open: true, id: item._id })}
                              disabled={item.outcome === 'completed'}
                              className="w-7 h-7 rounded-md border border-[#5C1B1B] bg-[#5C1B1B]/10 text-[#5C1B1B] hover:bg-[#5C1B1B]/20 hover:border-[#5C1B1B] hover:shadow-sm transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#5C1B1B]/20 dark:border-[#5C1B1B] dark:text-[#5C1B1B] dark:hover:bg-[#5C1B1B]/30 dark:hover:border-[#5C1B1B]"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                              {item.outcome === 'completed' ? 'Completed' : 'Complete'}
                            </span>
                          </div>
                          {/* Edit */}
                          <div className="relative group/tip">
                            <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-md border border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition flex items-center justify-center dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:border-amber-700">
                              <Pencil size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">Edit</span>
                          </div>
                          {/* Notes */}
                          <div className="relative group/tip">
                            <button
                              onClick={() => setNotesDrawer({ open: true, item })}
                              className="w-7 h-7 rounded-md border border-brand-200 bg-brand-50 text-brand-500 hover:bg-brand-100 hover:border-brand-300 hover:shadow-sm transition flex items-center justify-center dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-900/30 dark:hover:border-brand-700"
                            >
                              <StickyNote size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">Notes</span>
                          </div>
                          {/* Delete */}
                          <div className="relative group/tip">
                            <button onClick={() => handleDelete(item)} className="w-7 h-7 rounded-md border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:border-red-300 hover:shadow-sm transition flex items-center justify-center dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-700">
                              <Trash2 size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">Delete</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {filtered.length === 0 ? 'No results' : (
              <>Showing{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {' – '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span>
                {' of '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{filtered.length}</span>
                {' follow-ups'}
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              <ChevronLeft size={12} /> Prev
            </button>
            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`e-${i}`} className="w-6 h-6 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600">…</span>
              ) : (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-6 h-6 rounded-md text-[11px] font-medium transition ${currentPage === page ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {page}
                </button>
              )
            )}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <FollowUpForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); setFormLead(null) }}
        lead={formLead}
        initial={editItem}
        onSaved={load}
      />

      {/* Complete confirm */}
      <ConfirmModal
        open={completeConfirm.open}
        variant="success"
        title="Mark as Completed"
        message="Mark this follow-up as completed? This will update its outcome to Completed."
        confirmLabel="Mark Complete"
        confirmColor="#5C1B1B"
        onConfirm={() => {
          handleOutcomeChange(completeConfirm.id, 'completed')
          setCompleteConfirm({ open: false, id: null })
        }}
        onCancel={() => setCompleteConfirm({ open: false, id: null })}
      />

      {/* Single delete */}
      <ConfirmModal
        open={deleteConfirm.open}
        variant="delete"
        title="Delete Follow-up"
        message={`Delete the follow-up for "${deleteConfirm.item?.lead?.name || 'this lead'}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
      />

      {/* Bulk delete */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        variant="delete"
        title="Delete Selected Follow-ups"
        message={`Delete ${selectedIds.size} follow-up${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        confirmColor="red"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Follow-up notes drawer */}
      <NotesDrawer
        open={notesDrawer.open}
        targetId={notesDrawer.item?._id}
        targetType="followup"
        title="Follow-up Notes"
        subtitle={notesDrawer.item?.lead?.name ?? undefined}
        initialNote={notesDrawer.item?.notes || null}
        onClose={() => setNotesDrawer({ open: false, item: null })}
      />
    </div>
  )
}
