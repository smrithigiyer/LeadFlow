import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, RotateCcw, Pencil,
  XCircle, TrendingDown, MessageSquareOff, AlertTriangle,
  ChevronLeft, ChevronRight, Building2, UserCheck, X,
  CalendarDays, Trash2, Download,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { lostLeadsApi, leadApi } from '../../utils/api'
import { STATUS_META, LOST_REASON_META, LOST_REASON_OPTIONS } from '../Leads/leadConstants'
import ConfirmModal from '../../components/ConfirmModal'
import { useUsers } from '../../hooks/useUsers'

const ALL_LOST_STATUSES = ['lost', 'not_interested', 'no_response']
const ITEMS_PER_PAGE = 10

export default function LostLeads() {
  const [leads, setLeads]               = useState([])
  const [stats, setStats]               = useState({ total: 0, lost: 0, notInterested: 0, noResponse: 0 })
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const [reactivating, setReactivating] = useState(null)
  const [confirmOpen, setConfirmOpen]   = useState(false)

  // ── Edit lost reason state ─────────────────────────────────────────────────
  const [editTarget, setEditTarget]   = useState(null)
  const [editReason, setEditReason]   = useState('')
  const [editNote,   setEditNote]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  // ── Bulk state ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]           = useState(new Set())
  const [bulkPanel, setBulkPanel]               = useState(null) // 'assign' | null
  const [bulkAssign, setBulkAssign]             = useState('')
  const [bulkReactivateConfirm, setBulkReactivateConfirm] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm]         = useState(false)

  const users = useUsers()

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.all([
        lostLeadsApi.getAll({
          page:       currentPage,
          limit:      ITEMS_PER_PAGE,
          search:     search       || undefined,
          status:     statusFilter || undefined,
          lostReason: reasonFilter || undefined,
          from:       dateFrom     || undefined,
          to:         dateTo       || undefined,
        }),
        lostLeadsApi.getStats(),
      ])
      setLeads(leadsRes.data.data || [])
      setTotalCount(leadsRes.data.meta?.total || leadsRes.data.pagination?.total || 0)
      const s = statsRes.data.data || {}
      setStats({
        total:         s.total         || 0,
        lost:          s.lost          || 0,
        notInterested: s.notInterested || 0,
        noResponse:    s.noResponse    || 0,
      })
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to load lost leads')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter, reasonFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, reasonFilter, dateFrom, dateTo])
  useEffect(() => { setSelectedIds(new Set()); setBulkPanel(null) }, [currentPage, search, statusFilter, reasonFilter, dateFrom, dateTo])

  const handleRefresh = () => {
    setSearch('')
    setStatusFilter('')
    setReasonFilter('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allOnPageSelected  = leads.length > 0 && leads.every((l) => selectedIds.has(l._id))
  const someOnPageSelected = !allOnPageSelected && leads.some((l) => selectedIds.has(l._id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map((l) => l._id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSelection = () => { setSelectedIds(new Set()); setBulkPanel(null); setBulkAssign('') }

  // ── Edit lost reason ──────────────────────────────────────────────────────
  const openEdit = (lead) => {
    setEditTarget(lead)
    setEditReason(lead.lostReason || '')
    setEditNote(lead.lostNote   || '')
  }

  const handleEditSave = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      await lostLeadsApi.updateInfo(editTarget._id, { lostReason: editReason, lostNote: editNote })
      toast.success('Updated successfully')
      setLeads((prev) => prev.map((l) =>
        l._id === editTarget._id ? { ...l, lostReason: editReason, lostNote: editNote } : l
      ))
      setEditTarget(null)
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Update failed')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Reactivate (single) ────────────────────────────────────────────────────
  const handleReactivateClick = (lead) => {
    setReactivating(lead)
    setConfirmOpen(true)
  }

  const confirmReactivate = async () => {
    if (!reactivating) return
    try {
      await lostLeadsApi.reactivate(reactivating._id)
      toast.success(`"${reactivating.name}" moved back to New`)
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to reactivate')
    } finally {
      setConfirmOpen(false)
      setReactivating(null)
    }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'assign', assignedTo: bulkAssign })
      toast.success(`${data.data.modified} leads assigned`)
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk assign failed')
    }
  }

  const handleBulkReactivate = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'reactivate' })
      toast.success(`${data.data.modified} leads reactivated`)
      setBulkReactivateConfirm(false)
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk reactivate failed')
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'delete' })
      toast.success(`${data.data.modified} leads deleted`)
      setBulkDeleteConfirm(false)
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk delete failed')
    }
  }

  const handleBulkExport = () => {
    const sel = leads.filter((l) => selectedIds.has(l._id))
    const headers = ['Name','Email','Phone','Company','Status','Lost Reason','Assigned To','Updated At']
    const rows = sel.map((l) => [
      l.name, l.email, l.phone, l.company || '', l.status,
      l.lostReason || '', l.assignedTo || '',
      l.updatedAt ? new Date(l.updatedAt).toISOString().split('T')[0] : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'lost-leads-selected.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${sel.length} leads exported`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Lost Leads</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Leads that didn't convert — review and reactivate when ready</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Lost',      value: stats.total,         icon: XCircle,          color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-900/30'     },
          { label: 'Lost',            value: stats.lost,           icon: TrendingDown,     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
          { label: 'Not Interested',  value: stats.notInterested,  icon: MessageSquareOff, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/30'   },
          { label: 'No Response',     value: stats.noResponse,     icon: AlertTriangle,    color: 'text-gray-500 dark:text-slate-400',    bg: 'bg-gray-100 dark:bg-slate-800'      },
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
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition" title="Clear selection">
                  <X size={13} />
                </button>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Assign To */}
              <button
                onClick={() => setBulkPanel(bulkPanel === 'assign' ? null : 'assign')}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  bulkPanel === 'assign'
                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <UserCheck size={12} /> Assign To
              </button>
              {bulkPanel === 'assign' && (
                <div className="flex items-center gap-1">
                  <select
                    value={bulkAssign}
                    onChange={(e) => setBulkAssign(e.target.value)}
                    autoFocus
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-rose-400 cursor-pointer w-44"
                  >
                    <option value="">Pick user…</option>
                    {users.map((u) => (
                      <option key={u._id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkAssign}
                    className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 transition"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Reactivate */}
              <button
                onClick={() => setBulkReactivateConfirm(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
              >
                <RotateCcw size={12} /> Reactivate
              </button>

              {/* Export */}
              <button
                onClick={handleBulkExport}
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lost Leads</span>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 rounded-full px-2 py-0.5">
                  {totalCount}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 py-1.5 pl-7 pr-7 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 placeholder:text-slate-400"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-rose-400 cursor-pointer"
                >
                  <option value="">All Status</option>
                  {ALL_LOST_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                  ))}
                </select>

                {/* Reason filter */}
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-rose-400 cursor-pointer"
                >
                  <option value="">All Reasons</option>
                  {LOST_REASON_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Date range */}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
                  <CalendarDays size={12} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none w-28 cursor-pointer"
                    title="From date"
                  />
                  <span className="text-[10px] text-slate-400">–</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none w-28 cursor-pointer"
                    title="To date"
                  />
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-slate-400 hover:text-slate-600 ml-0.5">
                      <X size={11} />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
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
                    className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                  />
                </th>
                {['Lead Name', 'Phone', 'Email', 'Company', 'Assigned To', 'Status', 'Reason / Note', 'Updated', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw size={16} className="animate-spin opacity-50" />
                      <span className="text-xs">Loading lost leads…</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
                      <XCircle size={20} />
                      <span className="text-xs text-slate-400">No lost leads found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const sMeta = STATUS_META[lead.status] || {}
                  const rMeta = lead.lostReason ? LOST_REASON_META[lead.lostReason] : null
                  return (
                    <tr
                      key={lead._id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group ${selectedIds.has(lead._id) ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead._id)}
                          onChange={() => toggleSelect(lead._id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        />
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{lead.name}</p>
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{lead.phone || '—'}</span>
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{lead.email || '—'}</span>
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        {lead.company ? (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Building2 size={11} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            {lead.company}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <UserCheck size={11} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            {lead.assignedTo}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sMeta.color}`}>
                          {sMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-2 max-w-[180px]">
                        {rMeta ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${rMeta.color}`}>
                            {rMeta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                        {lead.lostNote && (
                          <p
                            className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2"
                            title={lead.lostNote}
                          >
                            {lead.lostNote}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {lead.updatedAt ? format(new Date(lead.updatedAt), 'dd MMM yyyy') : '—'}
                        </span>
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <div className="relative group/tip">
                            <button
                              onClick={() => openEdit(lead)}
                              className="w-7 h-7 rounded-md border border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:border-amber-700 hover:shadow-sm transition flex items-center justify-center"
                            >
                              <Pencil size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
                              Edit Reason
                            </span>
                          </div>
                          <div className="relative group/tip">
                            <button
                              onClick={() => handleReactivateClick(lead)}
                              className="w-7 h-7 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700 hover:shadow-sm transition flex items-center justify-center"
                            >
                              <RotateCcw size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
                              Reactivate
                            </span>
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
            {totalCount === 0 ? 'No results' : (
              <>
                Showing{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {' – '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span>
                {' of '}
                <span className="font-medium text-slate-600 dark:text-slate-300">{totalCount}</span>
                {' lost leads'}
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`e-${i}`} className="w-6 h-6 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-6 h-6 rounded-md text-[11px] font-medium transition ${
                    currentPage === page
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Single reactivate confirm */}
      <ConfirmModal
        open={confirmOpen}
        title="Reactivate Lead"
        message={`Move "${reactivating?.name}" back to New status so it re-enters the leads pipeline?`}
        confirmLabel="Reactivate"
        confirmColor="emerald"
        onConfirm={confirmReactivate}
        onCancel={() => { setConfirmOpen(false); setReactivating(null) }}
      />

      {/* Bulk reactivate confirm */}
      <ConfirmModal
        open={bulkReactivateConfirm}
        title="Reactivate Selected Leads"
        message={`Move ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''} back to New status?`}
        confirmLabel={`Reactivate ${selectedIds.size}`}
        confirmColor="emerald"
        onConfirm={handleBulkReactivate}
        onCancel={() => setBulkReactivateConfirm(false)}
      />

      {/* Bulk delete confirm */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        variant="delete"
        title="Delete Selected Leads"
        message={`Permanently delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        confirmColor="red"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Edit lost reason modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Edit Lost Reason</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{editTarget.name}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Reason
                </label>
                <select
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 cursor-pointer"
                >
                  <option value="">No reason selected</option>
                  {LOST_REASON_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Note <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  maxLength={200}
                  placeholder="Add a note about why this lead was lost…"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{editNote.length}/200</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
