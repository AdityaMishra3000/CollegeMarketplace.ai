import { ShieldCheck, Clock, Loader2, XCircle, AlertTriangle, Video } from 'lucide-react'
import { cn } from '../../lib/utils'

const STATUS_CONFIG = {
  verified: {
    icon: ShieldCheck,
    label: 'Video Verified',
    shortLabel: 'Verified',
    badgeClass: 'border-success/35 bg-success/10 text-success',
    dotClass: 'bg-success',
  },
  review_required: {
    icon: Clock,
    label: 'Under Peer Review',
    shortLabel: 'Under Review',
    badgeClass: 'border-warning/35 bg-warning/10 text-warning',
    dotClass: 'bg-warning',
  },
  pending: {
    icon: Loader2,
    label: 'Verifying Video...',
    shortLabel: 'Verifying',
    badgeClass: 'border-info/35 bg-info/10 text-info',
    dotClass: 'bg-info',
  },
  rejected: {
    icon: XCircle,
    label: 'Verification Declined',
    shortLabel: 'Declined',
    badgeClass: 'border-destructive/35 bg-destructive/10 text-destructive',
    dotClass: 'bg-destructive',
  },
  failed: {
    icon: AlertTriangle,
    label: 'Verification Failed',
    shortLabel: 'Failed',
    badgeClass: 'border-border bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
  not_submitted: {
    icon: Video,
    label: 'Unverified Listing',
    shortLabel: 'Unverified',
    badgeClass: 'border-border/60 bg-muted/50 text-muted-foreground',
    dotClass: 'bg-border',
  },
}

export function getVerificationConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted
}

export default function VerificationBadge({
  status,
  data,
  compact = false,
  showUnverified = false,
  className,
}) {
  const currentStatus = status || data?.status || 'not_submitted'
  if (!showUnverified && (currentStatus === 'not_submitted' || !currentStatus)) {
    return null
  }

  const config = getVerificationConfig(currentStatus)
  const Icon = config.icon
  const explanation = data?.details?.explanation || (currentStatus === 'verified' ? 'Automated camera verification passed.' : null)
  const duration = data?.duration_seconds

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums tracking-wide transition-colors',
          config.badgeClass,
          className
        )}
        title={explanation || config.label}
      >
        <Icon className={cn('h-3 w-3', currentStatus === 'pending' && 'animate-spin')} aria-hidden="true" />
        <span>{config.shortLabel}</span>
      </span>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        config.badgeClass,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', currentStatus === 'pending' && 'animate-spin')} aria-hidden="true" />
          <span className="font-semibold text-sm">{config.label}</span>
        </div>
        {duration ? (
          <span className="rounded bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground/80">
            {duration.toFixed(1)}s video
          </span>
        ) : null}
      </div>

      {explanation && (
        <p className="mt-2 text-xs leading-relaxed opacity-90">
          {explanation}
        </p>
      )}

      {data?.submitted_at && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-current/15 pt-2 text-[10px] uppercase tracking-wider opacity-75">
          <span>Submitted via Mobile App</span>
        </div>
      )}
    </div>
  )
}
