import { useEffect, useState } from 'react'
import { X, Save, CalendarDays, Clock, FileText, Phone, Mail, Video, Layers, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { followUpApi, leadApi } from '../../utils/api'
import Portal from '../../components/Portal'

const TYPE_OPTIONS = [
  { value: 'call',    label: 'Call',    icon: Phone  },
  { value: 'email',   label: 'Email',   icon: Mail   },
  { value: 'meeting', label: 'Meeting', icon: Video  },
  { value: 'demo',    label: 'Demo',    icon: Layers },
  { value: 'other',   label: 'Other',   icon: Layers },
]

const OUTCOME_OPTIONS = [
  { value: 'pending',    label: 'Pending'     },
  { value: 'completed',  label: 'Completed'   },
  { value: 'no_answer',  label: 'No Answer'   },
  { value: 'rescheduled',label: 'Rescheduled' },
  { value: 'cancelled',  label: 'Cancelled'   },
]

function toDateInput(iso) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 10) } catch { return '' }
}

function toTimeInput(iso) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(11, 16) } catch { return '' }
}

function buildScheduledAt(date, time) {
  if (!date) return null
  const t = time || '09:00'
  return new Date(`${date}T${t}:00`).toISOString()
}

const EMPTY = { type: 'call', date: '', time: '', outcome: 'pending', notes: '' }


export default function FollowUpForm({ open, onClose, lead, initial, onSaved }) {
  const [form, setForm]               = useState(EMPTY)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [leadOptions, setLeadOptions] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [errors, setErrors]           = useState({})
  const [saving, setSaving]           = useState(false)

  const needsLeadPicker = !lead && !initial

  useEffect(() => {
    if (!open) return

    setSelectedLeadId(lead?._id || '')
    setErrors({})

    if (initial) {
      setForm({
        type:    initial.type    || 'call',
        date:    toDateInput(initial.scheduledAt),
        time:    toTimeInput(initial.scheduledAt),
        outcome: initial.outcome || 'pending',
        notes:   initial.notes   || '',
      })
    } else {
      setForm({ ...EMPTY })
    }

    if (!lead && !initial) {
      setLeadsLoading(true)
      leadApi.getAll({ limit: 100 })
        .then((res) => setLeadOptions(res.data.data || []))
        .catch(() => toast.error('Failed to load leads'))
        .finally(() => setLeadsLoading(false))
    }
  }, [open, initial, lead])

  if (!open) return null

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.date) e.date = 'Date is required'
    if (needsLeadPicker && !selectedLeadId) e.lead = 'Please select a lead'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const targetLeadId = lead?._id || selectedLeadId

    const payload = {
      type:        form.type,
      scheduledAt: buildScheduledAt(form.date, form.time),
      outcome:     form.outcome,
      notes:       form.notes.trim(),
    }

    setSaving(true)
    try {
      if (initial) {
        await followUpApi.update(initial._id, payload)
        toast.success('Follow-up updated')
      } else {
        await followUpApi.createForLead(targetLeadId, payload)
        toast.success('Follow-up scheduled')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to save follow-up')
    } finally {
      setSaving(false)
    }
  }

  const inp = (extra = '') =>
    `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition
     bg-white dark:bg-slate-800
     text-gray-900 dark:text-slate-100
     placeholder:text-gray-400 dark:placeholder:text-slate-500
     focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 ${extra}`
  const errCls = (k) => errors[k]
    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500'
    : 'border-gray-200 dark:border-slate-700'
  const lbl = 'text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block'

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#5C1B1B] to-[#5C1B1B]">
          <div>
            <h2 className="text-lg font-bold text-white">
              {initial ? 'Edit Follow-up' : 'Schedule Follow-up'}
            </h2>
            {lead && (
              <p className="text-xs text-emerald-100 mt-0.5">
                For: <span className="font-semibold">{lead.name}</span>
                {lead.phone && <span className="ml-2 opacity-80">· {lead.phone}</span>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900">

          {/* Lead selector — only when creating from FollowUps page */}
          {needsLeadPicker && (
            <div>
              <label className={lbl}>Lead *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <select
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value)
                    if (errors.lead) setErrors((p) => ({ ...p, lead: '' }))
                  }}
                  disabled={leadsLoading}
                  className={`${inp('pl-9')} ${errors.lead ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                >
                  <option value="">
                    {leadsLoading ? 'Loading leads…' : '— Select a lead —'}
                  </option>
                  {leadOptions.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}{l.phone ? ` · ${l.phone}` : ''}{l.company ? ` (${l.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {errors.lead && <p className="text-xs text-red-500 mt-1">{errors.lead}</p>}
            </div>
          )}

          {/* Type */}
          <div>
            <label className={lbl}>Follow-up Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
form.type === value
                      ? 'bg-[#5C1B1B] text-white border-[#5C1B1B] shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date *</label>
              <div className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={`${inp('pl-9')} ${errCls('date')}`}
                />
              </div>
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className={lbl}>Time</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                  className={`${inp('pl-9')} border-gray-200`}
                />
              </div>
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className={lbl}>Outcome</label>
            <select
              value={form.outcome}
              onChange={(e) => set('outcome', e.target.value)}
              className={`${inp()} border-gray-200`}
            >
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Add notes about this follow-up..."
                className={`${inp('pl-9 resize-none')} border-gray-200`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-[#5C1B1B] hover:bg-[#5C1B1B] disabled:opacity-60 text-white rounded-xl transition flex items-center gap-2"
          >
            <Save size={14} />
            {saving ? 'Saving...' : initial ? 'Update' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
