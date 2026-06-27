import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Check, X, StickyNote } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'
import { notesApi } from '../utils/api'

function authorInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function timeLabel(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const age = Date.now() - d.getTime()
    if (age < 7 * 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(d, { addSuffix: true })
    }
    return format(d, 'dd MMM yyyy, HH:mm')
  } catch { return '' }
}

// Pastel avatar colours cycled by author name
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
]
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function NoteCard({ note, onUpdate, onDelete }) {
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState(note.content)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const textareaRef               = useRef(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  const handleSave = async () => {
    if (!draft.trim() || draft.trim() === note.content) { setEditing(false); return }
    setSaving(true)
    try {
      await onUpdate(note._id, draft.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(note._id)
    } finally {
      setDeleting(false)
    }
  }

  const color = avatarColor(note.authorName)

  return (
    <div className="flex gap-3 group/note">
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${color}`}>
        {authorInitials(note.authorName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {note.authorName || 'Unknown'}
          </span>
          <span
            className="text-[10px] text-slate-400 dark:text-slate-500"
            title={note.createdAt ? format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm') : ''}
          >
            {timeLabel(note.createdAt)}
            {note.updatedAt !== note.createdAt && (
              <span className="ml-1 italic">(edited)</span>
            )}
          </span>

          {/* Action buttons — visible on row hover */}
          {!editing && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity">
              <button
                onClick={() => { setDraft(note.content); setEditing(true) }}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
                title="Edit"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-40"
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={3}
              maxLength={500}
              className="w-full text-xs rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-2 outline-none focus:ring-2 focus:ring-brand-100 resize-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-40 transition"
              >
                <Check size={11} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <X size={11} /> Cancel
              </button>
              <span className="text-[10px] text-slate-400 ml-auto">⌘ Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
            {note.content}
          </p>
        )}
      </div>
    </div>
  )
}

export default function NotesThread({ targetId, targetType = 'lead', initialNote = null }) {
  const [notes, setNotes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [compose, setCompose] = useState('')
  const [adding, setAdding]   = useState(false)

  const fetchFn  = targetType === 'followup' ? notesApi.getByFollowup    : notesApi.getByLead
  const createFn = targetType === 'followup' ? notesApi.createForFollowup : notesApi.create

  useEffect(() => {
    if (!targetId) return
    setLoading(true)
    setNotes([])
    fetchFn(targetId)
      .then((r) => setNotes(r.data.data || []))
      .catch(() => toast.error('Failed to load notes'))
      .finally(() => setLoading(false))
  }, [targetId, targetType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!compose.trim()) return
    setAdding(true)
    try {
      const { data } = await createFn(targetId, compose.trim())
      setNotes((prev) => [data.data, ...prev])
      setCompose('')
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to add note')
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, content) => {
    try {
      const { data } = await notesApi.update(id, content)
      setNotes((prev) => prev.map((n) => n._id === id ? data.data : n))
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to update note')
      throw err
    }
  }

  const handleDelete = async (id) => {
    try {
      await notesApi.delete(id)
      setNotes((prev) => prev.filter((n) => n._id !== id))
    } catch (err) {
      toast.error(err.friendlyMessage ?? 'Failed to delete note')
      throw err
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compose box */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <textarea
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
          placeholder="Add a note… (⌘ Enter to submit)"
          rows={3}
          maxLength={500}
          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 resize-none placeholder:text-slate-400 transition"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400">{compose.length}/500</span>
          <button
            onClick={handleAdd}
            disabled={adding || !compose.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-40 transition"
          >
            {adding ? 'Adding…' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Initial creation note — pinned at top, read-only */}
          {initialNote && (
            <div className="flex gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <StickyNote size={12} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">When created</span>
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40">
                    Initial note
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                  {initialNote}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
              Loading notes…
            </div>
          ) : notes.length === 0 ? (
            !initialNote && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300 dark:text-slate-600">
                <StickyNote size={28} />
                <p className="text-xs text-slate-400">No notes yet. Add the first one above.</p>
              </div>
            )
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
