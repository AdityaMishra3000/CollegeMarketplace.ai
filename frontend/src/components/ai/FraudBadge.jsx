const CONFIG = {
  LOW: {
    emoji: '✅',
    label: 'Safe',
    bg: '#d1fae5',
    color: '#065f46',
  },
  MEDIUM: {
    emoji: '⚠️',
    label: 'Caution',
    bg: '#fef3c7',
    color: '#92400e',
  },
  HIGH: {
    emoji: '🚨',
    label: 'High Risk',
    bg: '#fee2e2',
    color: '#991b1b',
  },
  VERY_HIGH: {
    emoji: '🛑',
    label: 'Danger',
    bg: '#fca5a5',
    color: '#7f1d1d',
  },
}

export default function FraudBadge({ data, compact = false }) {
  // No data means the product hasn't been analyzed yet.
  // Do NOT make another ML request here.
  if (!data || !data.risk_level) {
    return null
  }

  const config =
    CONFIG[data.risk_level] || {
      emoji: '❓',
      label: 'Unknown',
      bg: '#f3f4f6',
      color: '#374151',
    }

  if (compact) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{
          backgroundColor: config.bg,
          color: config.color,
        }}
        title={data.recommendation || 'AI safety analysis'}
      >
        {config.emoji} {config.label} ({data.risk_score ?? 0}/100)
      </span>
    )
  }

  return (
    <div
      className="fraud-panel"
      style={{
        background: config.bg,
        borderLeft: `4px solid ${config.color}`,
      }}
    >
      <div className="fraud-panel-header">
        <span
          style={{
            color: config.color,
            fontWeight: 700,
          }}
        >
          {config.emoji} {config.label} — Score {data.risk_score ?? 0}/100
        </span>
      </div>

      {data.recommendation && (
        <p
          className="fraud-recommendation"
          style={{ color: config.color }}
        >
          {data.recommendation}
        </p>
      )}

      {data.flags?.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.flags.map((flag, index) => (
            <p
              key={`${flag.type || 'flag'}-${index}`}
              className="text-xs"
              style={{ color: config.color }}
            >
              • {flag.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}