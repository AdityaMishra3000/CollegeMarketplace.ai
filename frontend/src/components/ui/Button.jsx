import React from "react";
import { cn } from "../../lib/utils";

/**
 * Minimal Slot: lets <Button asChild> render its single child element
 * (e.g. a react-router <Link>) while merging the button's classes and props.
 * Avoids invalid <button><a/></button> nesting.
 */
const Slot = React.forwardRef(function Slot({ children, className, ...props }, ref) {
  if (!React.isValidElement(children)) return null;
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    ref,
    className: cn(className, children.props.className),
  });
});

/**
 * THE button. 29 hand-rolled `<button className="...">` elements across 12 files
 * are replaced by this, so focus rings, disabled states, loading states and
 * press feedback are identical everywhere.
 *
 * Press feedback is CSS rather than Framer Motion on purpose: it then behaves
 * identically when `asChild` renders a <Link>, costs no JS per button, and is
 * already covered by the global prefers-reduced-motion rule.
 *
 * `primary` puts warm near-black ink on #FF8000. White on that orange is 2.52:1
 * and fails WCAG AA — see the token notes in index.css.
 */
const baseStyles = [
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
  "rounded-lg font-medium tracking-tight",
  // A border on every variant so geometry is identical whether or not the
  // variant draws one.
  "border border-transparent",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.25,1,0.5,1)]",
  // Tactile: lift on hover, compress on press.
  "hover:-translate-y-px active:translate-y-0 active:scale-[0.985]",
  "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none disabled:translate-y-0",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

const variants = {
  /* Brand action. Ink on orange, plus a darker orange edge: the #FF8000 fill is
     only 2.52:1 against white, so the border is what gives the control a
     boundary that meets WCAG 1.4.11 (3.46:1). */
  primary:
    "border-primary-active bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/25 active:bg-primary-active",
  /** High-contrast neutral action — pairs with primary without competing. */
  ink: "bg-foreground text-background hover:bg-foreground/90 shadow-sm",
  secondary:
    "border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-muted",
  outline:
    "border-input bg-transparent text-foreground hover:border-border-strong hover:bg-muted",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90",
  /** Text-only. Uses the darker accessible orange, not the fill colour. */
  link: "bg-transparent px-0 text-primary-ink underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary hover:translate-y-0",
};

/* Taller on touch screens (44px minimum), tighter on pointer devices.
   Only integer spacing steps: Tailwind v4 does not generate `h-8.5`. */
const sizes = {
  sm: "h-10 px-3 text-[13px] sm:h-9",
  default: "h-11 px-4 text-sm sm:h-10",
  lg: "h-12 px-6 text-[15px] sm:h-11",
  xl: "h-14 px-8 text-base sm:h-13",
  icon: "h-11 w-11 sm:h-10 sm:w-10",
  "icon-sm": "h-9 w-9",
};

export const Button = React.forwardRef(function Button(
  {
    className,
    variant = "primary",
    size = "default",
    asChild = false,
    loading = false,
    disabled,
    children,
    ...props
  },
  ref
) {
  const classes = cn(baseStyles, variants[variant] ?? variants.primary, sizes[size] ?? sizes.default, className);

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} data-loading={loading || undefined} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";
