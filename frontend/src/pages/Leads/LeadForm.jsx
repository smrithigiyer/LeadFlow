import { useEffect, useState } from 'react'
import {
  User, Mail, Phone, Building2,
  FileText, X, Save, Globe, Tag, UserCheck, IndianRupee, AlertCircle, CalendarDays,
} from 'lucide-react'
import { SOURCE_OPTIONS, ALL_STATUSES, STATUS_META, EMPTY_FORM, LOST_REASON_OPTIONS } from './leadConstants'
import Portal from '../../components/Portal'
import { userApi } from '../../utils/api'

const LOST_STATUSES = ['lost', 'not_interested', 'no_response']

const FOLLOWUP_TYPES = [
  { value: 'call',    label: 'Phone Call' },
  { value: 'email',   label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo',    label: 'Demo' },
  { value: 'other',   label: 'Other' },
]

const EMPTY_FOLLOWUP = { enabled: false, type: 'call', scheduledAt: '', notes: '' }

export default function LeadForm({ open, onClose, initial, onSave }) {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [followUp, setFollowUp] = useState(EMPTY_FOLLOWUP)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [staffUsers, setStaffUsers] = useState([])

  useEffect(() => {
    if (open) {
      const base = initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM }
      if (!base.phone?.startsWith('+91')) base.phone = '+91 '
      setForm(base)
      setFollowUp(EMPTY_FOLLOWUP)
      setErrors({})
      userApi.getAll()
        .then((res) => setStaffUsers(res.data.data || []))
        .catch(() => {})
    }
  }, [initial, open])

  if (!open) return null

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const setFU = (key, value) => {
    setFollowUp((prev) => ({ ...prev, [key]: value }))
    if (key === 'scheduledAt' && errors.followUpDate) setErrors((prev) => ({ ...prev, followUpDate: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required'
    const phoneDigits = form.phone.startsWith('+91 ') ? form.phone.slice(4) : form.phone.replace(/\D/g, '')
    if (!phoneDigits) e.phone = 'Phone number is required'
    else if (phoneDigits.length !== 10) e.phone = 'Enter a valid 10-digit number'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Invalid email'
    }
    if (followUp.enabled && !followUp.scheduledAt) {
      e.followUpDate = 'Select a date and time for the follow-up'
    }
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      await onSave(form, followUp.enabled ? followUp : null)
    } finally {
      setSaving(false)
    }
  }

  const inp = (extra = '') =>
    `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition
     bg-white dark:bg-slate-800
     text-gray-900 dark:text-slate-100
     placeholder:text-gray-400 dark:placeholder:text-slate-500
     focus:ring-2 focus:ring-brand-500 focus:border-brand-400 ${extra}`

  const errCls = (key) => errors[key]
    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500'
    : 'border-gray-200 dark:border-slate-700'
  const label  = 'text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block'

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#5C1B1B] to-[#5C1B1B]">
          <div>
            <h2 className="text-lg font-bold text-white">
              {initial ? 'Edit Lead' : 'Add New Lead'}
            </h2>
            <p className="text-xs text-[#F5F2ED] mt-0.5">
              {initial ? 'Update lead information' : 'Fill in the details to create a new lead'}
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name */}
            <div>
              <label className={label}>Full Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="John Doe"
                  className={`${inp('pl-9')} ${errCls('name')}`}
                />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className={label}>Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="john@example.com"
                  className={`${inp('pl-9')} ${errCls('email')}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className={label}>Phone Number *</label>
              <div className="relative flex items-center">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium select-none pointer-events-none z-10">
                  +91
                </span>
                <input
                  type="tel"
                  value={form.phone.startsWith('+91 ') ? form.phone.slice(4) : form.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    set('phone', '+91 ' + digits)
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`${inp('pl-[4.5rem]')} ${errCls('phone')}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Company */}
            <div>
              <label className={label}>Company Name</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="Company Name"
                  className={`${inp('pl-9')} border-gray-200`}
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <label className={label}>Lead Source</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  className={`${inp('pl-9')} border-gray-200`}
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={label}>Lead Status</label>
              <div className="relative">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className={`${inp('pl-9')} ${
                    form.status === 'converted'              ? 'border-[#5C1B1B] focus:ring-[#5C1B1B]' :
                    LOST_STATUSES.includes(form.status)     ? 'border-rose-300 focus:ring-rose-400'       :
                    'border-gray-200'
                  }`}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                  ))}
                </select>
              </div>
              {form.status === 'converted' && (
              <p className="mt-1 text-[10px] text-[#5C1B1B] dark:text-[#5C1B1B] flex items-center gap-1 truncate">
                  <span className="w-1 h-1 rounded-full bg-[#5C1B1B] shrink-0" />
                  Moves to <strong>Customers</strong> — removed from Leads
                </p>
              )}
              {LOST_STATUSES.includes(form.status) && (
                <p className="mt-1 text-[10px] text-rose-500 dark:text-rose-400 flex items-center gap-1 truncate">
                  <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                  Moves to <strong>Lost Leads</strong> — removed from Leads
                </p>
              )}
            </div>

            {/* Assigned To */}
            <div className="md:col-span-2">
              <label className={label}>Assigned Executive</label>
              <div className="relative">
                <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={form.assignedTo}
                  onChange={(e) => set('assignedTo', e.target.value)}
                  className={`${inp('pl-9')} border-gray-200`}
                >
                  <option value="">— Unassigned —</option>
                  {staffUsers.map((u) => (
                    <option key={u._id} value={u.name}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Deal Value — shown only when converted */}
          {form.status === 'converted' && (
            <div>
              <label className={label}>Deal Value (₹)</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C1B1B]" />
                <input
                  type="number"
                  min="0"
                  value={form.dealValue}
                  onChange={(e) => set('dealValue', e.target.value)}
                  placeholder="e.g. 50000"
                  className={`${inp('pl-9')} border-[#5C1B1B]/30 focus:ring-[#5C1B1B]`}
                />
              </div>
              <p className="text-xs text-[#5C1B1B] dark:text-[#5C1B1B] mt-1">Optional — enter the deal/contract value for this customer</p>
            </div>
          )}

          {/* Lost Reason — shown for lost/not_interested/no_response */}
          {LOST_STATUSES.includes(form.status) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10">
              <div>
                <label className={label + ' text-rose-600 dark:text-rose-400'}>Loss Reason</label>
                <div className="relative">
                  <AlertCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                  <select
                    value={form.lostReason}
                    onChange={(e) => set('lostReason', e.target.value)}
                    className={`${inp('pl-9')} border-rose-200 dark:border-rose-800`}
                  >
                    {LOST_REASON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={label + ' text-rose-600 dark:text-rose-400'}>Loss Note</label>
                <input
                  type="text"
                  value={form.lostNote}
                  onChange={(e) => set('lostNote', e.target.value)}
                  placeholder="Brief note on why..."
                  className={`${inp('')} border-rose-200 dark:border-rose-800`}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={label}>Notes</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Add any relevant notes about this lead..."
                className={`${inp('pl-9 resize-none')} border-gray-200`}
              />
            </div>
          </div>

          {/* Schedule Follow-up — only on create */}
          {!initial && (
            <div>
              <button
                type="button"
                onClick={() => setFU('enabled', !followUp.enabled)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                  followUp.enabled
                    ? 'border-[#5C1B1B] bg-[#5C1B1B]/10 dark:bg-[#5C1B1B]/30 text-[#5C1B1B] dark:text-[#F5F2ED]'
                    : 'border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-[#5C1B1B] hover:text-[#5C1B1B]'
                }`}
              >
                <CalendarDays size={14} />
                {followUp.enabled ? 'Follow-up will be scheduled' : '+ Schedule a Follow-up'}
              </button>

              {followUp.enabled && (
              <div className="mt-3 p-4 rounded-xl border border-[#5C1B1B]/20 dark:border-[#5C1B1B]/40 bg-[#5C1B1B]/5 dark:bg-[#5C1B1B]/20 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={label + ' text-[#5C1B1B] dark:text-[#F5F2ED]'}>Type</label>
                      <select
                        value={followUp.type}
                        onChange={(e) => setFU('type', e.target.value)}
                        className={`${inp('')} border-[#5C1B1B]/30 dark:border-[#5C1B1B]/50`}

                      >
                        {FOLLOWUP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={label + ' text-[#5C1B1B] dark:text-[#F5F2ED]'}>Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={followUp.scheduledAt}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setFU('scheduledAt', e.target.value)}
                        className={`${inp('')} ${errors.followUpDate ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-[#5C1B1B]/30 dark:border-[#5C1B1B]/50'}`}
                      />
                      {errors.followUpDate && (
                        <p className="text-xs text-red-500 mt-1">{errors.followUpDate}</p>
                      )}
                    </div>
                  </div>
                  <div>
                      <label className={label + ' text-[#5C1B1B] dark:text-[#F5F2ED]'}>Notes</label>
                    <textarea
                      rows={2}
                      value={followUp.notes}
                      onChange={(e) => setFU('notes', e.target.value)}
                      placeholder="What's this follow-up about?"
                      maxLength={1000}
                      className={`${inp('resize-none')} border-[#5C1B1B]/30 dark:border-[#5C1B1B]/50`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
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
                  className="px-5 py-2 text-sm font-semibold bg-[#5C1B1B] hover:bg-[#5C1B1B]/90 disabled:opacity-60 text-white rounded-xl transition flex items-center gap-2"
          >
            <Save size={14} />
            {saving ? 'Saving...' : initial ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
