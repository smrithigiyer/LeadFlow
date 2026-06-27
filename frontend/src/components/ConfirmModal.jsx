import { AlertTriangle, Moon, Trash2, CheckCircle2 } from 'lucide-react'
import Portal from './Portal'

const ICON_MAP = {
  delete:  { Icon: Trash2,         bg: 'bg-red-100 dark:bg-red-900/30',       icon: 'text-red-500'                              },
  theme:   { Icon: Moon,           bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-500 dark:text-indigo-400'      },
  warn:    { Icon: AlertTriangle,  bg: 'bg-amber-100 dark:bg-amber-900/30',   icon: 'text-amber-500'                            },
  success: { Icon: CheckCircle2,   bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-500 dark:text-emerald-400'  },
}

const BTN_COLOR = {
  red:     'bg-red-500 hover:bg-red-600 focus:ring-red-400',
  indigo:  'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400',
  amber:   'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
  brand:   'bg-brand-600 hover:bg-brand-700 focus:ring-brand-400',
  emerald: 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400',
}

export default function ConfirmModal({
  open,
  variant      = 'warn',
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'red',
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null

  const { Icon, bg, icon } = ICON_MAP[variant] ?? ICON_MAP.warn
  const btnCls = BTN_COLOR[confirmColor] ?? BTN_COLOR.red

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">

          <div className="flex items-start gap-4 mb-5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon size={20} className={icon} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          {children && <div className="mb-5">{children}</div>}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
