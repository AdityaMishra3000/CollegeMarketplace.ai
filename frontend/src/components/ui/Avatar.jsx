import { initials as toInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
}

export default function Avatar({ name = '', size = 'md', className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ring-1 ring-inset ring-primary/20',
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      {toInitials(name) || '?'}
    </div>
  )
}
