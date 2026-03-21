'use client'

import { useState, useEffect, useCallback } from 'react'

interface RefreshIndicatorProps {
  onRefresh: () => void
  intervalMs?: number
}

export default function RefreshIndicator({ onRefresh, intervalMs = 60000 }: RefreshIndicatorProps) {
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)

  const doRefresh = useCallback(() => {
    onRefresh()
    setLastRefreshed(new Date())
    setSecondsAgo(0)
  }, [onRefresh])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshed.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [lastRefreshed])

  useEffect(() => {
    const poller = setInterval(doRefresh, intervalMs)
    return () => clearInterval(poller)
  }, [doRefresh, intervalMs])

  const formatAge = (s: number) => {
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ${s % 60}s ago`
  }

  return (
    <div className="flex items-center gap-3 text-xs text-osr-text-dim">
      <span>Last refreshed: {formatAge(secondsAgo)}</span>
      <button onClick={doRefresh} className="btn-ghost text-xs px-2 py-1">
        ↻ Refresh
      </button>
    </div>
  )
}
