import { NextRequest, NextResponse } from 'next/server'
import { scanTable } from '@/lib/dynamo'
import { MOCK_DRAFTS } from '@/lib/mock-data'
import type { DraftItem } from '@/lib/types'

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status')
  const platform = request.nextUrl.searchParams.get('platform')

  let drafts: DraftItem[] = []
  const dbItems = await scanTable('drafts', 200)

  if (dbItems.length > 0) {
    drafts = dbItems.map(item => ({
      id: item.id || `${item.platform}-${item.created_at}`,
      platform: item.platform || '',
      source_post: item.source_post || item.original_poster || '',
      source_url: item.source_url || '',
      source_author: item.source_author || item.original_poster || '',
      draft_reply: item.draft_reply || item.suggested_reply || '',
      score: Number(item.score) || 0,
      created_at: item.created_at || item.scored_at || '',
      status: item.status || 'pending',
    }))
  } else {
    drafts = MOCK_DRAFTS
  }

  if (status) drafts = drafts.filter(d => d.status === status)
  if (platform) drafts = drafts.filter(d => d.platform === platform)

  drafts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({
    drafts,
    total: drafts.length,
    pending: drafts.filter(d => d.status === 'pending').length,
    source: dbItems.length > 0 ? 'dynamodb' : 'mock',
  })
}

export async function PATCH(request: NextRequest) {
  const { id, status } = await request.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, id, status })
}
