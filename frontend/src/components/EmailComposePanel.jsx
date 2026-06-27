import { useState, useRef } from 'react'
import { ArrowLeft, Send, Mail, ChevronDown, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { emailApi } from '../utils/api'

const SUBJECT_CATEGORIES = [
  {
    key: 'followup', label: 'Follow-up',
    subjects: [
      'Following up on your enquiry',
      'Quick follow-up from our conversation',
      'Checking in — are you still interested?',
      'Any updates on your end?',
      'Following up on our previous discussion',
    ],
  },
  {
    key: 'intro', label: 'Introduction',
    subjects: [
      'Introduction & how we can help',
      'Reaching out about your business needs',
      'Solutions tailored for your business',
      "Getting started — here's what we offer",
      "We'd love to work with you",
    ],
  },
  {
    key: 'proposal', label: 'Proposal',
    subjects: [
      'Your customised proposal is ready',
      'Quotation for your requirements',
      'Exclusive offer for your business',
      'Investment plan for your review',
      'Proposal — please find attached',
    ],
  },
  {
    key: 'schedule', label: 'Scheduling',
    subjects: [
      'Meeting confirmation',
      'Scheduling our discovery call',
      "Demo invitation — pick your slot",
      "Next steps — let's connect",
      'Confirming our appointment',
    ],
  },
  {
    key: 'thankyou', label: 'Thank You',
    subjects: [
      'Thank you for your interest',
      'Great speaking with you today',
      'Thank you for your time',
      'Summary & next steps from our meeting',
      "Appreciate your time — here's what's next",
    ],
  },
  {
    key: 'reengage', label: 'Re-engage',
    subjects: [
      "Checking in — it's been a while",
      'Still interested? We have exciting updates',
      'Reconnecting with something new for you',
      'New solutions for your business',
      "We'd love to reconnect",
    ],
  },
]

export default function EmailComposePanel({ lead, onClose, onSent }) {
  const [to,             setTo]             = useState(lead.email || '')
  const [subject,        setSubject]        = useState('')
  const [body,           setBody]           = useState('')
  const [sending,        setSending]        = useState(false)
  const [showTemplates,  setShowTemplates]  = useState(false)
  const [activeCategory, setActiveCategory] = useState('followup')

  const tabsRef = useRef(null)
  const catIndex = SUBJECT_CATEGORIES.findIndex((c) => c.key === activeCategory)
  const canPrev  = catIndex > 0
  const canNext  = catIndex < SUBJECT_CATEGORIES.length - 1

  const shiftCategory = (dir) => {
    const next = SUBJECT_CATEGORIES[catIndex + dir]
    if (next) setActiveCategory(next.key)
  }

  const activeSubjects = SUBJECT_CATEGORIES[catIndex]?.subjects ?? []

  const handleSend = async () => {
    if (!to.trim())      return toast.error('Recipient email is required')
    if (!subject.trim()) return toast.error('Subject is required')
    if (!body.trim())    return toast.error('Body is required')

    setSending(true)
    try {
      await emailApi.send(lead._id, { to: to.trim(), subject: subject.trim(), body: body.trim() })
      toast.success('Email sent successfully')
      onSent?.()
      onClose()
    } catch (err) {
      toast.error(err.friendlyMessage || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-brand-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compose Email</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* To */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
            To
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Subject */}
        <div>
          {/* Label row with Templates toggle */}
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Subject
            </label>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition ${
                showTemplates
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : 'border-brand-400 dark:border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50'
              }`}
            >
              Templates
              <ChevronDown
                size={11}
                className={`transition-transform duration-200 ${showTemplates ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            maxLength={200}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          {/* Template panel */}
          {showTemplates && (
            <div className="mt-2 rounded-xl border border-brand-200 dark:border-brand-800/60 overflow-hidden shadow-md bg-white dark:bg-slate-800 ring-1 ring-brand-100 dark:ring-brand-900/40">

              {/* Brand accent bar */}
              <div className="h-0.5 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-300" />

              {/* Category carousel — prev / active label / next */}
              <div className="flex items-center border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70">
                <button
                  type="button"
                  onClick={() => shiftCategory(-1)}
                  disabled={!canPrev}
                  className="px-3 py-2.5 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:cursor-not-allowed transition shrink-0"
                >
                  <ChevronLeft size={14} />
                </button>

                <div ref={tabsRef} className="flex-1 flex flex-col items-center justify-center py-2">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400 leading-none">
                    {SUBJECT_CATEGORIES[catIndex].label}
                  </span>
                  <div className="flex gap-1 mt-1.5">
                    {SUBJECT_CATEGORIES.map((_, i) => (
                      <span
                        key={i}
                        className={`rounded-full transition-all ${
                          i === catIndex
                            ? 'w-3 h-1.5 bg-brand-500'
                            : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => shiftCategory(1)}
                  disabled={!canNext}
                  className="px-3 py-2.5 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:cursor-not-allowed transition shrink-0"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Subject rows */}
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {activeSubjects.map((t) => {
                  const isActive = subject === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setSubject(t); setShowTemplates(false) }}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 transition ${
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <CheckCircle2
                        size={13}
                        className={`shrink-0 transition-opacity ${isActive ? 'text-brand-500 opacity-100' : 'opacity-0'}`}
                      />
                      <span>{t}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hi ${lead.name?.split(' ')[0] || 'there'},\n\n`}
            rows={10}
            maxLength={5000}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none leading-relaxed"
          />
          <p className="text-[10px] text-slate-400 text-right mt-1">{body.length}/5000</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0 bg-white dark:bg-slate-900">
        <button
          onClick={onClose}
          disabled={sending}
          className="flex-1 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject || !body}
          className="flex-1 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-1.5"
        >
          <Send size={13} />
          {sending ? 'Sending…' : 'Send Email'}
        </button>
      </div>
    </div>
  )
}
