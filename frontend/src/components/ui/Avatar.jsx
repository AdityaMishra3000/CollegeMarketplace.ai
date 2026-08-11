import { initials as toInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
}

export default function Avatar({ name = '', size = 'md', className }) {
  // Support both keyed sizes ('sm'|'md'|'lg'|'xl') and raw pixel numbers.
  const isNumeric = typeof size === 'number'
  const numericStyle = isNumeric
    ? { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }
    : undefined

  return (
    <div
      style={numericStyle}
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full bg-primary/12 font-semibold uppercase text-primary ring-1 ring-inset ring-primary/20',
        !isNumeric && (sizeMap[size] || sizeMap.md),
        className
      )}
      aria-hidden="true"
    >
      {toInitials(name) || '?'}
    </div>
  )
}
