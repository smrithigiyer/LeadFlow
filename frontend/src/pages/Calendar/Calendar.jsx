import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Phone, Mail, Video, Zap, HelpCircle,
  Download, X, Clock, RotateCcw, CalendarDays, CheckCircle2,
  List, Filter, AlertTriangle, PhoneCall,
} from 'lucide-react'
import EmailComposePanel from '../../components/EmailComposePanel'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addWeeks, subWeeks,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, addHours,
  isWithinInterval,
} from 'date-fns'
import toast from 'react-hot-toast'
import { followUpApi, notesApi } from '../../utils/api'

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  call:    { label: 'Call',    Icon: Phone,      dot: 'bg-blue-500',   chip: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'        },
  email:   { label: 'Email',   Icon: Mail,       dot: 'bg-purple-500', chip: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800' },
  meeting: { label: 'Meeting', Icon: Video,      dot: 'bg-teal-500',   chip: 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800'          },
  demo:    { label: 'Demo',    Icon: Zap,        dot: 'bg-amber-500',  chip: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800'     },
  other:   { label: 'Other',   Icon: HelpCircle, dot: 'bg-slate-400',  chip: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'       },
}

const OUTCOME_CFG = {
  pending:     { label: 'Pending',     cls: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'         },
  completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  no_answer:   { label: 'No Answer',   cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'     },
  rescheduled: { label: 'Rescheduled', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'             },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'                 },
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPE_FILTERS    = [{ key: 'all', label: 'All' }, ...Object.entries(TYPE_CFG).map(([k, v]) => ({ key: k, label: v.label, dot: v.dot }))]
const OUTCOME_FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'pending',     label: 'Pending'     },
  { key: 'overdue',     label: 'Overdue'     },
  { key: 'completed',   label: 'Completed'   },
  { key: 'no_answer',   label: 'No Answer'   },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: 'cancelled',   label: 'Cancelled'   },
]

// ── ICS export ───────────────────────────────────────────────────────────────

function buildICS(events) {
  const stamp = (d) => format(d, "yyyyMMdd'T'HHmmss'Z'")
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//LeadFlow//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  ]
  events.forEach((ev) => {
    const start = new Date(ev.scheduledAt)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev._id}@leadflow`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(addHours(start, 1))}`,
      `SUMMARY:${(TYPE_CFG[ev.type]?.label ?? ev.type)} – ${ev.lead?.name ?? 'Unknown Lead'}`,
      `DESCRIPTION:${(ev.notes ?? '').replace(/\n/g, '\\n')}`,
      `STATUS:${ev.outcome === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(events, filename) {
  const blob = new Blob([buildICS(events)], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(ev) {
  const d = new Date(ev.scheduledAt)
  return ev.outcome === 'pending' && isPast(d) && !isToday(d)
}

function groupByDay(events) {
  const map = {}
  events.forEach((ev) => {
    const key = format(new Date(ev.scheduledAt), 'yyyy-MM-dd')
    ;(map[key] = map[key] || []).push(ev)
  })
  return map
}

// ── EventDetailModal — pops up when an event chip is clicked ─────────────────

function EventDetailModal({ event, onClose }) {
  const navigate  = useNavigate()
  const [composing,    setComposing]    = useState(false)
  const [notesList,    setNotesList]    = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteCompose,  setNoteCompose]  = useState('')
  const [noteAdding,   setNoteAdding]   = useState(false)

  const t   = TYPE_CFG[event.type]   ?? TYPE_CFG.other
  const o   = OUTCOME_CFG[event.outcome] ?? OUTCOME_CFG.pending
  const bad = isOverdue(event)
  const initial = event.lead?.name?.charAt(0)?.toUpperCase() ?? '?'

  useEffect(() => {
    setNotesLoading(true)
    notesApi.getByFollowup(event._id)
      .then((r) => setNotesList(r.data.data || []))
      .catch(() => {})
      .finally(() => setNotesLoading(false))
  }, [event._id])

  const handleAddNote = async () => {
    if (!noteCompose.trim()) return
    setNoteAdding(true)
    try {
      const { data } = await notesApi.createForFollowup(event._id, noteCompose.trim())
      setNotesList((prev) => [data.data, ...prev])
      setNoteCompose('')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setNoteAdding(false)
    }
  }

  const noteTimeLabel = (iso) => {
    if (!iso) return ''
    try {
      const d   = new Date(iso)
      const age = Date.now() - d.getTime()
      return age < 7 * 24 * 60 * 60 * 1000
        ? formatDistanceToNow(d, { addSuffix: true })
        : format(d, 'dd MMM, HH:mm')
    } catch { return '' }
  }

  const totalNotes = (event.notes ? 1 : 0) + notesList.length

  // When "Send Email" is chosen, swap to compose panel
  if (composing && event.lead?._id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800" style={{ maxHeight: '90vh' }}>
          <EmailComposePanel
            lead={event.lead}
            onClose={() => setComposing(false)}
            onSent={onClose}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-y-auto border border-gray-100 dark:border-slate-800"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — type + time */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.chip}`}>
              <t.Icon size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{t.label}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {format(new Date(event.scheduledAt), 'EEE, MMM d · h:mm a')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Lead info + outcome badge */}
        <div className="px-5 py-4 flex items-start gap-3 border-b border-gray-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-gray-500 dark:text-slate-400">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                {event.lead?.name ?? 'Unknown Lead'}
              </p>
              <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
                ${bad ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : o.cls}`}>
                {bad ? 'Overdue' : o.label}
              </span>
            </div>
            {event.lead?.company && (
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{event.lead.company}</p>
            )}
            {event.lead?.email && (
              <p className="text-xs text-brand-600 dark:text-brand-400 truncate mt-0.5">{event.lead.email}</p>
            )}
            {event.lead?.phone && (
              <p className="text-xs text-gray-400 dark:text-slate-500">{event.lead.phone}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 py-4 space-y-2.5 border-b border-gray-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
            Notes
            {totalNotes > 0 && (
              <span className="text-[9px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {totalNotes}
              </span>
            )}
          </p>

          {/* Creation note (FollowUp.notes) */}
          {event.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">When created</p>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {event.notes}
              </p>
            </div>
          )}

          {/* Thread notes */}
          {notesLoading ? (
            <p className="text-[11px] text-gray-400 dark:text-slate-500">Loading notes…</p>
          ) : notesList.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
              {notesList.map((note) => (
                <div key={note._id} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-300">
                      {note.authorName || 'Unknown'}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500">
                      {noteTimeLabel(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          ) : !event.notes ? (
            <p className="text-[11px] text-gray-400 dark:text-slate-500">No notes yet.</p>
          ) : null}

          {/* Add note */}
          <div className="flex gap-1.5 pt-0.5">
            <input
              type="text"
              value={noteCompose}
              onChange={(e) => setNoteCompose(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && noteCompose.trim()) handleAddNote() }}
              placeholder="Add a note… (Enter to submit)"
              maxLength={500}
              className="flex-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 outline-none focus:border-brand-400 placeholder:text-gray-300 dark:placeholder:text-slate-600 transition"
            />
            <button
              onClick={handleAddNote}
              disabled={noteAdding || !noteCompose.trim()}
              className="px-2.5 py-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-40 transition"
            >
              {noteAdding ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-2.5">
          <button
            onClick={() => { onClose(); navigate('/admin/followups') }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
          >
            <PhoneCall size={14} />
            Follow-ups
          </button>
          {event.lead?.email && (
            <button
              onClick={() => setComposing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition"
            >
              <Mail size={14} />
              Send Email
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── EventChip — compact chip for month/week cells ────────────────────────────

function EventChip({ event, onEventClick }) {
  const t   = TYPE_CFG[event.type] ?? TYPE_CFG.other
  const bad = isOverdue(event)
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEventClick?.(event) }}
      className={`text-[10px] sm:text-[11px] font-medium px-1.5 py-[2px] rounded-md truncate flex items-center gap-1 leading-tight cursor-pointer hover:opacity-80 transition-opacity
        ${bad ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800' : t.chip}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bad ? 'bg-red-500' : t.dot}`} />
      <span className="truncate">{event.lead?.name ?? 'Unknown'}</span>
    </div>
  )
}

// ── EventCard — detailed card for panel + agenda ─────────────────────────────

function EventCard({ event, onMarkDone }) {
  const [marking, setMarking] = useState(false)
  const t   = TYPE_CFG[event.type] ?? TYPE_CFG.other
  const o   = OUTCOME_CFG[event.outcome] ?? OUTCOME_CFG.pending
  const bad = isOverdue(event)
  const canMark = event.outcome === 'pending' || bad

  const handleMark = async (e) => {
    e.stopPropagation()
    setMarking(true)
    try {
      await followUpApi.updateOutcome(event._id, 'completed')
      onMarkDone?.(event._id, 'completed')
      toast.success('Marked as completed')
    } catch {
      toast.error('Failed to update outcome')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={`p-3.5 rounded-2xl border transition-shadow hover:shadow-sm
      ${bad
        ? 'border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10'
        : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
      <div className="flex items-start gap-3">

        {/* Type icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.chip}`}>
          <t.Icon size={14} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Name + outcome badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                {event.lead?.name ?? 'Unknown Lead'}
              </p>
              {event.lead?.company && (
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{event.lead.company}</p>
              )}
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap
              ${bad ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : o.cls}`}>
              {bad ? 'Overdue' : o.label}
            </span>
          </div>

          {/* Time, type, mark-done */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                <Clock size={10} />
                {format(new Date(event.scheduledAt), 'h:mm a')}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${t.chip.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                <t.Icon size={10} />
                {t.label}
              </span>
            </div>

            {canMark && (
              <button
                onClick={handleMark}
                disabled={marking}
                title="Mark as completed"
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 transition shrink-0"
              >
                <CheckCircle2 size={13} className={marking ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Done</span>
              </button>
            )}
          </div>

          {/* Notes */}
          {event.notes && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {event.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── FilterDropdown — floating popover with two select menus ──────────────────

function FilterDropdown({ filterType, setFilterType, filterOutcome, setFilterOutcome }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const activeCount = (filterType !== 'all' ? 1 : 0) + (filterOutcome !== 'all' ? 1 : 0)
  const hasFilter   = activeCount > 0

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const clear = () => { setFilterType('all'); setFilterOutcome('all') }

  const selectCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent cursor-pointer appearance-none'
  const labelCls  = 'text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1.5'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Filter events"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition
          ${open || hasFilter
            ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400'
            : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
      >
        <Filter size={12} />
        <span className="hidden sm:inline">Filter</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-bold leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">

          <div className="p-4 space-y-4">
            {/* Type */}
            <div>
              <label className={labelCls}>Type</label>
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={selectCls}
                >
                  {TYPE_FILTERS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <div className="relative">
                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  className={selectCls}
                >
                  {OUTCOME_FILTERS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Clear button */}
          {hasFilter && (
            <div className="px-4 pb-4">
              <button
                onClick={() => { clear(); setOpen(false) }}
                className="w-full py-2 text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/40 transition"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AgendaView — chronological list grouped by date ──────────────────────────

function AgendaView({ events, selectedDay, onDayClick, onMarkDone }) {
  const grouped = useMemo(() => {
    const map = {}
    const list = []
    const sorted = [...events].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    sorted.forEach((ev) => {
      const key = format(new Date(ev.scheduledAt), 'yyyy-MM-dd')
      if (!map[key]) {
        const entry = { key, date: new Date(ev.scheduledAt), events: [] }
        map[key] = entry
        list.push(entry)
      }
      map[key].events.push(ev)
    })
    return list
  }, [events])

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
          <CalendarDays size={26} className="text-gray-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-gray-400 dark:text-slate-500">No events found</p>
        <p className="text-xs text-gray-300 dark:text-slate-600 text-center">
          Try adjusting filters or navigating to a different period
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-0.5">
      {grouped.map(({ key, date, events: dayEvs }) => {
        const today    = isToday(date)
        const selected = isSameDay(date, selectedDay)
        return (
          <div key={key}>
            {/* Date heading */}
            <button
              onClick={() => onDayClick(date)}
              className="flex items-center gap-3 mb-3 w-full text-left group"
            >
              <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 transition-colors
                ${today
                  ? 'bg-brand-500'
                  : selected
                    ? 'bg-brand-100 dark:bg-brand-900/50'
                    : 'bg-gray-100 dark:bg-slate-800 group-hover:bg-gray-200 dark:group-hover:bg-slate-700'}`}>
                <span className={`text-[9px] font-bold uppercase leading-none
                  ${today ? 'text-white/70' : 'text-gray-400 dark:text-slate-500'}`}>
                  {format(date, 'EEE')}
                </span>
                <span className={`text-base font-bold leading-tight
                  ${today ? 'text-white' : selected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-slate-200'}`}>
                  {format(date, 'd')}
                </span>
              </div>
              <div>
                <p className={`text-sm font-semibold
                  ${today ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-slate-200'}`}>
                  {today ? `Today · ${format(date, 'MMMM d, yyyy')}` : format(date, 'EEEE, MMMM d')}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {dayEvs.length} event{dayEvs.length !== 1 ? 's' : ''}
                  {dayEvs.some(isOverdue) && (
                    <span className="ml-1.5 text-red-500">· {dayEvs.filter(isOverdue).length} overdue</span>
                  )}
                </p>
              </div>
            </button>

            {/* Events */}
            <div className="space-y-2">
              {dayEvs.map((ev) => <EventCard key={ev._id} event={ev} onMarkDone={onMarkDone} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── EventsPanel — desktop sidebar + mobile bottom sheet ──────────────────────

function EventsPanel({ day, events, upcomingEvents, onClose, onMarkDone }) {
  const sorted   = [...events].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
  const isEmpty  = sorted.length === 0
  const upcoming = upcomingEvents?.slice(0, 5) ?? []

  return (
    <div className="card flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-slate-500">
            {isToday(day) ? 'Today' : format(day, 'EEEE')}
          </p>
          <h3 className="text-base font-semibold text-gray-800 dark:text-slate-100 mt-0.5">
            {format(day, 'MMMM d, yyyy')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <button
              onClick={() => downloadICS(sorted, `leadflow-${format(day, 'yyyy-MM-dd')}.ics`)}
              title="Export this day (.ics)"
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-700 transition"
            >
              <Download size={13} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="p-4 flex flex-col gap-4">
            {/* Empty state */}
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                <CalendarDays size={20} className="text-gray-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Nothing scheduled</p>
              <p className="text-xs text-gray-300 dark:text-slate-600 text-center">
                No events on this day matching current filters
              </p>
            </div>

            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-slate-500">
                    Upcoming
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {upcoming.map((ev) => (
                    <div key={ev._id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${(TYPE_CFG[ev.type] ?? TYPE_CFG.other).chip}`}>
                        {(() => { const T = TYPE_CFG[ev.type]?.Icon ?? HelpCircle; return <T size={12} /> })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">
                          {ev.lead?.name ?? 'Unknown Lead'}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          {format(new Date(ev.scheduledAt), 'EEE, MMM d · h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sorted.map((ev) => <EventCard key={ev._id} event={ev} onMarkDone={onMarkDone} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isEmpty && (
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-gray-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {sorted.length} event{sorted.length !== 1 ? 's' : ''}
          </p>
          {sorted.filter(isOverdue).length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-red-500">
              <AlertTriangle size={10} />
              {sorted.filter(isOverdue).length} overdue
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── MonthGrid ────────────────────────────────────────────────────────────────

function MonthGrid({ currentDate, events, selectedDay, onDayClick, onEventClick }) {
  const byDay = useMemo(() => groupByDay(events), [events])
  const days  = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end:   endOfWeek(endOfMonth(currentDate)),
  }), [currentDate])

  const MAX_CHIPS = 3

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
        {WEEK_DAYS.map((d) => (
          <p key={d} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 py-2">
            {d}
          </p>
        ))}
      </div>

      {/* Grid — each cell has its own border, no gap-px trick */}
      <div className="grid grid-cols-7 flex-1 border-l border-t border-gray-200 dark:border-slate-700 rounded-b-2xl overflow-hidden">
        {days.map((day) => {
          const key      = format(day, 'yyyy-MM-dd')
          const dayEvs   = byDay[key] || []
          const inMonth  = isSameMonth(day, currentDate)
          const selected = selectedDay && isSameDay(day, selectedDay)
          const today    = isToday(day)
          const extra    = dayEvs.length - MAX_CHIPS

          return (
            <div
              key={key}
              onClick={() => onDayClick(day)}
              className={`
                relative flex flex-col gap-0.5 p-1 sm:p-1.5 cursor-pointer transition-colors
                min-h-[72px] sm:min-h-[88px] md:min-h-[100px]
                border-r border-b border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-900
                hover:bg-gray-50 dark:hover:bg-slate-800/60
                ${selected ? 'ring-2 ring-inset ring-brand-400 dark:ring-brand-500' : ''}
                ${!inMonth ? 'bg-gray-50/70 dark:bg-slate-950/60' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-start justify-between mb-0.5">
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full
                  text-xs sm:text-sm font-semibold leading-none
                  ${today ? 'bg-brand-500 text-white' : ''}
                  ${!today && inMonth  ? 'text-gray-700 dark:text-slate-200' : ''}
                  ${!today && !inMonth ? 'text-gray-300 dark:text-slate-600' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {extra > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-slate-500 leading-none mt-1 mr-0.5">
                    +{extra}
                  </span>
                )}
              </div>

              {/* Chips — desktop (clickable → opens EventDetailModal) */}
              <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                {dayEvs.slice(0, MAX_CHIPS).map((ev) => (
                  <EventChip key={ev._id} event={ev} onEventClick={onEventClick} />
                ))}
              </div>

              {/* Dots — mobile (click dot → open day panel) */}
              {dayEvs.length > 0 && (
                <div className="sm:hidden flex gap-0.5 flex-wrap mt-auto pb-0.5">
                  {dayEvs.slice(0, 5).map((ev) => (
                    <span
                      key={ev._id}
                      className={`w-1.5 h-1.5 rounded-full ${isOverdue(ev) ? 'bg-red-500' : (TYPE_CFG[ev.type] ?? TYPE_CFG.other).dot}`}
                    />
                  ))}
                  {dayEvs.length > 5 && (
                    <span className="text-[8px] text-gray-400 leading-none self-center">+{dayEvs.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── WeekGrid ─────────────────────────────────────────────────────────────────

function WeekGrid({ currentDate, events, selectedDay, onDayClick, onEventClick }) {
  const byDay = useMemo(() => groupByDay(events), [events])
  const days  = useMemo(() => eachDayOfInterval({
    start: startOfWeek(currentDate),
    end:   endOfWeek(currentDate),
  }), [currentDate])

  return (
    /* Horizontally scrollable on mobile so 7 columns remain readable */
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[560px] sm:min-w-0">
        {days.map((day) => {
          const key      = format(day, 'yyyy-MM-dd')
          const dayEvs   = (byDay[key] || []).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
          const selected = selectedDay && isSameDay(day, selectedDay)
          const today    = isToday(day)

          return (
            <div
              key={key}
              onClick={() => onDayClick(day)}
              className={`flex flex-col rounded-2xl border cursor-pointer overflow-hidden transition-all
                ${selected
                  ? 'border-brand-300 dark:border-brand-700 shadow-sm'
                  : 'border-gray-100 dark:border-slate-800'}
                bg-white dark:bg-slate-900`}
            >
              {/* Column header */}
              <div className={`px-1 py-2 text-center border-b shrink-0
                ${selected ? 'border-brand-100 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10' : 'border-gray-100 dark:border-slate-800'}`}>
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-slate-500">
                  {format(day, 'EEE')}
                </p>
                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5
                  ${today ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-slate-200'}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Events */}
              <div className="p-1 sm:p-1.5 space-y-1 overflow-y-auto min-h-[44px] max-h-[200px] sm:max-h-[300px]">
                {dayEvs.length === 0 ? (
                  <p className="text-center text-[10px] text-gray-300 dark:text-slate-600 pt-4 select-none">—</p>
                ) : (
                  dayEvs.map((ev) => {
                    const t   = TYPE_CFG[ev.type] ?? TYPE_CFG.other
                    const bad = isOverdue(ev)
                    return (
                      <div
                        key={ev._id}
                        onClick={(e) => { e.stopPropagation(); onEventClick?.(ev) }}
                        className={`p-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity
                          ${bad ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400' : t.chip}`}
                      >
                        <p className="text-[10px] sm:text-xs font-semibold truncate leading-tight">
                          {ev.lead?.name ?? 'Unknown'}
                        </p>
                        <p className="text-[9px] sm:text-[10px] opacity-70 mt-0.5">
                          {format(new Date(ev.scheduledAt), 'h:mm a')}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MiniStats ────────────────────────────────────────────────────────────────

function MiniStats({ events, filteredCount, totalCount }) {
  const todayCount     = events.filter((ev) => isToday(new Date(ev.scheduledAt))).length
  const overdueCount   = events.filter(isOverdue).length
  const completedCount = events.filter((ev) => ev.outcome === 'completed').length

  return (
    <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
      {todayCount > 0 && (
        <span className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
          <CalendarDays size={12} />
          {todayCount} today
        </span>
      )}
      {overdueCount > 0 && (
        <span className="flex items-center gap-1 font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
          <AlertTriangle size={10} />
          {overdueCount} overdue
        </span>
      )}
      {completedCount > 0 && (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 size={11} />
          {completedCount} done
        </span>
      )}
      {filteredCount !== totalCount && (
        <span className="text-gray-400 dark:text-slate-500">
          showing {filteredCount} of {totalCount}
        </span>
      )}
    </div>
  )
}

// ── CalendarPage ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [viewMode, setViewMode]               = useState('month')
  const [currentDate, setCurrentDate]         = useState(new Date())
  const [selectedDay, setSelectedDay]         = useState(new Date())
  const [events, setEvents]                   = useState([])
  const [loading, setLoading]                 = useState(true)
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [detailEvent, setDetailEvent]         = useState(null)
  const [filterType, setFilterType]           = useState('all')
  const [filterOutcome, setFilterOutcome]     = useState('all')

  // Date range for the current view (month expands to surrounding weeks)
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'week') {
      return { rangeStart: startOfWeek(currentDate), rangeEnd: endOfWeek(currentDate) }
    }
    return {
      rangeStart: startOfWeek(startOfMonth(currentDate)),
      rangeEnd:   endOfWeek(endOfMonth(currentDate)),
    }
  }, [viewMode, currentDate])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await followUpApi.getAll({ from: rangeStart.toISOString(), to: rangeEnd.toISOString(), limit: 500 })
      setEvents(res.data.data || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Optimistic outcome update
  const handleMarkDone = useCallback((id, outcome) => {
    setEvents((prev) => prev.map((ev) => ev._id === id ? { ...ev, outcome } : ev))
  }, [])

  // Apply filters
  const filteredEvents = useMemo(() => events.filter((ev) => {
    if (filterType !== 'all' && ev.type !== filterType) return false
    if (filterOutcome === 'overdue') return isOverdue(ev)
    if (filterOutcome !== 'all' && ev.outcome !== filterOutcome) return false
    return true
  }), [events, filterType, filterOutcome])

  const selectedDayEvents = useMemo(
    () => filteredEvents.filter((ev) => isSameDay(new Date(ev.scheduledAt), selectedDay)),
    [filteredEvents, selectedDay],
  )

  // Upcoming events for the side panel empty state (next 7 days, not on selected day)
  const upcomingEvents = useMemo(() => {
    const weekEnd = endOfWeek(new Date())
    return filteredEvents
      .filter((ev) => {
        const d = new Date(ev.scheduledAt)
        return !isSameDay(d, selectedDay) && isWithinInterval(d, { start: new Date(), end: weekEnd })
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 5)
  }, [filteredEvents, selectedDay])

  // Navigation
  const prev    = useCallback(() => setCurrentDate((d) => viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)), [viewMode])
  const next    = useCallback(() => setCurrentDate((d) => viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)), [viewMode])
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()) }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft')  prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape')     setShowMobilePanel(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next])

  const handleDayClick = (day) => {
    setSelectedDay(day)
    setShowMobilePanel(true)
  }

  const title = viewMode === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : viewMode === 'week'
      ? `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
      : format(currentDate, 'MMMM yyyy')

  return (
    <div className="flex flex-col gap-3 h-full">

      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Calendar</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">View and manage your follow-up schedule</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="card px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={prev} title="Previous (←)" className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <ChevronLeft size={16} />
          </button>
          <button onClick={next} title="Next (→)" className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100 min-w-[150px]">{title}</h2>

        {/* Mini stats */}
        {!loading && (
          <MiniStats events={filteredEvents} filteredCount={filteredEvents.length} totalCount={events.length} />
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={goToday} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium transition">
            Today
          </button>

          {/* View toggle: Month / Week / Agenda */}
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {[
              { v: 'month', label: 'Month' },
              { v: 'week',  label: 'Week'  },
              { v: 'agenda', label: 'Agenda', Icon: List },
            ].map(({ v, label, Icon: Ico }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                title={label}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition
                  ${viewMode === v
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                {Ico && <Ico size={12} />}
                <span className={Ico ? 'hidden sm:inline' : ''}>{label}</span>
              </button>
            ))}
          </div>

          {/* Filter dropdown */}
          <FilterDropdown
            filterType={filterType}
            setFilterType={setFilterType}
            filterOutcome={filterOutcome}
            setFilterOutcome={setFilterOutcome}
          />

          {/* Export */}
          <button
            onClick={() => downloadICS(filteredEvents, `leadflow-${format(currentDate, 'yyyy-MM')}.ics`)}
            disabled={filteredEvents.length === 0}
            title="Export to Google Calendar (.ics)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Refresh — clears filters and refetches */}
          <button
            onClick={() => { setFilterType('all'); setFilterOutcome('all'); fetchEvents() }}
            title="Refresh & clear filters"
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Calendar / Agenda */}
        <div className={`card p-4 sm:p-5 flex-1 min-w-0 flex flex-col ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'month' ? (
            <MonthGrid currentDate={currentDate} events={filteredEvents} selectedDay={selectedDay} onDayClick={handleDayClick} onEventClick={setDetailEvent} />
          ) : viewMode === 'week' ? (
            <WeekGrid currentDate={currentDate} events={filteredEvents} selectedDay={selectedDay} onDayClick={handleDayClick} onEventClick={setDetailEvent} />
          ) : (
            <AgendaView events={filteredEvents} selectedDay={selectedDay} onDayClick={handleDayClick} onMarkDone={handleMarkDone} />
          )}
        </div>

        {/* Desktop events panel — hidden in agenda view (panel is redundant there) */}
        {viewMode !== 'agenda' && (
          <div className="hidden xl:flex xl:flex-col w-[300px] shrink-0">
            <EventsPanel
              day={selectedDay}
              events={selectedDayEvents}
              upcomingEvents={upcomingEvents}
              onMarkDone={handleMarkDone}
            />
          </div>
        )}
      </div>

      {/* ── Mobile bottom sheet ── */}
      {showMobilePanel && viewMode !== 'agenda' && (
        <div className="xl:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobilePanel(false)} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl max-h-[78vh] flex flex-col shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="flex-1 overflow-y-auto">
              <EventsPanel
                day={selectedDay}
                events={selectedDayEvents}
                upcomingEvents={upcomingEvents}
                onMarkDone={handleMarkDone}
                onClose={() => setShowMobilePanel(false)}
              />
            </div>
          </div>
        </div>
      )}

      {detailEvent && (
        <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
      )}
    </div>
  )
}
