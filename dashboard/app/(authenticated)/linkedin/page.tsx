'use client'

import { useState, useEffect } from 'react'
import type { LinkedInTarget } from '@/lib/types'
import { MOCK_LINKEDIN_TARGETS } from '@/lib/mock-data'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  connected: 'bg-osr-green/20 text-osr-green border-osr-green/30',
  skipped: 'bg-osr-text-dim/20 text-osr-text-dim border-osr-text-dim/30',
}

const CATEGORIES = ['All', 'Dubai VCs', 'Exchanges', 'Ecosystem', 'Builders']

export default function LinkedInPage() {
  const [targets, setTargets] = useState<LinkedInTarget[]>(MOCK_LINKEDIN_TARGETS)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('')

  let filtered = targets
  if (filterCategory !== 'All') filtered = filtered.filter(t => t.category === filterCategory)
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus)

  const updateStatus = (id: string, status: 'pending' | 'connected' | 'skipped') => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const copyMessage = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">LinkedIn Briefing</h1>
        <p className="text-osr-text-dim text-xs mt-1">
          {targets.filter(t => t.status === 'pending').length} pending |
          {' '}{targets.filter(t => t.status === 'connected').length} connected |
          {' '}{targets.filter(t => t.status === 'skipped').length} skipped
        </p>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Category:</span>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCategory(c)}
              className={`px-2 py-1 text-xs ${filterCategory === c ? 'btn-primary' : 'btn-ghost'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-osr-text-dim">Status:</span>
          {['', 'pending', 'connected', 'skipped'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 text-xs ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Target Cards */}
      <div className="space-y-4">
        {filtered.map((target) => (
          <div key={target.id} className={`card ${target.status === 'skipped' ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-white font-bold">{target.name}</div>
                <div className="text-sm text-osr-text-muted">{target.title} at <span className="text-osr-green">{target.company}</span></div>
                <div className="text-xs text-osr-text-dim mt-1">{target.category} — {target.week}</div>
              </div>
              <span className={`px-2 py-0.5 text-xs font-bold border ${STATUS_STYLES[target.status]}`}>
                {target.status.toUpperCase()}
              </span>
            </div>

            <div className="text-xs text-osr-text-dim mb-2">
              <span className="uppercase tracking-wider">Why:</span> {target.relevance}
            </div>

            {target.recent_activity && (
              <div className="text-xs text-osr-text-dim mb-3">
                <span className="uppercase tracking-wider">Recent:</span> {target.recent_activity}
              </div>
            )}

            {/* Connection Message */}
            <div className="bg-osr-green/5 border border-osr-green/20 p-3 mb-3">
              <div className="text-xs text-osr-green uppercase tracking-wider mb-1">Connection Message</div>
              <div className="text-sm text-white">{target.connection_message}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={() => copyMessage(target.connection_message)} className="btn-primary text-xs px-3 py-1.5">
                Copy Message
              </button>
              {target.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(target.id, 'connected')} className="btn-ghost text-xs px-3 py-1.5 text-osr-green border-osr-green/30">
                    Mark Connected
                  </button>
                  <button onClick={() => updateStatus(target.id, 'skipped')} className="btn-ghost text-xs px-3 py-1.5">
                    Skip
                  </button>
                </>
              )}
              {target.status === 'connected' && (
                <button onClick={() => updateStatus(target.id, 'pending')} className="btn-ghost text-xs px-3 py-1.5">
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-osr-text-dim">No targets match filters</div>
        )}
      </div>
    </div>
  )
}
