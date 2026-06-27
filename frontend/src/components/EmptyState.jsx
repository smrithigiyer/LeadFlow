/**
 * Generic empty-state placeholder used inside tables and lists.
 *
 * @param {React.ElementType} icon     - Lucide icon component
 * @param {string}            title       - Main message
 * @param {string}            [description] - Supporting copy
 * @param {React.ReactNode}   [action]  - Optional CTA node
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
