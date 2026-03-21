'use client'

import { useState, useEffect } from 'react'
import type { AgentSettings } from '@/lib/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AgentSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dataSource, setDataSource] = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(data.settings)
      setDataSource(data.source)
    })
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <div className="text-osr-text-dim p-8">Loading settings...</div>

  const updateKeywords = (field: 'primary_keywords' | 'secondary_keywords', value: string) => {
    setSettings({ ...settings, [field]: value.split('\n').map(s => s.trim()).filter(Boolean) })
  }

  const updateSubreddits = (value: string) => {
    setSettings({ ...settings, target_subreddits: value.split('\n').map(s => s.trim()).filter(Boolean) })
  }

  const updateGroups = (value: string) => {
    setSettings({ ...settings, telegram_groups: value.split('\n').map(s => s.trim()).filter(Boolean) })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-osr-text-dim text-xs mt-1">
            Agent configuration {dataSource === 'defaults' && <span className="text-yellow-400">[DEFAULTS]</span>}
          </p>
        </div>
        <button onClick={save} disabled={saving} className={`px-4 py-2 text-sm font-bold ${saved ? 'bg-osr-green text-black' : 'btn-primary'}`}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Score Threshold */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Score Threshold</h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0} max={100}
            value={settings.score_threshold}
            onChange={e => setSettings({ ...settings, score_threshold: Number(e.target.value) })}
            className="flex-1 accent-[#04FC00]"
          />
          <span className="text-osr-green font-bold w-12 text-right">{settings.score_threshold}</span>
        </div>
        <p className="text-xs text-osr-text-dim mt-2">
          Only items scoring above this threshold will generate drafts and coordination channel alerts.
        </p>
      </div>

      {/* Primary Keywords */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Primary Keywords</h2>
        <textarea
          value={settings.primary_keywords.join('\n')}
          onChange={e => updateKeywords('primary_keywords', e.target.value)}
          className="input-field w-full h-48 text-xs"
          placeholder="One keyword per line"
        />
        <p className="text-xs text-osr-text-dim mt-2">
          High-value triggers. Each match adds 10 points (max 30).
        </p>
      </div>

      {/* Secondary Keywords */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Secondary Keywords</h2>
        <textarea
          value={settings.secondary_keywords.join('\n')}
          onChange={e => updateKeywords('secondary_keywords', e.target.value)}
          className="input-field w-full h-36 text-xs"
          placeholder="One keyword per line"
        />
        <p className="text-xs text-osr-text-dim mt-2">
          Supporting triggers. Each match adds 5 points.
        </p>
      </div>

      {/* Target Subreddits */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Target Subreddits (RSS)</h2>
        <textarea
          value={settings.target_subreddits.join('\n')}
          onChange={e => updateSubreddits(e.target.value)}
          className="input-field w-full h-24 text-xs"
          placeholder="One subreddit per line (without r/)"
        />
      </div>

      {/* Telegram Groups */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Telegram Groups</h2>
        <textarea
          value={settings.telegram_groups.join('\n')}
          onChange={e => updateGroups(e.target.value)}
          className="input-field w-full h-24 text-xs"
          placeholder="One group name or ID per line"
        />
        <p className="text-xs text-osr-text-dim mt-2">
          Groups to monitor via Telethon. Add group IDs after joining.
        </p>
      </div>

      {/* Scoring Weights */}
      <div className="card">
        <h2 className="text-sm font-bold text-osr-text-muted uppercase tracking-wider mb-3">Scoring Weights</h2>
        <div className="space-y-3">
          {Object.entries(settings.scoring_weights).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <label className="text-xs text-osr-text-dim w-40">{key.replace(/_/g, ' ')}</label>
              <input
                type="range"
                min={0} max={50}
                value={value}
                onChange={e => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, [key]: Number(e.target.value) }
                })}
                className="flex-1 accent-[#04FC00]"
              />
              <span className="text-osr-green font-bold w-8 text-right text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
