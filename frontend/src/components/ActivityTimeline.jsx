import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Plus, RefreshCw, ArrowRightLeft, UserCheck, FileText,
  PhoneCall, Trash2, Upload, AlertCircle, History, Mail, Globe,
} from 'lucide-react'
import { activityApi } from '../utils/api'

const ACTION_META = {
  created:            { icon: Plus,          color: 'bg-emerald-500', label: 'Lead created'              },
  updated:            { icon: FileText,      color: 'bg-blue-500',    label: 'Details updated'            },
  status_changed:     { icon: ArrowRightLeft,color: 'bg-purple-500',  label: 'Status changed'             },
  assigned:           { icon: UserCheck,     color: 'bg-indigo-500',  label: 'Lead assigned'              },
  note_added:         { icon: FileText,      color: 'bg-amber-500',   label: 'Note added'                 },
  follow_up_added:    { icon: PhoneCall,     color: 'bg-teal-500',    label: 'Follow-up scheduled'        },
  follow_up_updated:  { icon: RefreshCw,     color: 'bg-cyan-500',    label: 'Follow-up updated'          },
  follow_up_deleted:  { icon: Trash2,        color: 'bg-rose-500',    label: 'Follow-up removed'          },
  imported:           { icon: Upload,        color: 'bg-slate-500',   label: 'Imported'                   },
  deleted:            { icon: Trash2,        color: 'bg-red-500',     label: 'Lead deleted'               },
  email_sent:         { icon: Mail,          color: 'bg-blue-500',    label: 'Email sent'                 },
  enquiry_submitted:  { icon: Globe,         color: 'bg-emerald-500', label: 'Submitted via enquiry form' },
  enquiry_repeat:     { icon: Globe,         color: 'bg-amber-500',   label: 'Re-submitted enquiry form'  },
}

const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  meeting_scheduled: 'Meeting Scheduled', converted: 'Converted',
  no_response: 'No Response', not_interested: 'Not Interested', lost: 'Lost',
}

function ActivityDetail({ action, details }) {
  if (!details || Object.keys(details).length === 0) return null

  if (action === 'status_changed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium">
          {STATUS_LABEL[details.from] || details.from}
        </span>
        <ArrowRightLeft size={9} className="text-slate-400" />
        <span className="px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium">
          {STATUS_LABEL[details.to] || details.to}
        </span>
      </span>
    )
  }

  if (action === 'assigned') {
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {details.from ? `${details.from} → ${details.to}` : `Assigned to ${details.to}`}
      </span>
    )
  }

  // New leads submitted via the public enquiry form
  if (action === 'enquiry_submitted') {
    return (
      <div className="flex flex-col gap-0.5 mt-0.5">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">via website enquiry form</span>
        {details.note && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
            "{details.note}"
          </span>
        )}
      </div>
    )
  }

  // Existing lead re-submitted the public enquiry form
  if (action === 'enquiry_repeat') {
    return (
      <div className="flex flex-col gap-0.5 mt-0.5">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">re-submitted via website enquiry form</span>
        {details.note && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
            "{details.note}"
          </span>
        )}
      </div>
    )
  }

  // Backward-compat: old records logged as 'created' with source 'website_form'
  if (action === 'created' && details.source === 'website_form') {
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">via website enquiry form</span>
    )
  }

  if (action === 'note_added' && details.note) {
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
        "{details.note}"
      </span>
    )
  }

  if (action === 'follow_up_added' || action === 'follow_up_updated') {
    const type = details.type ? details.type.charAt(0).toUpperCase() + details.type.slice(1) : ''
    const date = details.scheduledAt ? format(new Date(details.scheduledAt), 'dd MMM, h:mm a') : ''
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {[type, date].filter(Boolean).join(' · ')}
      </span>
    )
  }

  if (action === 'email_sent') {
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {details.subject && <span className="font-medium">"{details.subject}"</span>}
        {details.to && <span> → {details.to}</span>}
      </span>
    )
  }

  if (action === 'imported' && details.fileName) {
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        via {details.fileName}
      </span>
    )
  }

  if (action === 'updated' && details.changed) {
    const fields = Object.keys(details.changed)
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {fields.map((f) => f.replace(/_/g, ' ')).join(', ')} changed
      </span>
    )
  }

  return null
}

export default function ActivityTimeline({ leadId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const load = async () => {
    if (!leadId) return
    setLoading(true)
    setError(null)
    try {
      const res = await activityApi.getByLead(leadId)
      setActivities(res.data.data || [])
    } catch {
      setError('Failed to load activity history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [leadId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
        <RefreshCw size={16} className="animate-spin opacity-50" />
        <span className="text-xs">Loading timeline…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-red-400">
        <AlertCircle size={14} />
        <span className="text-xs">{error}</span>
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300 dark:text-slate-600">
        <History size={22} />
        <span className="text-xs text-slate-400 dark:text-slate-500">No activity yet</span>
      </div>
    )
  }

  return (
    <div className="relative pl-5">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />

      <div className="space-y-4">
        {activities.map((act, i) => {
          const meta = ACTION_META[act.action] || ACTION_META.updated
          const Icon = meta.icon
          const isFirst = i === 0

          return (
            <div key={act._id} className="relative flex gap-3">
              {/* Dot */}
              <div className={`absolute -left-5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.color} ${isFirst ? 'ring-2 ring-white dark:ring-slate-900 ring-offset-1' : ''}`}>
                <Icon size={7} className="text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                      {meta.label}
                    </p>
                    <ActivityDetail action={act.action} details={act.details} />
                    {act.performedBy && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        by {act.performedBy.name || 'System'}
                      </p>
                    )}
                  </div>
                  <time
                    className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap"
                    title={format(new Date(act.createdAt), 'dd MMM yyyy, h:mm a')}
                  >
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </time>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
