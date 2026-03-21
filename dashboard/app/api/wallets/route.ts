import { NextRequest, NextResponse } from 'next/server'
import { scanTable } from '@/lib/dynamo'
import { MOCK_WALLETS } from '@/lib/mock-data'
import type { WalletScore } from '@/lib/types'

export async function GET(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get('tier')
  const minScore = parseInt(request.nextUrl.searchParams.get('minScore') || '0')
  const maxScore = parseInt(request.nextUrl.searchParams.get('maxScore') || '100')
  const sortBy = request.nextUrl.searchParams.get('sortBy') || 'score'
  const sortDir = request.nextUrl.searchParams.get('sortDir') || 'desc'

  // Try DynamoDB first
  let wallets: WalletScore[] = []
  const items = await scanTable('wallet_scores')

  if (items.length > 0) {
    wallets = items.map(item => ({
      wallet_address: item.wallet_address,
      score: Number(item.score) || 0,
      tier: Number(item.tier) || 0,
      classification: item.classification || 'unknown',
      confidence: Number(item.confidence) || 0,
      reasoning: item.reasoning || '',
      presale_count: Number(item.presale_count) || 0,
      defi_protocols: Array.isArray(item.defi_protocols) ? item.defi_protocols : item.defi_protocols ? Array.from(item.defi_protocols) : [],
      ai_protocols: Array.isArray(item.ai_protocols) ? item.ai_protocols : item.ai_protocols ? Array.from(item.ai_protocols) : [],
      hold_duration_days: Number(item.hold_duration_days) || 0,
      sol_balance: Number(item.sol_balance) || 0,
      last_active: item.last_active || '',
      social_match: item.social_match || {},
      scored_at: item.scored_at || '',
      airdrop_sent: item.airdrop_sent || false,
      dialect_sent: item.dialect_sent || false,
    }))
  } else {
    wallets = MOCK_WALLETS
  }

  // Filter
  if (tier) wallets = wallets.filter(w => w.tier === parseInt(tier))
  wallets = wallets.filter(w => w.score >= minScore && w.score <= maxScore)

  // Sort
  wallets.sort((a, b) => {
    const aVal = (a as any)[sortBy] ?? 0
    const bVal = (b as any)[sortBy] ?? 0
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    }
    return sortDir === 'desc'
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal))
  })

  return NextResponse.json({
    wallets,
    total: wallets.length,
    source: items.length > 0 ? 'dynamodb' : 'mock',
  })
}
