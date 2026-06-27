import { useState } from 'react'
import { X, Mail, Phone, Building2, Globe, Tag, FileText, CalendarDays, PhoneCall, History, User, StickyNote } from 'lucide-react'
import { format } from 'date-fns'
import Portal from '../../components/Portal'
import ActivityTimeline from '../../components/ActivityTimeline'
import NotesThread from '../../components/NotesThread'
import EmailComposePanel from '../../components/EmailComposePanel'

const STATUS_META = {
  new:               { label: 'New',               cls: 'bg-blue-100 text-blue-700'     },
  contacted:         { label: 'Contacted',          cls: 'bg-purple-100 text-purple-700' },
  interested:        { label: 'Interested',         cls: 'bg-yellow-100 text-yellow-700' },
  meeting_scheduled: { label: 'Meeting Scheduled',  cls: 'bg-orange-100 text-orange-700' },
  converted:         { label: 'Converted',          cls: 'bg-emerald-100 text-emerald-700'},
  no_response:       { label: 'No Response',        cls: 'bg-slate-100 text-slate-600'   },
  not_interested:    { label: 'Not Interested',     cls: 'bg-red-100 text-red-600'       },
  lost:              { label: 'Lost',               cls: 'bg-red-100 text-red-700'       },
}

const SOURCE_LABEL = {
  website: 'Website', referral: 'Referral', social_media: 'Social Media',
  cold_call: 'Cold Call', email_campaign: 'Email Campaign', event: 'Event', other: 'Other',
}

const TABS = [
  { id: 'details',  label: 'Details',  icon: FileText   },
  { id: 'notes',    label: 'Notes',    icon: StickyNote },
  { id: 'timeline', label: 'Timeline', icon: History    },
]

export default function LeadDetailDrawer({ lead, onClose, onEdit, onScheduleFollowup, followupCount }) {
  const [activeTab, setActiveTab]           = useState('details')
  const [showEmailCompose, setShowEmailCompose] = useState(false)
  if (!lead) return null

  const meta = STATUS_META[lead.status] || {}

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-6 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            >
              <X size={15} />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
                {lead.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">{lead.name}</h2>
                {lead.company && (
                  <p className="text-brand-200 text-xs mt-0.5 flex items-center gap-1 truncate">
                    <Building2 size={11} />
                    {lead.company}
                  </p>
                )}
                <span className={`inline-flex items-center mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs — hidden while composing */}
          {!showEmailCompose && (
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
                    activeTab === id
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {showEmailCompose && (
              <EmailComposePanel
                lead={lead}
                onClose={() => setShowEmailCompose(false)}
                onSent={() => setActiveTab('timeline')}
              />
            )}

            {!showEmailCompose && activeTab === 'details' && (
              <div className="p-5 space-y-5">
                {/* Contact Info */}
                <section>
                  <h3 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Contact Info</h3>
                  <div className="space-y-2.5">
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Phone</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{lead.phone}</p>
                        </div>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Mail size={13} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Email</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{lead.email}</p>
                        </div>
                      </div>
                    )}
                    {lead.assignedTo && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <User size={13} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Assigned To</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{lead.assignedTo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Lead Details */}
                <section>
                  <h3 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><Globe size={10} /> Source</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">
                        {SOURCE_LABEL[lead.source] || lead.source || '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><CalendarDays size={10} /> Created</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy') : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><PhoneCall size={10} /> Follow-ups</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{followupCount ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><Tag size={10} /> Status</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{meta.label || '—'}</p>
                    </div>
                  </div>
                </section>

                {/* Legacy quick-note from lead form */}
                {lead.notes && (
                  <section>
                    <h3 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <FileText size={10} /> Quick Note
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {lead.notes}
                    </div>
                  </section>
                )}
              </div>
            )}

            {!showEmailCompose && activeTab === 'notes' && (
              <NotesThread
                targetId={lead._id}
                targetType="lead"
                initialNote={lead.notes || null}
              />
            )}

            {!showEmailCompose && activeTab === 'timeline' && (
              <div className="p-5">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Activity History</p>
                <ActivityTimeline leadId={lead._id} />
              </div>
            )}
          </div>

          {/* Footer — hidden while compose panel has its own footer */}
          {!showEmailCompose && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0 bg-white dark:bg-slate-900">
              <button
                onClick={onEdit}
                className="flex-1 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
              >
                Edit Lead
              </button>
              {lead.email && (
                <button
                  onClick={() => setShowEmailCompose(true)}
                  className="flex-1 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Mail size={13} />
                  Send Email
                </button>
              )}
              <button
                onClick={onScheduleFollowup}
                onClick={onScheduleFollowup}
className="flex-1 py-2 text-sm font-semibold bg-[#5C1B1B] hover:bg-[#4A1616] text-white rounded-lg transition flex items-center justify-center gap-1.5"
>
            
                <PhoneCall size={13} />
                Follow-up
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
