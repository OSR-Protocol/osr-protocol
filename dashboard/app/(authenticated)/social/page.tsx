'use client'

import { useState, useEffect, useCallback } from 'react'
import RefreshIndicator from '@/components/refresh-indicator'
import type { SocialFeedItem } from '@/lib/types'

const PLATFORM_ICONS: Record<string, string> = {
  TELEGRAM: '🔵', X: '🐦', REDDIT: '🔴', YOUTUBE: '▶️', LINKEDIN: '💼', ONCHAIN: '⛓️',
}

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low',
}

export default function SocialFeedPage() {
  const [items, setItems] = useState<SocialFeedItem[]>([])
  const [total, setTotal] = useState(0)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dataSource, setDataSource] = useState('')

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterPlatform) params.set('platform', filterPlatform)
    if (filterPriority) params.set('priority', filterPriority)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/social?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setDataSource(data.source)
  }, [filterPlatform, filterPriority, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const markItem = async (id: string, status: 'actioned' | 'dismissed') => {
    await fetch('/api/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const timeAgo = (iso: string) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Social Feed</h1>
          <p className="text-osr-text-dim text-xs mt-1">
            {total} posts {dataSource === 'mock' && <span className="text-yellow-400">[MOCK]</span>}
          </p>
        </div>
        <RefreshIndicator onRefresh={fetchData} />
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Platform:</span>
          {['', 'X', 'TELEGRAM', 'REDDIT', 'YOUTUBE', 'LINKEDIN'].map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)}
              className={`px-2 py-1 text-xs ${filterPlatform === p ? 'btn-primary' : 'btn-ghost'}`}>
              {p ? `${PLATFORM_ICONS[p] || ''} ${p}` : 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Priority:</span>
          {['', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-2 py-1 text-xs ${filterPriority === p ? 'btn-primary' : 'btn-ghost'}`}>
              {p || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Status:</span>
          {['', 'pending', 'actioned', 'dismissed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 text-xs ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className={`card-hover ${item.status !== 'pending' ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{PLATFORM_ICONS[item.platform] || '•'}</span>
                  <span className="text-xs text-osr-text-muted uppercase">{item.platform}</span>
                  <span className={`font-bold text-sm ${item.score >= 80 ? 'text-osr-green' : item.score >= 60 ? 'text-yellow-400' : 'text-osr-text-muted'}`}>
                    {item.score}
                  </span>
                  <span className={PRIORITY_BADGE[item.priority]}>{item.priority}</span>
                  <span className="text-xs text-osr-text-dim">{timeAgo(item.created_at)} ago</span>
                  {item.status !== 'pending' && (
                    <span className="text-xs text-osr-text-dim uppercase">[{item.status}]</span>
                  )}
                </div>

                <div className="text-sm text-white mb-1">{item.original_message}</div>
                <div className="text-xs text-osr-text-dim mb-2">{item.source} — {item.source_detail}</div>

                {item.keywords.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {item.keywords.map(kw => (
                      <span key={kw} className="px-1.5 py-0.5 text-xs bg-osr-green/10 text-osr-green border border-osr-green/20">{kw}</span>
                    ))}
                  </div>
                )}

                {item.suggested_reply && (
                  <div className="bg-osr-surface border border-osr-border p-2 text-xs text-osr-text-muted mt-2">
                    <span className="text-osr-text-dim uppercase text-xs">Draft: </span>
                    {item.suggested_reply}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener" className="btn-ghost text-xs px-2 py-1 text-center">Open</a>
                )}
                {item.status === 'pending' && (
                  <>
                    <button onClick={() => markItem(item.id, 'actioned')} className="btn-primary text-xs px-2 py-1">Done</button>
                    <button onClick={() => markItem(item.id, 'dismissed')} className="btn-ghost text-xs px-2 py-1">Skip</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-osr-text-dim">No posts match filters</div>
        )}
      </div>
    </div>
  )
}
