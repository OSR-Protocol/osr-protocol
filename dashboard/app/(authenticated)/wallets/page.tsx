'use client'

import { useState, useEffect, useCallback } from 'react'
import RefreshIndicator from '@/components/refresh-indicator'
import type { WalletScore } from '@/lib/types'

type SortField = 'score' | 'sol_balance' | 'tier' | 'last_active' | 'presale_count'
type SortDir = 'asc' | 'desc'

const TIER_CLASS: Record<number, string> = { 1: 'tier-1', 2: 'tier-2', 3: 'tier-3' }
const CLASS_COLORS: Record<string, string> = {
  high_conviction: 'text-osr-green',
  ai_native: 'text-blue-400',
  defi_power_user: 'text-yellow-400',
  casual: 'text-osr-text-dim',
  bot: 'text-red-400',
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletScore[]>([])
  const [total, setTotal] = useState(0)
  const [filterTier, setFilterTier] = useState<string>('')
  const [minScore, setMinScore] = useState(0)
  const [maxScore, setMaxScore] = useState(100)
  const [sortBy, setSortBy] = useState<SortField>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [dataSource, setDataSource] = useState('')

  const fetchWallets = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterTier) params.set('tier', filterTier)
    params.set('minScore', String(minScore))
    params.set('maxScore', String(maxScore))
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
    const res = await fetch(`/api/wallets?${params}`)
    const data = await res.json()
    setWallets(data.wallets || [])
    setTotal(data.total || 0)
    setDataSource(data.source)
  }, [filterTier, minScore, maxScore, sortBy, sortDir])

  useEffect(() => { fetchWallets() }, [fetchWallets])

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return ''
    return sortDir === 'desc' ? ' ▼' : ' ▲'
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const exportCSV = () => {
    const headers = ['address', 'score', 'tier', 'classification', 'sol_balance', 'defi_protocols', 'ai_protocols', 'social_match', 'last_active']
    const rows = wallets.map(w => [
      w.wallet_address, w.score, w.tier, w.classification, w.sol_balance,
      w.defi_protocols.join(';'), w.ai_protocols.join(';'),
      Object.entries(w.social_match).map(([k, v]) => `${k}:${v}`).join(';'),
      w.last_active,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `osr_wallets_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Wallet Discovery</h1>
          <p className="text-osr-text-dim text-xs mt-1">
            {total} wallets {dataSource === 'mock' && <span className="text-yellow-400">[MOCK]</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshIndicator onRefresh={fetchWallets} />
          <button onClick={exportCSV} className="btn-ghost text-xs">Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Tier:</span>
          {['', '1', '2', '3'].map(t => (
            <button key={t} onClick={() => setFilterTier(t)}
              className={`px-2 py-1 text-xs ${filterTier === t ? 'btn-primary' : 'btn-ghost'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Score:</span>
          <input type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))}
            className="input-field w-16 text-xs" min={0} max={100} />
          <span className="text-osr-text-dim">–</span>
          <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))}
            className="input-field w-16 text-xs" min={0} max={100} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-osr-border text-osr-text-dim uppercase tracking-wider">
              <th className="text-left py-3 px-2">Address</th>
              <th className="text-right py-3 px-2 cursor-pointer hover:text-osr-green" onClick={() => toggleSort('sol_balance')}>
                SOL{sortIndicator('sol_balance')}
              </th>
              <th className="text-right py-3 px-2 cursor-pointer hover:text-osr-green" onClick={() => toggleSort('score')}>
                Score{sortIndicator('score')}
              </th>
              <th className="text-center py-3 px-2 cursor-pointer hover:text-osr-green" onClick={() => toggleSort('tier')}>
                Tier{sortIndicator('tier')}
              </th>
              <th className="text-left py-3 px-2">Classification</th>
              <th className="text-left py-3 px-2">Protocols</th>
              <th className="text-left py-3 px-2">SNS</th>
              <th className="text-left py-3 px-2 cursor-pointer hover:text-osr-green" onClick={() => toggleSort('last_active')}>
                Last Active{sortIndicator('last_active')}
              </th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.wallet_address}
                className="border-b border-osr-border/50 hover:bg-osr-card-hover cursor-pointer transition-colors"
                onClick={() => window.location.href = `/wallets/${w.wallet_address}`}>
                <td className="py-2.5 px-2 font-mono text-osr-green">{shortAddr(w.wallet_address)}</td>
                <td className="py-2.5 px-2 text-right text-white">{w.sol_balance.toFixed(3)}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className={`font-bold ${w.score >= 80 ? 'text-osr-green' : w.score >= 50 ? 'text-yellow-400' : 'text-osr-text-muted'}`}>
                    {w.score}
                  </span>
                </td>
                <td className={`py-2.5 px-2 text-center ${TIER_CLASS[w.tier] || ''}`}>T{w.tier}</td>
                <td className={`py-2.5 px-2 ${CLASS_COLORS[w.classification] || 'text-osr-text-dim'}`}>
                  {w.classification}
                </td>
                <td className="py-2.5 px-2 text-osr-text-dim">
                  {[...w.defi_protocols, ...w.ai_protocols].slice(0, 3).join(', ')}
                  {(w.defi_protocols.length + w.ai_protocols.length) > 3 && ` +${w.defi_protocols.length + w.ai_protocols.length - 3}`}
                </td>
                <td className="py-2.5 px-2 text-osr-green">
                  {w.social_match?.sns || w.social_match?.backpack || '—'}
                </td>
                <td className="py-2.5 px-2 text-osr-text-dim">
                  {w.last_active ? new Date(w.last_active).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {wallets.length === 0 && (
          <div className="text-center py-8 text-osr-text-dim">No wallets match filters</div>
        )}
      </div>
    </div>
  )
}
