'use client'

export default function Tooltip({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`relative group/tip inline-flex min-w-0 ${className ?? ''}`}>
      {children}
      <span
        className="
          pointer-events-none absolute bottom-full left-0 z-50 mb-1.5
          max-w-[280px] rounded-md bg-gray-900 dark:bg-gray-700
          px-2.5 py-1.5 text-xs text-white shadow-lg
          whitespace-normal break-words
          opacity-0 scale-95
          group-hover/tip:opacity-100 group-hover/tip:scale-100
          transition-all duration-100 ease-out
        "
      >
        {label}
        <span className="absolute top-full left-3 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </span>
    </span>
  )
}
