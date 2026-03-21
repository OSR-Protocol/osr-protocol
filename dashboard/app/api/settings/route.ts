import { NextRequest, NextResponse } from 'next/server'
import { getItem, putItem } from '@/lib/dynamo'
import type { AgentSettings } from '@/lib/types'

const DEFAULT_SETTINGS: AgentSettings = {
  primary_keywords: [
    'presale', 'new launch solana', 'ai agent token', 'looking for alpha',
    'what to ape', 'transparent presale', 'liquidity locked',
    'agent infrastructure', 'trading os', 'solana agent',
    'autonomous trading', 'ai trading bot',
  ],
  secondary_keywords: [
    'position sizing crypto', 'risk management trading',
    'systematic trading crypto', 'prediction market solana',
    'defi infrastructure', 'burn mechanism',
    'deflationary token', 'utility token solana',
  ],
  scoring_weights: {
    keyword_density: 30,
    group_quality: 20,
    author_profile: 20,
    conversation_context: 15,
    timeliness: 15,
  },
  target_subreddits: ['solana', 'algotrading', 'cryptocurrency', 'systemtrading'],
  telegram_groups: [],
  linkedin_targets: [],
  score_threshold: 60,
}

export async function GET() {
  const item = await getItem('settings', { id: 'agent_config' })
  const settings = item ? (item as unknown as AgentSettings) : DEFAULT_SETTINGS
  return NextResponse.json({ settings, source: item ? 'dynamodb' : 'defaults' })
}

export async function PUT(request: NextRequest) {
  const settings = await request.json()
  await putItem('settings', { id: 'agent_config', ...settings })
  return NextResponse.json({ ok: true })
}
