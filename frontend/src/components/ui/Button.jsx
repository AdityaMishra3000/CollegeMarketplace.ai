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

const baseStyles =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border/60",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted hover:border-border-strong",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/25 hover:bg-destructive/90",
  link: "bg-transparent text-primary underline-offset-4 hover:underline",
};

const sizes = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-[13px]",
  lg: "h-11 px-6 text-[15px]",
  icon: "h-10 w-10",
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
  const classes = cn(baseStyles, variants[variant], sizes[size], className);

  // asChild renders the child element (e.g. a <Link>) with merged styling.
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
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
