'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { WalletScore } from '@/lib/types'

const SCORE_BREAKDOWN = [
  { label: 'Presale History', max: 20, key: 'presale' },
  { label: 'Hold Duration', max: 20, key: 'hold' },
  { label: 'DeFi Diversity', max: 20, key: 'defi' },
  { label: 'AI Protocol', max: 20, key: 'ai' },
  { label: 'Recency', max: 10, key: 'recency' },
  { label: 'Balance', max: 10, key: 'balance' },
]

function computeBreakdown(w: WalletScore) {
  const b: Record<string, number> = {}
  b.presale = w.presale_count >= 2 ? 20 : w.presale_count === 1 ? 10 : 0
  b.hold = w.hold_duration_days >= 30 ? 20 : w.hold_duration_days >= 7 ? 10 : 0
  const dc = w.defi_protocols.length
  b.defi = dc >= 8 ? 20 : dc >= 5 ? 15 : dc >= 3 ? 10 : 0
  const ac = w.ai_protocols.length
  b.ai = ac >= 2 ? 20 : ac === 1 ? 10 : 0
  if (w.last_active) {
    const days = (Date.now() - new Date(w.last_active).getTime()) / 86400000
    b.recency = days <= 7 ? 10 : days <= 30 ? 7 : days <= 90 ? 3 : 0
  } else { b.recency = 0 }
  b.balance = w.sol_balance >= 2 ? 10 : w.sol_balance >= 0.5 ? 5 : 0
  return b
}

export default function WalletDetailPage() {
  const params = useParams()
  const address = params.address as string
  const [wallet, setWallet] = useState<WalletScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/wallets/${address}`)
      .then(r => r.json())
      .then(data => { setWallet(data.wallet); setLoading(false) })
      .catch(() => setLoading(false))
  }, [address])

  if (loading) return <div className="text-osr-text-dim p-8">Loading...</div>
  if (!wallet) return <div className="text-red-400 p-8">Wallet not found: {address}</div>

  const breakdown = computeBreakdown(wallet)

  return (
    <div className="space-y-6">
      <div>
        <a href="/wallets" className="text-xs text-osr-text-dim hover:text-osr-green">&larr; Back to wallets</a>
        <h1 className="text-lg font-bold text-osr-green font-mono mt-2">{address}</h1>
        <div className="text-xs text-osr-text-dim mt-1">
          Scored {new Date(wallet.scored_at).toLocaleString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="text-xs text-osr-text-dim">Score</div>
          <div className={`text-3xl font-bold ${wallet.score >= 80 ? 'text-osr-green' : wallet.score >= 50 ? 'text-yellow-400' : 'text-osr-text-muted'}`}>
            {wallet.score}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-osr-text-dim">Tier</div>
          <div className={`text-3xl font-bold ${wallet.tier === 1 ? 'tier-1' : wallet.tier === 2 ? 'tier-2' : 'tier-3'}`}>
            T{wallet.tier}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-osr-text-dim">SOL Balance</div>
          <div className="text-2xl font-bold text-white">{wallet.sol_balance.toFixed(3)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-osr-text-dim">Classification</div>
          <div className="text-sm font-bold text-osr-green mt-1">{wallet.classification}</div>
          <div className="text-xs text-osr-text-dim">Confidence: {(wallet.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="card">
          <div className="text-xs text-osr-text-dim">Status</div>
          <div className="text-xs mt-1 space-y-1">
            <div>Airdrop: <span className={wallet.airdrop_sent ? 'text-osr-green' : 'text-osr-text-dim'}>{wallet.airdrop_sent ? 'SENT' : 'PENDING'}</span></div>
            <div>Dialect: <span className={wallet.dialect_sent ? 'text-osr-green' : 'text-osr-text-dim'}>{wallet.dialect_sent ? 'SENT' : 'PENDING'}</span></div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-4">Score Breakdown</h2>
        <div className="space-y-3">
          {SCORE_BREAKDOWN.map(({ label, max, key }) => {
            const points = breakdown[key] || 0
            const pct = (points / max) * 100
            return (
              <div key={key} className="flex items-center gap-4">
                <div className="w-32 text-xs text-osr-text-dim">{label}</div>
                <div className="flex-1 h-2 bg-osr-surface overflow-hidden">
                  <div
                    className="h-full bg-osr-green transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-right font-mono">
                  <span className="text-white">{points}</span>
                  <span className="text-osr-text-dim">/{max}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reasoning */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-2">AI Classification Reasoning</h2>
        <p className="text-sm text-osr-text-muted">{wallet.reasoning}</p>
      </div>

      {/* Protocol Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">DeFi Protocols ({wallet.defi_protocols.length})</h2>
          <div className="flex flex-wrap gap-2">
            {wallet.defi_protocols.map(p => (
              <span key={p} className="px-2 py-1 text-xs bg-osr-surface border border-osr-border text-osr-green">{p}</span>
            ))}
            {wallet.defi_protocols.length === 0 && <span className="text-xs text-osr-text-dim">None detected</span>}
          </div>
        </div>
        <div className="card">
          <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">AI Protocols ({wallet.ai_protocols.length})</h2>
          <div className="flex flex-wrap gap-2">
            {wallet.ai_protocols.map(p => (
              <span key={p} className="px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400">{p}</span>
            ))}
            {wallet.ai_protocols.length === 0 && <span className="text-xs text-osr-text-dim">None detected</span>}
          </div>
        </div>
      </div>

      {/* Social Match */}
      {Object.keys(wallet.social_match).length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Social Identity</h2>
          <div className="space-y-2">
            {Object.entries(wallet.social_match).map(([platform, handle]) => (
              <div key={platform} className="flex items-center gap-3 text-sm">
                <span className="text-osr-text-dim uppercase text-xs w-20">{platform}</span>
                <span className="text-osr-green">{handle}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
