const COLOR_MAP = {
  brand: {
    soft: 'bg-brand-50 dark:bg-brand-900/30',
    ring: 'ring-brand-100 dark:ring-brand-800/40',
    text: 'text-brand-600 dark:text-brand-400',
  },

  blue: {
    soft: 'bg-brand-100 dark:bg-brand-900/30',
    ring: 'ring-brand-200 dark:ring-brand-800/40',
    text: 'text-brand-600 dark:text-brand-400',
  },

  purple: {
    soft: 'bg-purple-50 dark:bg-purple-900/30',
    ring: 'ring-purple-100 dark:ring-purple-800/40',
    text: 'text-purple-600 dark:text-purple-400',
  },

  amber: {
    soft: 'bg-amber-50 dark:bg-amber-900/30',
    ring: 'ring-amber-100 dark:ring-amber-800/40',
    text: 'text-amber-600 dark:text-amber-400',
  },

  orange: {
    soft: 'bg-orange-50 dark:bg-orange-900/30',
    ring: 'ring-orange-100 dark:ring-orange-800/40',
    text: 'text-orange-600 dark:text-orange-400',
  },

  rose: {
    soft: 'bg-rose-50 dark:bg-rose-900/30',
    ring: 'ring-rose-100 dark:ring-rose-800/40',
    text: 'text-rose-600 dark:text-rose-400',
  },

  emerald: {
    soft: 'bg-emerald-50 dark:bg-emerald-900/30',
    ring: 'ring-emerald-100 dark:ring-emerald-800/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
}

/**
 * Premium Dashboard KPI Card
 */

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'brand',
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.brand

  return (
    <div
      className="
        bg-secondary dark:bg-neutral
        border border-tertiary dark:border-tertiary/70

        rounded-3xl
        p-5
        shadow-sm
        hover:shadow-md
        transition-all
        duration-300
        min-h-[130px]
      "
    >
      <div className="flex items-start justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-tertiary dark:text-tertiary">
            {label}
          </p>

          <h2
            className="
              text-3xl
              sm:text-4xl
              font-bold
              text-neutral dark:text-secondary

              mt-3
              tracking-tight
              tabular-nums
            "
          >
            {value ?? '—'}
          </h2>

          {sub && (
            <p className="text-sm text-tertiary dark:text-tertiary/80 mt-2">
              {sub}
            </p>
          )}
        </div>

        {/* ICON */}
        {Icon && (
          <div
            className={`
              w-14
              h-14
              rounded-2xl
              ${c.soft}
              ring-1
              ${c.ring}
              flex
              items-center
              justify-center
              shrink-0
            `}
          >
            <Icon className={`w-7 h-7 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  )
}

