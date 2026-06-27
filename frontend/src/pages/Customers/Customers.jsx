import { useEffect, useState, useCallback } from 'react'
import {
  Users, TrendingUp, IndianRupee, CalendarCheck,
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Building2, Mail, Phone, UserCheck, ArrowUpDown,
  Download, X,
} from 'lucide-react'
import { customerApi, leadApi } from '../../utils/api'
import { SOURCE_OPTIONS } from '../Leads/leadConstants'
import EmptyState from '../../components/EmptyState'
import CustomerDetailDrawer from './CustomerDetailDrawer'
import { useUsers } from '../../hooks/useUsers'
import toast from 'react-hot-toast'

const SORT_OPTIONS = [
  { value: '-convertedAt', label: 'Recently Converted' },
  { value: 'convertedAt',  label: 'Oldest First' },
  { value: '-dealValue',   label: 'Highest Deal' },
  { value: 'name',         label: 'Name A–Z' },
]

function StatCard({ label, value, sub, icon: Icon, color }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple:  'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4">
      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={15} className="sm:hidden" />
        <Icon size={22} className="hidden sm:block" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        <p className="text-base sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none mt-0.5 sm:mt-1 truncate">{value}</p>
        {sub && <p className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function CustomerCard({ customer, selected, onToggle, onClick }) {
  const initials = customer.name
    ? customer.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group ${
        selected
          ? 'border-emerald-400 dark:border-emerald-600 shadow-md ring-1 ring-emerald-200 dark:ring-emerald-800'
          : 'border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800'
      } p-2 sm:p-5`}
    >
      {/* ── Mobile layout ── */}
      <div className="sm:hidden">
        <div className="flex items-start gap-1.5 mb-1.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-3 w-3 rounded border-slate-300 text-emerald-600 cursor-pointer accent-emerald-600 mt-0.5 shrink-0"
          />
          <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[9px]">{initials}</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight flex-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {customer.name}
          </p>
        </div>
        <div className="pl-[22px] space-y-0.5">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate">
            <Phone size={9} className="shrink-0" /> {customer.phone}
          </p>
          {customer.dealValue > 0 && (
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              ₹{customer.dealValue.toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden sm:block">
        <div className="flex items-start gap-2.5 mb-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 mt-1 shrink-0"
          />
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">
              {customer.name}
            </h3>
            {customer.company && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <Building2 size={10} /> {customer.company}
              </p>
            )}
          </div>
          {customer.dealValue > 0 && (
            <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
              ₹{customer.dealValue.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-2 truncate"><Mail size={11} className="shrink-0" /> {customer.email}</p>
          <p className="flex items-center gap-2"><Phone size={11} className="shrink-0" /> {customer.phone}</p>
          {customer.assignedTo && (
            <p className="flex items-center gap-2 truncate"><UserCheck size={12} className="shrink-0" /> {customer.assignedTo}</p>
          )}
        </div>
        {customer.convertedAt && (
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <CalendarCheck size={11} className="text-emerald-500 shrink-0" />
            <span className="truncate">Converted {new Date(customer.convertedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers]   = useState([])
  const [stats, setStats]           = useState({})
  const [loading, setLoading]       = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch]         = useState('')
  const [source, setSource]         = useState('')
  const [sort, setSort]             = useState('-convertedAt')
  const [page, setPage]             = useState(1)
  const [pagination, setPagination] = useState({})
  const [selected, setSelected]     = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Bulk state ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]   = useState(new Set())
  const [bulkPanel, setBulkPanel]       = useState(null) // 'assign' | null
  const [bulkAssign, setBulkAssign]     = useState('')

  const users = useUsers()

  const fetchStats = useCallback(() => {
    setStatsLoading(true)
    customerApi.getStats()
      .then((r) => setStats(r.data.data || {}))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchCustomers = useCallback(() => {
    setLoading(true)
    customerApi.getAll({ search, source, sort, page, limit: 12 })
      .then((r) => {
        setCustomers(r.data.data || [])
        setPagination(r.data.meta || r.data.pagination || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, source, sort, page])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(t)
  }, [fetchCustomers])

  // Clear selection on page / filter change
  useEffect(() => { setSelectedIds(new Set()); setBulkPanel(null) }, [page, search, source, sort])

  const openDrawer = async (c) => {
    setSelected(c)
    setDrawerOpen(true)
    try {
      const res = await customerApi.getById(c._id)
      setSelected(res.data.data)
    } catch { /* keep existing data */ }
  }

  const handleUpdate = (updated) => {
    setCustomers((prev) => prev.map((c) => c._id === updated._id ? updated : c))
    setSelected(updated)
    fetchStats()
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allOnPageSelected  = customers.length > 0 && customers.every((c) => selectedIds.has(c._id))
  const someOnPageSelected = !allOnPageSelected && customers.some((c) => selectedIds.has(c._id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map((c) => c._id)))
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

  // ── Bulk handlers ─────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    try {
      const { data } = await leadApi.bulk({ ids: [...selectedIds], action: 'assign', assignedTo: bulkAssign })
      toast.success(`${data.data.modified} customers assigned`)
      setCustomers((prev) => prev.map((c) => selectedIds.has(c._id) ? { ...c, assignedTo: bulkAssign } : c))
      clearSelection()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Bulk assign failed')
    }
  }

  const handleBulkExport = () => {
    const sel = customers.filter((c) => selectedIds.has(c._id))
    const headers = ['Name','Email','Phone','Company','Source','Assigned To','Deal Value','Converted At']
    const rows = sel.map((c) => [
      c.name, c.email, c.phone, c.company || '', c.source || '',
      c.assignedTo || '', c.dealValue ?? '',
      c.convertedAt ? new Date(c.convertedAt).toISOString().split('T')[0] : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'customers-selected.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${sel.length} customers exported`)
  }

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Customers</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage your converted leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard label="Total Customers"   value={statsLoading ? '—' : stats.total       || 0} sub="All converted leads"     icon={Users}         color="emerald" />
        <StatCard label="This Month"        value={statsLoading ? '—' : stats.thisMonth    || 0} sub="New conversions"         icon={TrendingUp}    color="blue"    />
        <StatCard label="Total Deal Value"  value={statsLoading ? '—' : stats.totalDealValue ? `₹${Number(stats.totalDealValue).toLocaleString('en-IN')}` : '—'} sub="Across all customers" icon={IndianRupee}    color="purple"  />
        <StatCard label="Avg Deal Value"    value={statsLoading ? '—' : stats.avgDealValue  ? `₹${Number(stats.avgDealValue).toLocaleString('en-IN')}`  : '—'} sub="Per tracked deal"      icon={CalendarCheck} color="amber"   />
      </div>

      {/* Filters + bulk toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(el) => { if (el) el.indeterminate = someOnPageSelected }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{selectedIds.size} selected</span>
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
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
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
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-emerald-400 cursor-pointer w-36 sm:w-44"
                >
                  <option value="">Pick user…</option>
                  {users.map((u) => (
                    <option key={u._id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssign}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Export */}
            <button
              onClick={handleBulkExport}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Download size={12} /> Export
            </button>
          </div>
        )}

        {/* Normal filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Mobile: checkbox + inline search on same line */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(el) => { if (el) el.indeterminate = someOnPageSelected }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Select all</span>
            </label>
            {/* Search — inline on mobile only */}
            <div className="relative flex-1 sm:hidden">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Controls row (mobile: sort+source+refresh; desktop: search+sort+source+refresh) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search — desktop only */}
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-48 pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1) }}
                className="pl-7 pr-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1) }}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-28 sm:w-32"
            >
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.slice(1).map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <button
              onClick={() => { fetchCustomers(); fetchStats() }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 shrink-0"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Customer Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Leads marked as Converted will appear here automatically."
          icon={Users}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {customers.map((c) => (
              <CustomerCard
                key={c._id}
                customer={c}
                selected={selectedIds.has(c._id)}
                onToggle={() => toggleSelect(c._id)}
                onClick={() => openDrawer(c)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.page}</span> of {pagination.totalPages}
                <span className="ml-2 text-slate-400">({pagination.total} total)</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CustomerDetailDrawer
        open={drawerOpen}
        customer={selected}
        onClose={() => setDrawerOpen(false)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
