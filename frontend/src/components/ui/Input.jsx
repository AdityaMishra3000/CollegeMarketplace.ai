import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-lg border border-input bg-background text-sm text-foreground shadow-sm transition-[color,background-color,border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:focus-visible:ring-destructive/30'

export const Input = forwardRef(function Input(
  { className, icon: Icon, ...props },
  ref
) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        ref={ref}
        className={cn(fieldBase, 'h-10 px-3', Icon && 'pl-9', className)}
        {...props}
      />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'min-h-24 resize-none px-3 py-2.5 leading-relaxed', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          fieldBase,
          'h-10 cursor-pointer appearance-none px-3 pr-9',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
})

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-[13px] font-medium text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}

export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
