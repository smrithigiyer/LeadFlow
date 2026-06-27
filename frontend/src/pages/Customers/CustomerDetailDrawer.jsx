import { useState } from 'react'
import {
  X, Mail, Phone, Building2, UserCheck, CalendarCheck,
  IndianRupee, Globe, FileText, Save, Edit3, CheckCircle2,
} from 'lucide-react'
import { customerApi } from '../../utils/api'
import ActivityTimeline from '../../components/ActivityTimeline'
import Portal from '../../components/Portal'

function Field({ icon: Icon, label, value, color = 'text-slate-400' }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium mt-0.5 break-all">{value}</p>
      </div>
    </div>
  )
}

export default function CustomerDetailDrawer({ open, customer, onClose, onUpdate }) {
  const [editing, setEditing]   = useState(false)
  const [dealValue, setDealValue] = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const startEdit = () => {
    setDealValue(customer?.dealValue ?? '')
    setNotes(customer?.notes ?? '')
    setEditing(true)
    setSaved(false)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await customerApi.update(customer._id, {
        dealValue: dealValue !== '' ? Number(dealValue) : null,
        notes,
      })
      onUpdate?.(res.data.data)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* keep editing */ }
    finally { setSaving(false) }
  }

  if (!open || !customer) return null

  const initials = customer.name
    ? customer.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  return (
    <Portal>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-100 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-5 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
              Customer
            </span>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-100">
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
              {!editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition"
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{customer.name}</h2>
              {customer.company && (
                <p className="text-emerald-100 text-sm mt-0.5">{customer.company}</p>
              )}
              {customer.dealValue > 0 && (
                <p className="text-white font-semibold text-sm mt-1">
                  ₹{Number(customer.dealValue).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Edit panel */}
          {editing && (
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Edit Customer</p>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Deal Value (₹)</label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="number"
                    min="0"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Customer notes..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-2 transition flex items-center justify-center gap-1.5"
                >
                  <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="p-5 space-y-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contact Details</p>
            <Field icon={Mail}        label="Email"       value={customer.email}                                      color="text-blue-400" />
            <Field icon={Phone}       label="Phone"       value={customer.phone}                                      color="text-green-500" />
            <Field icon={Building2}   label="Company"     value={customer.company}                                    color="text-slate-400" />
            <Field icon={Globe}       label="Source"      value={customer.source?.replace(/_/g, ' ')}                color="text-indigo-400" />
            <Field icon={UserCheck}   label="Account Mgr" value={customer.assignedTo}                                color="text-purple-400" />
            <Field icon={CalendarCheck} label="Converted" value={customer.convertedAt ? new Date(customer.convertedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} color="text-emerald-500" />
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Notes</p>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-amber-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{customer.notes}</p>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Activity History</p>
            <ActivityTimeline leadId={customer._id} />
          </div>
        </div>
      </div>
    </Portal>
  )
}
