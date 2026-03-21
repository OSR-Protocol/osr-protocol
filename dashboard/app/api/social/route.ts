import { NextRequest, NextResponse } from 'next/server'
import { scanTable, updateItemField } from '@/lib/dynamo'
import { MOCK_SOCIAL_FEED } from '@/lib/mock-data'
import type { SocialFeedItem } from '@/lib/types'

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')
  const priority = request.nextUrl.searchParams.get('priority')
  const status = request.nextUrl.searchParams.get('status')
  const minScore = parseInt(request.nextUrl.searchParams.get('minScore') || '0')

  let items: SocialFeedItem[] = []
  const dbItems = await scanTable('social_feed', 200)

  if (dbItems.length > 0) {
    items = dbItems.map(item => ({
      id: item.id || `${item.platform}-${item.created_at}`,
      platform: item.platform,
      score: Number(item.score) || 0,
      priority: Number(item.score) >= 80 ? 'HIGH' : Number(item.score) >= 60 ? 'MEDIUM' : 'LOW',
      source: item.source || '',
      source_detail: item.source_detail || '',
      original_message: item.original_message || '',
      suggested_reply: item.suggested_reply || '',
      url: item.url || '',
      keywords: item.keywords || [],
      created_at: item.created_at || '',
      status: item.status || 'pending',
    }))
  } else {
    items = MOCK_SOCIAL_FEED
  }

  // Filters
  if (platform) items = items.filter(i => i.platform === platform)
  if (priority) items = items.filter(i => i.priority === priority)
  if (status) items = items.filter(i => i.status === status)
  items = items.filter(i => i.score >= minScore)

  // Sort by created_at desc
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({
    items,
    total: items.length,
    source: dbItems.length > 0 ? 'dynamodb' : 'mock',
  })
}

export async function PATCH(request: NextRequest) {
  const { id, status } = await request.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
  }
  // For mock data, just acknowledge
  return NextResponse.json({ ok: true, id, status })
}
