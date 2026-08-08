import { useEffect, useState } from 'react';
import { checkFraudById } from '../../api/ai';

const CONFIG = {
  LOW:       { emoji: '✅', label: 'Safe',      bg: '#d1fae5', color: '#065f46' },
  MEDIUM:    { emoji: '⚠️', label: 'Caution',   bg: '#fef3c7', color: '#92400e' },
  HIGH:      { emoji: '🚨', label: 'High Risk', bg: '#fee2e2', color: '#991b1b' },
  VERY_HIGH: { emoji: '🛑', label: 'Danger',    bg: '#fca5a5', color: '#7f1d1d' },
};

export default function FraudBadge({ productId, compact = false }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (productId) {
      checkFraudById(productId).then(setData).catch(() => null);
    }
  }, [productId]);

  if (!data || data.error) return null;

  const c = CONFIG[data.risk_level] || { emoji: '❓', label: 'Unknown', bg: '#f3f4f6', color: '#374151' };

  if (compact) {
    return (
      <span className="fraud-badge-compact" style={{ background: c.bg, color: c.color }}>
        {c.emoji} {c.label} ({data.risk_score || 0}/100)
      </span>
    );
  }

  return (
    <div className="fraud-panel" style={{ background: c.bg, borderLeft: `4px solid ${c.color}` }}>
      <div className="fraud-panel-header">
        <span style={{ color: c.color, fontWeight: 700 }}>
          {c.emoji} {c.label} — Score {data.risk_score || 0}/100
        </span>
      </div>
      <p className="fraud-recommendation" style={{ color: c.color }}>{data.recommendation}</p>
    </div>
  );
}