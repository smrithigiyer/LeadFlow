import { useEffect } from 'react'
import { X } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

/**
 * Accessible modal dialog with backdrop, Escape-to-close, and scroll lock.
 *
 * @param {boolean}          open      - Controls visibility
 * @param {() => void}       onClose   - Close handler
 * @param {string}           title     - Modal heading
 * @param {React.ReactNode}  children  - Body content
 * @param {React.ReactNode}  [footer]  - Footer actions
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  // Escape key listener
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={[
          'bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
