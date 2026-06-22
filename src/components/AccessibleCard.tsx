import React from 'react'

interface AccessibleCardProps {
  title: string
  subtitle?: string
  onClick: () => void
  active?: boolean
  keyboardShortcut?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  title,
  subtitle,
  onClick,
  active = false,
  keyboardShortcut,
  ariaLabel,
  className = '',
  disabled = false
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={active}
      aria-label={ariaLabel || `${title}${subtitle ? `. ${subtitle}` : ''}${keyboardShortcut ? `. Shortcut key ${keyboardShortcut}` : ''}`}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick()
      }}
      onKeyDown={handleKeyDown}
      className={`relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl border-4 text-left transition-all duration-300 select-none cursor-pointer min-h-[140px] focus-visible:outline-none ${
        disabled 
          ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500'
          : active
          ? 'border-sky-500 bg-slate-900 text-white shadow-lg shadow-sky-500/10'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
      } ${className}`}
    >
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold tracking-wide">{title}</h3>
        {subtitle && <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed">{subtitle}</p>}
      </div>

      {keyboardShortcut && !disabled && (
        <span 
          className={`self-end mt-4 px-3 py-1 text-xs font-bold rounded-md border tracking-wider ${
            active 
              ? 'bg-sky-500/10 border-sky-400/30 text-sky-400' 
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
          aria-hidden="true"
        >
          KEY {keyboardShortcut}
        </span>
      )}
    </div>
  )
}
export default AccessibleCard
