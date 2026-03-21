interface StatCardProps {
  label: string
  value: string | number
  detail?: string
  color?: 'green' | 'yellow' | 'red' | 'white'
}

const COLOR_MAP = {
  green: 'text-osr-green',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  white: 'text-white',
}

export default function StatCard({ label, value, detail, color = 'green' }: StatCardProps) {
  return (
    <div className="card">
      <div className="text-osr-text-dim text-xs uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${COLOR_MAP[color]}`}>{value}</div>
      {detail && <div className="text-osr-text-dim text-xs mt-1">{detail}</div>}
    </div>
  )
}
