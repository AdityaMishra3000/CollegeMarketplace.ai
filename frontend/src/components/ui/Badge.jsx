import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-secondary text-secondary-foreground border-border/70',
  secondary: 'bg-muted text-muted-foreground border-border/70',
  primary: 'bg-primary/12 text-primary border-primary/20',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/15 text-warning border-warning/30',
  destructive: 'bg-destructive/12 text-destructive border-destructive/25',
  info: 'bg-info/12 text-info border-info/25',
  outline: 'bg-transparent text-muted-foreground border-border',
}

export default function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 [&_svg]:size-3 [&_svg]:shrink-0',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
