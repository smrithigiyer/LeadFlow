import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search, Plus, RefreshCw, Download, Trash2, Eye, Pencil,
  PhoneCall, Building2, Upload, X, Users, TrendingUp,
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, UserCheck, CalendarDays, Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import LeadForm         from './LeadForm'
import LeadDetailDrawer from './LeadDetailDrawer'
import FollowUpForm     from '../FollowUps/FollowUpForm'
import ConfirmModal     from '../../components/ConfirmModal'
import { leadApi, followUpApi } from '../../utils/api'
import { LEAD_MODULE_STATUSES, ALL_STATUSES, STATUS_META, SOURCE_OPTIONS, SOURCE_META } from './leadConstants'
import { useUsers } from '../../hooks/useUsers'

const ITEMS_PER_PAGE = 10

export default function Leads({ onNotify, onFollowupCreated }) {
  const [leads, setLeads]               = useState([])
  const [followups, setFollowups]       = useState([])
  const [stats, setStats]               = useState({ total: 0, new: 0, converted: 0, lost: 0 })
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const [refreshKey, setRefreshKey]     = useState(0)

  const [showLeadForm, setShowLeadForm]           = useState(false)
  const [editLead, setEditLead]                   = useState(null)
  const [viewLead, setViewLead]                   = useState(null)
  const [followupLead, setFollowupLead]           = useState(null)
  const [showFollowupForm, setShowFollowupForm]   = useState(false)
  const [deleteConfirm, setDeleteConfirm]         = useState({ open: false, id: null, name: '' })
  const [importConfirm, setImportConfirm]         = useState({ open: false, file: null })
  const [sendWelcomeOnImport, setSendWelcomeOnImport] = useState(false)

  // ── Bulk selection state ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]           = useState(new Set())
  const [bulkPanel, setBulkPanel]               = useState(null) // 'assign' | 'status' | null
  const [bulkAssign, setBulkAssign]             = useState('')
  const [bulkStatus, setBulkStatus]             = useState('')
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const users     = useUsers()
  const importRef = useRef()

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes, fuRes] = await Promise.all([
        leadApi.getAll({
          page:   currentPage,
          limit:  ITEMS_PER_PAGE,
          search: search       || undefined,
          status: statusFilter || undefined,
          source: sourceFilter || undefined,
          from:   dateFrom     || undefined,
          to:     dateTo       || undefined,
        }),
        leadApi.getStats(),
        followUpApi.getAll({ limit: 500 }),
      ])

      setLeads(leadsRes.data.data)
      setFollowups(fuRes.data.data || [])
      setTotalCount(leadsRes.data.pagination?.total || leadsRes.data.meta?.total || 0)

      const s = statsRes.data.data
      setStats({
        total:     s.total,
        new:       s.new,
        converted: s.converted,
        lost:      s.lost,
      })
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter, sourceFilter, dateFrom, dateTo, refreshKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, sourceFilter, dateFrom, dateTo])
  // Clear selection whenever the visible page changes
  useEffect(() => { setSelectedIds(new Set()); setBulkPanel(null) }, [currentPage, search, statusFilter, sourceFilter, dateFrom, dateTo])

  const handleRefresh = () => {
    setSearch('')
    setStatusFilter('')
    setSourceFilter('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
    setRefreshKey((k) => k + 1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))

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

  const clearSelection = () => { setSelectedIds(new Set()); setBulkPanel(null); setBulkAssign(''); setBulkStatus('') }

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
    return pages
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSaveLead = async (form, followUp = null) => {
    try {
      if (editLead) {
        await leadApi.update(editLead._id, form)
        toast.success('Lead updated')
        onNotify?.(`Lead "${form.name}" updated`, 'info')
      } else {
        const res = await leadApi.create(form)
        const newLead = res.data.data
        toast.success('Lead added successfully')
        onNotify?.(`New lead "${form.name}" added`, 'success')

        if (followUp && newLead?._id) {
          try {
            await followUpApi.createForLead(newLead._id, {
              type:        followUp.type,
              scheduledAt: followUp.scheduledAt,
              notes:       followUp.notes,
            })
            toast.success('Follow-up scheduled')
            onFollowupCreated?.()
          } catch {
            toast.error('Lead created, but follow-up scheduling failed')
          }
        }
      }
      setEditLead(null)
      setShowLeadForm(false)
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to save lead')
    }
  }

  const handleEdit = (lead) => {
    setViewLead(null)
    setEditLead(lead)
    setShowLeadForm(true)
  }

  const handleDelete = (id) => {
    const lead = leads.find((l) => l._id === id)
    setDeleteConfirm({ open: true, id, name: lead?.name || 'this lead' })
  }

  const confirmDelete = async () => {
    const { id, name } = deleteConfirm
    setDeleteConfirm({ open: false, id: null, name: '' })
    try {
      await leadApi.delete(id)
      toast.success('Lead deleted')
      onNotify?.(`Lead "${name}" deleted`, 'error')
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to delete lead')
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await leadApi.exportCSV({
        search: search       || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        from:   dateFrom     || undefined,
        to:     dateTo       || undefined,
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href = url; a.download = 'leads.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported successfully')
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Export failed')
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setImportConfirm({ open: true, file })
  }

  const doImport = async () => {
    const { file } = importConfirm
    const welcome  = sendWelcomeOnImport
    setImportConfirm({ open: false, file: null })
    setSendWelcomeOnImport(false)
    try {
      const res = await leadApi.importCSV(file, welcome)
      toast.success(res.data.message || 'Import successful')
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Import failed')
    }
  }

  // ── Follow-up ─────────────────────────────────────────────────────────────
  const openFollowup = (lead) => {
    setViewLead(null)
    setFollowupLead(lead)
    setShowFollowupForm(true)
  }

  const handleFollowupSaved = () => {
    toast.success('Follow-up scheduled')
    setShowFollowupForm(false)
    setFollowupLead(null)
    onFollowupCreated?.()
  }

  const getFollowupCount = (leadId) =>
    (followups || []).filter((f) => f.lead?._id === leadId || f.lead === leadId).length

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'assign', assignedTo: bulkAssign })
      toast.success(`${data.data.modified} leads assigned`)
      onNotify?.(`${data.data.modified} leads assigned to "${bulkAssign}"`, 'info')
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk assign failed')
    }
  }

  const handleBulkStatus = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'status', status: bulkStatus })
      toast.success(`${data.data.modified} leads updated`)
      clearSelection()
      load()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk status update failed')
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
    const headers = ['Name','Email','Phone','Company','Source','Status','Assigned To','Notes','Created At']
    const rows = sel.map((l) => [
      l.name, l.email, l.phone, l.company || '', l.source || '', l.status,
      l.assignedTo || '', (l.notes || '').replace(/"/g, '""'),
      l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'selected-leads.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${sel.length} leads exported`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Leads</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track and manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Upload size={13} /> Import CSV / Excel
          </button>
          <button
            onClick={() => { setEditLead(null); setShowLeadForm(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
          >
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: stats.total,     icon: Users,       color: 'text-brand-600 dark:text-brand-400',   bg: 'bg-brand-50 dark:bg-brand-900/30'   },
          { label: 'New',         value: stats.new,        icon: TrendingUp,  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/30'    },
          { label: 'Converted',   value: stats.converted,  icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Lost',        value: stats.lost,       icon: AlertCircle, color: 'text-red-500 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/30'     },
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
              {/* Selection count + clear */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  title="Clear selection"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Assign To */}
              <button
                onClick={() => setBulkPanel(bulkPanel === 'assign' ? null : 'assign')}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  bulkPanel === 'assign'
                    ? 'border-brand-300 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-700'
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
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer w-44"
                  >
                    <option value="">Pick user…</option>
                    {users.map((u) => (
                      <option key={u._id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkAssign}
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Set Status */}
              <button
                onClick={() => setBulkPanel(bulkPanel === 'status' ? null : 'status')}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  bulkPanel === 'status'
                    ? 'border-brand-300 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Tag size={12} /> Set Status
              </button>
              {bulkPanel === 'status' && (
                <div className="flex items-center gap-1">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    autoFocus
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                  >
                    <option value="">Pick status…</option>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkStatus}
                    disabled={!bulkStatus}
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Export selected */}
              <button
                onClick={handleBulkExport}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <Download size={12} /> Export
              </button>

              {/* Delete selected */}
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-2.5 py-1.5 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 transition"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ) : (
            /* ── Normal toolbar ── */
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Leads</span>
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
                    className="w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 py-1.5 pl-7 pr-7 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400"
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
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                >
                  <option value="">All Status</option>
                  {LEAD_MODULE_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                  ))}
                </select>

                {/* Source filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-brand-400 cursor-pointer"
                >
                  <option value="">All Sources</option>
                  {SOURCE_OPTIONS.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
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
                  <RefreshCw size={12} /> Refresh
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
                {/* Select-all checkbox */}
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = someOnPageSelected }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                  />
                </th>
                {['Lead Name','Phone','Email','Company','Source','Assigned To','Status','Follow-ups','Created','Actions'].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw size={16} className="animate-spin opacity-50" />
                      <span className="text-xs">Loading leads…</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <Users size={20} />
                      <span className="text-xs text-slate-400">No leads found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead._id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group ${selectedIds.has(lead._id) ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}
                  >
                    {/* Row checkbox */}
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead._id)}
                        onChange={() => toggleSelect(lead._id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                      />
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{lead.name}</span>
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
                      {lead.source && SOURCE_META[lead.source] ? (
                        <span className={`inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 border ${SOURCE_META[lead.source].color}`}>
                          {SOURCE_META[lead.source].label}
                        </span>
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
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATUS_META[lead.status]?.color}`}>
                        {STATUS_META[lead.status]?.label}
                      </span>
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                        <PhoneCall size={9} />
                        {getFollowupCount(lead._id)}
                      </span>
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy') : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {[
                          { tip: 'View',      icon: Eye,       cls: 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:border-slate-600',                                                                     action: () => setViewLead(lead) },
                          { tip: 'Edit',      icon: Pencil,    cls: 'border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:border-amber-700',                                                                      action: () => handleEdit(lead) },
                          { tip: 'Follow-up', icon: PhoneCall, cls: 'border-emerald-200 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700',                                                   action: () => openFollowup(lead) },
                          { tip: 'Delete',    icon: Trash2,    cls: 'border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:border-red-300 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-700',                                                                                           action: () => handleDelete(lead._id) },
                        ].map(({ tip, icon: Icon, cls, action }) => (
                          <div key={tip} className="relative group/tip">
                            <button onClick={action} className={`w-7 h-7 rounded-md border hover:shadow-sm transition flex items-center justify-center ${cls}`}>
                              <Icon size={13} />
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
                              {tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
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
                {' leads'}
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
                      ? 'bg-brand-600 text-white shadow-sm'
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

      {/* Forms & Drawers */}
      <LeadForm
        open={showLeadForm}
        onClose={() => { setShowLeadForm(false); setEditLead(null) }}
        initial={editLead}
        onSave={handleSaveLead}
      />

      <LeadDetailDrawer
        lead={viewLead}
        onClose={() => setViewLead(null)}
        onEdit={() => handleEdit(viewLead)}
        onScheduleFollowup={() => openFollowup(viewLead)}
        followupCount={viewLead ? getFollowupCount(viewLead._id) : 0}
      />

      <FollowUpForm
        open={showFollowupForm}
        onClose={() => { setShowFollowupForm(false); setFollowupLead(null) }}
        lead={followupLead}
        onSaved={handleFollowupSaved}
      />

      {/* Row-level delete confirm */}
      <ConfirmModal
        open={deleteConfirm.open}
        variant="delete"
        title="Delete Lead"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, name: '' })}
      />

      {/* Bulk delete confirm */}
      <ConfirmModal
        open={bulkDeleteConfirm}
        variant="delete"
        title="Delete Selected Leads"
        message={`Are you sure you want to delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        confirmColor="red"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <ConfirmModal
        open={importConfirm.open}
        variant="warn"
        title="Import Leads"
        message={`Import leads from "${importConfirm.file?.name}"? Duplicate entries will be skipped automatically.`}
        confirmLabel="Import"
        confirmColor="brand"
        onConfirm={doImport}
        onCancel={() => { setImportConfirm({ open: false, file: null }); setSendWelcomeOnImport(false) }}
      >
        {/* Welcome email option */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition select-none">
          <input
            type="checkbox"
            checked={sendWelcomeOnImport}
            onChange={(e) => setSendWelcomeOnImport(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 mt-0.5 cursor-pointer shrink-0"
          />
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Send welcome email to imported leads</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
              Each imported lead will receive the branded welcome email after import.
            </p>
          </div>
        </label>
        {sendWelcomeOnImport && (
          <div className="flex items-start gap-2 mt-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Gmail allows ~500 emails/day. For large imports this may hit the daily limit. Emails send after import completes.
            </p>
          </div>
        )}
      </ConfirmModal>
    </div>
  )
}
