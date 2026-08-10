import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react'

export default function FraudBadge({ score }) {
  // Assuming score is 0-100 where higher is higher risk
  if (score == null) return null

  if (score > 70) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-500 border border-red-500/20">
        <ShieldAlert className="h-3 w-3" />
        High Risk ({score})
      </div>
    )
  }
  if (score > 30) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-500 border border-yellow-500/20">
        <Shield className="h-3 w-3" />
        Review ({score})
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500 border border-green-500/20">
      <ShieldCheck className="h-3 w-3" />
        Safe ({score})
    </div>
  )
}