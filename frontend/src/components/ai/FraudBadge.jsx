import { ShieldCheck, ShieldAlert, ShieldX, Shield, HelpCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * The one fraud badge.
 *
 * There used to be two: this one, plus components/admin/FraudBadge.jsx, which
 * nothing imported and which used different thresholds (>70 / >30) than the ML
 * service's bands. The admin table also inlined a third copy of the config. All
 * of it now comes from here, keyed by the risk level the backend sends rather
 * than by a score the UI re-buckets itself.
 *
 * Colours use the design tokens so the badge works in both themes; it previously
 * hardcoded light-mode hex values.
 */
const LEVELS = {
  LOW: {
    icon: ShieldCheck,
    label: 'Safe',
    className: 'border-success/25 bg-success/10 text-success',
  },
  MEDIUM: {
    icon: Shield,
    label: 'Caution',
    className: 'border-warning/30 bg-warning/10 text-warning',
  },
  HIGH: {
    icon: ShieldAlert,
    label: 'High Risk',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  VERY_HIGH: {
    icon: ShieldX,
    label: 'Danger',
    className: 'border-destructive/50 bg-destructive/20 text-destructive',
  },
}

const UNKNOWN = {
  icon: HelpCircle,
  label: 'Not analyzed',
  className: 'border-border bg-muted text-muted-foreground',
}

export function riskConfig(riskLevel) {
  return LEVELS[riskLevel] || UNKNOWN
}

export default function FraudBadge({ data, compact = false, showPending = false, className }) {
  // `data` is the cached verdict that arrives with the product. A missing verdict
  // means "not analyzed yet" — never a reason to issue another ML request from
  // the browser.
  if (!data?.risk_level) {
    if (!showPending) return null
    const { icon: Icon } = UNKNOWN
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          UNKNOWN.className,
          className
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {UNKNOWN.label}
      </span>
    )
  }

  const config = riskConfig(data.risk_level)
  const Icon = config.icon
  const score = data.risk_score ?? 0

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
          config.className,
          className
        )}
        title={data.recommendation || 'AI safety analysis'}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {config.label}
        <span className="tabular-nums font-medium opacity-80">{score}/100</span>
      </span>
    )
  }

  return (
    <div className={cn('rounded-xl border p-4', config.className, className)}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 shrink-0" />
        {config.label}
        <span className="tabular-nums font-medium opacity-80">— score {score}/100</span>
      </div>

      {data.recommendation && (
        <p className="mt-1.5 text-sm opacity-90">{data.recommendation}</p>
      )}

      {data.flags?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {data.flags.map((flag, index) => (
            <li key={`${flag.type || 'flag'}-${index}`} className="text-xs opacity-90">
              • {flag.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
