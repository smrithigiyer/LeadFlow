export const PIPELINE_STATUSES = [
  'new',
  'contacted',
  'interested',
  'meeting_scheduled',
]

// These move a lead OUT of the Leads module into Lost Leads
export const LOST_STATUSES = [
  'no_response',
  'not_interested',
  'lost',
]

// Statuses shown in the Leads table filter (pipeline only)
export const LEAD_MODULE_STATUSES = [...PIPELINE_STATUSES]

// Full list for the LeadForm dropdown (all options so users can trigger moves)
export const ALL_STATUSES = [
  ...PIPELINE_STATUSES,
  'converted',
  ...LOST_STATUSES,
]

export const SOURCE_OPTIONS = [
  { value: '',              label: 'Select Source' },
  { value: 'website',       label: 'Website' },
  { value: 'referral',      label: 'Referral' },
  { value: 'social_media',  label: 'Social Media' },
  { value: 'cold_call',     label: 'Cold Call' },
  { value: 'email_campaign',label: 'Email Campaign' },
  { value: 'event',         label: 'Event' },
  { value: 'other',         label: 'Other' },
]

export const SOURCE_META = {
  website:        { label: 'Website',        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'         },
  referral:       { label: 'Referral',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  social_media:   { label: 'Social Media',   color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800'   },
  cold_call:      { label: 'Cold Call',      color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'   },
  email_campaign: { label: 'Email Campaign', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800'               },
  event:          { label: 'Event',          color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'               },
  other:          { label: 'Other',          color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'           },
}

export const STATUS_META = {
  new: {
    label: 'New',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  contacted: {
    label: 'Contacted',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
  },
  interested: {
    label: 'Interested',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  },
  meeting_scheduled: {
    label: 'Meeting Scheduled',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  },
  converted: {
    label: 'Converted',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  },
  no_response: {
    label: 'No Response',
    color: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  not_interested: {
    label: 'Not Interested',
    color: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  },
  lost: {
    label: 'Lost',
    color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
  },
}

export const LOST_REASON_OPTIONS = [
  { value: '',             label: 'Select reason (optional)' },
  { value: 'price',        label: 'Price too high' },
  { value: 'competitor',   label: 'Chose a competitor' },
  { value: 'timing',       label: 'Bad timing' },
  { value: 'no_budget',    label: 'No budget' },
  { value: 'no_need',      label: 'No longer needs it' },
  { value: 'unresponsive', label: 'Stopped responding' },
  { value: 'other',        label: 'Other' },
]

export const LOST_REASON_META = {
  price:        { label: 'Price',        color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  competitor:   { label: 'Competitor',   color: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  timing:       { label: 'Timing',       color: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
  no_budget:    { label: 'No Budget',    color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' },
  no_need:      { label: 'No Need',      color: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
  unresponsive: { label: 'Unresponsive', color: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
  other:        { label: 'Other',        color: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
}

export const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  company: '',
  source: '',
  status: 'new',
  assignedTo: '',
  notes: '',
  dealValue: '',
  lostReason: '',
  lostNote: '',
}
