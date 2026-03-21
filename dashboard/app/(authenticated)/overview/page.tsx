'use client'

import { useState, useEffect, useCallback } from 'react'
import StatCard from '@/components/stat-card'
import RefreshIndicator from '@/components/refresh-indicator'
import type { AgentStatus, OverviewStats } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-osr-green',
  stopped: 'bg-yellow-400',
  error: 'bg-red-400',
}

const STATUS_TEXT: Record<string, string> = {
  running: 'text-osr-green',
  stopped: 'text-yellow-400',
  error: 'text-red-400',
}

export default function OverviewPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [walletStats, setWalletStats] = useState({ total: 0, tier1: 0, tier2: 0, tier3: 0 })
  const [socialTotal, setSocialTotal] = useState(0)
  const [draftsPending, setDraftsPending] = useState(0)
  const [dataSource, setDataSource] = useState('')

  const fetchData = useCallback(async () => {
    const [agentRes, walletRes, socialRes, draftRes] = await Promise.all([
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/wallets').then(r => r.json()),
      fetch('/api/social').then(r => r.json()),
      fetch('/api/drafts').then(r => r.json()),
    ])

    setAgents(agentRes.agents || [])
    setDataSource(agentRes.source)

    const wallets = walletRes.wallets || []
    setWalletStats({
      total: wallets.length,
      tier1: wallets.filter((w: any) => w.tier === 1).length,
      tier2: wallets.filter((w: any) => w.tier === 2).length,
      tier3: wallets.filter((w: any) => w.tier === 3).length,
    })

    setSocialTotal(socialRes.total || 0)
    setDraftsPending(draftRes.pending || 0)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const timeAgo = (iso: string) => {
    if (!iso) return 'Never'
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-osr-text-dim text-xs mt-1">
            Agent Command Center {dataSource === 'mock' && <span className="text-yellow-400 ml-2">[MOCK DATA]</span>}
          </p>
        </div>
        <RefreshIndicator onRefresh={fetchData} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Wallets Discovered" value={walletStats.total} detail={`T1: ${walletStats.tier1} | T2: ${walletStats.tier2} | T3: ${walletStats.tier3}`} />
        <StatCard label="Social Posts Found" value={socialTotal} />
        <StatCard label="Drafts Pending" value={draftsPending} color={draftsPending > 0 ? 'yellow' : 'green'} />
        <StatCard label="Active Agents" value={agents.filter(a => a.status === 'running').length} detail={`of ${agents.length} total`} />
      </div>

      {/* Agent Status */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-4">Agent Status</h2>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center justify-between py-2 border-b border-osr-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]}`} />
                <div>
                  <div className="text-sm text-white">{agent.name}</div>
                  {agent.error_message && (
                    <div className="text-xs text-red-400 mt-0.5">{agent.error_message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="text-osr-text-dim">
                  Items: <span className="text-white">{agent.items_found}</span>
                </div>
                <div className="text-osr-text-dim">
                  Last scan: <span className={STATUS_TEXT[agent.status]}>{timeAgo(agent.last_scan)}</span>
                </div>
                <div className={`uppercase font-bold text-xs ${STATUS_TEXT[agent.status]}`}>
                  {agent.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <a href="/wallets" className="card-hover text-center py-6">
          <div className="text-2xl mb-2">◈</div>
          <div className="text-sm text-osr-green">Wallet Discovery</div>
          <div className="text-xs text-osr-text-dim mt-1">{walletStats.total} wallets scored</div>
        </a>
        <a href="/social" className="card-hover text-center py-6">
          <div className="text-2xl mb-2">◇</div>
          <div className="text-sm text-osr-green">Social Feed</div>
          <div className="text-xs text-osr-text-dim mt-1">{socialTotal} posts tracked</div>
        </a>
        <a href="/drafts" className="card-hover text-center py-6">
          <div className="text-2xl mb-2">◆</div>
          <div className="text-sm text-osr-green">Drafts Queue</div>
          <div className="text-xs text-osr-text-dim mt-1">{draftsPending} pending review</div>
        </a>
      </div>
    </div>
  )
}
