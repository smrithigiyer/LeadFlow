import { X, StickyNote } from 'lucide-react'
import Portal from './Portal'
import NotesThread from './NotesThread'

/**
 * A lightweight side-drawer wrapping NotesThread.
 * Usable for any entity — pass targetType="lead"|"followup".
 */
export default function NotesDrawer({ open, targetId, targetType = 'lead', title = 'Notes', subtitle, initialNote = null, onClose }) {
  if (!open || !targetId) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <StickyNote size={14} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Thread — fills remaining height */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <NotesThread targetId={targetId} targetType={targetType} initialNote={initialNote} />
          </div>
        </div>
      </div>
    </Portal>
  )
}
