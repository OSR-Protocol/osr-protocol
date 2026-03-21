'use client'

import { useState, useEffect, useCallback } from 'react'
import RefreshIndicator from '@/components/refresh-indicator'
import type { DraftItem } from '@/lib/types'

export default function DraftsQueuePage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [total, setTotal] = useState(0)
  const [pending, setPending] = useState(0)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [dataSource, setDataSource] = useState('')

  const fetchDrafts = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterPlatform) params.set('platform', filterPlatform)
    const res = await fetch(`/api/drafts?${params}`)
    const data = await res.json()
    setDrafts(data.drafts || [])
    setTotal(data.total || 0)
    setPending(data.pending || 0)
    setDataSource(data.source)
  }, [filterStatus, filterPlatform])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
    // Mark as copied
    await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'copied' }),
    })
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'copied' } : d))
  }

  const dismissDraft = async (id: string) => {
    await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'dismissed' }),
    })
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'dismissed' } : d))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Drafts Queue</h1>
          <p className="text-osr-text-dim text-xs mt-1">
            {pending} pending review {dataSource === 'mock' && <span className="text-yellow-400">[MOCK]</span>}
          </p>
        </div>
        <RefreshIndicator onRefresh={fetchDrafts} />
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Status:</span>
          {['', 'pending', 'copied', 'dismissed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 text-xs ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Platform:</span>
          {['', 'TELEGRAM', 'X', 'LINKEDIN', 'REDDIT', 'YOUTUBE'].map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)}
              className={`px-2 py-1 text-xs ${filterPlatform === p ? 'btn-primary' : 'btn-ghost'}`}>
              {p || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {drafts.map((draft) => (
          <div key={draft.id} className={`card ${draft.status === 'dismissed' ? 'opacity-40' : ''}`}>
            {/* Source */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-osr-text-dim uppercase">{draft.platform}</span>
                <span className="text-xs text-osr-text-dim mx-2">|</span>
                <span className="text-xs text-osr-text-muted">{draft.source_author}</span>
                {draft.score > 0 && (
                  <>
                    <span className="text-xs text-osr-text-dim mx-2">|</span>
                    <span className={`text-xs font-bold ${draft.score >= 80 ? 'text-osr-green' : 'text-yellow-400'}`}>
                      Score: {draft.score}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-osr-text-dim">
                {new Date(draft.created_at).toLocaleString()}
              </span>
            </div>

            {/* Source Post */}
            <div className="bg-osr-surface border border-osr-border p-3 mb-3 text-sm text-osr-text-muted">
              {draft.source_post}
            </div>

            {/* Draft Reply */}
            <div className="bg-osr-green/5 border border-osr-green/20 p-3 mb-3">
              <div className="text-xs text-osr-green uppercase tracking-wider mb-2">Draft Reply</div>
              <div className="text-sm text-white whitespace-pre-wrap">{draft.draft_reply}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(draft.draft_reply, draft.id)}
                className={`text-xs px-3 py-1.5 ${copiedId === draft.id ? 'bg-osr-green text-black' : 'btn-primary'}`}
              >
                {copiedId === draft.id ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              {draft.source_url && (
                <a href={draft.source_url} target="_blank" rel="noopener" className="btn-ghost text-xs px-3 py-1.5">
                  Open Source
                </a>
              )}
              {draft.status === 'pending' && (
                <button onClick={() => dismissDraft(draft.id)} className="btn-ghost text-xs px-3 py-1.5 text-red-400 border-red-400/30 hover:border-red-400/60">
                  Dismiss
                </button>
              )}
              {draft.status !== 'pending' && (
                <span className="text-xs text-osr-text-dim uppercase">[{draft.status}]</span>
              )}
            </div>
          </div>
        ))}
        {drafts.length === 0 && (
          <div className="text-center py-12 text-osr-text-dim">
            {filterStatus === 'pending' ? 'No pending drafts — all caught up' : 'No drafts match filters'}
          </div>
        )}
      </div>
    </div>
  )
}
