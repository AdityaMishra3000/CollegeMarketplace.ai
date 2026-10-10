import { cloneElement, forwardRef, isValidElement, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Form controls.
 *
 * The border is `--input`, which is deliberately darker than `--border`: it is
 * the boundary that identifies a control, so it carries the 3:1 non-text
 * contrast WCAG asks for. Dividers elsewhere stay airy.
 *
 * Fields are 44px tall on touch screens and 40px on pointer devices.
 */
const fieldBase = [
  'w-full rounded-lg border border-input bg-card text-sm text-foreground',
  'transition-[color,background-color,border-color,box-shadow] duration-150',
  'placeholder:text-muted-foreground/65',
  'hover:border-border-strong',
  'focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30',
].join(' ')

export const Input = forwardRef(function Input({ className, icon: Icon, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <input
        ref={ref}
        className={cn(fieldBase, 'h-11 px-3.5 sm:h-10', Icon && 'pl-10', className)}
        {...props}
      />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'min-h-28 resize-y px-3.5 py-3 leading-relaxed', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          fieldBase,
          'h-11 cursor-pointer appearance-none px-3.5 pr-10 sm:h-10',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
})

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'mb-2 block text-[0.8125rem] font-medium leading-none text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}

/**
 * Label + control + hint/error.
 *
 * Wires `aria-describedby` and `aria-invalid` onto the control by cloning it, so
 * a screen reader hears the hint and the error state without every page
 * remembering to pass the attributes.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }) {
  const generated = useId()
  const id = htmlFor || generated
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-1 text-primary-ink" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}

      {isValidElement(children)
        ? cloneElement(children, {
            id: children.props.id || id,
            'aria-describedby': describedBy || children.props['aria-describedby'],
            'aria-invalid': error ? true : children.props['aria-invalid'],
          })
        : children}

      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
