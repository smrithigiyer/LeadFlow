/**
 * Reusable badge / pill components.
 * All purely presentational — no state, no side effects.
 */

const STATUS_CLASSES = {
  new:       'badge badge-blue',
  contacted: 'badge badge-purple',
  converted: 'badge badge-green',
  pending:   'badge badge-yellow',
  completed: 'badge badge-green',
  cancelled: 'badge badge-red',
}

/** Coloured pill that reflects a lead or follow-up status. */
export function StatusBadge({ status }) {
  const cls = STATUS_CLASSES[status] ?? 'badge badge-gray'
  return (
    <span className={cls}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
    </span>
  )
}
