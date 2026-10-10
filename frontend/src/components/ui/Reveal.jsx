import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMotion } from '@/lib/motion'

/**
 * Scroll reveal. One wrapper, used for every section and grid entrance in the
 * app, so entrances share a cadence instead of each page inventing one.
 *
 * Fires once and never loops. Collapses to a plain opacity change under
 * prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  as = 'div',
  ...props
}) {
  const m = useMotion()
  const variants = variant === 'scale' ? m.revealScale : variant === 'fade' ? m.fadeIn : m.revealUp
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={m.viewportOnce}
      transition={delay ? { ...m.transitions.slow, delay } : undefined}
      {...props}
    >
      {children}
    </Component>
  )
}

/**
 * Staggered container. Children must be <RevealItem> (or carry the same
 * variant names) — the parent drives the timing, the children the movement.
 */
export function RevealGroup({
  children,
  className,
  staggerChildren = 0.06,
  delayChildren = 0,
  as = 'div',
  ...props
}) {
  const m = useMotion()
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      variants={m.stagger(staggerChildren, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={m.viewportOnce}
      {...props}
    >
      {children}
    </Component>
  )
}

export function RevealItem({ children, className, variant = 'up', as = 'div', ...props }) {
  const m = useMotion()
  const variants = variant === 'scale' ? m.revealScale : variant === 'fade' ? m.fadeIn : m.revealUp
  const Component = motion[as] || motion.div

  return (
    <Component className={cn(className)} variants={variants} {...props}>
      {children}
    </Component>
  )
}
