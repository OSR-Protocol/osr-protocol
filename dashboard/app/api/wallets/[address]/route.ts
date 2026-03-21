import { NextRequest, NextResponse } from 'next/server'
import { getItem } from '@/lib/dynamo'
import { MOCK_WALLETS } from '@/lib/mock-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params

  // Try DynamoDB first
  const item = await getItem('wallet_scores', { wallet_address: address })
  if (item) {
    return NextResponse.json({ wallet: item, source: 'dynamodb' })
  }

  // Fall back to mock
  const mock = MOCK_WALLETS.find(w => w.wallet_address === address)
  if (mock) {
    return NextResponse.json({ wallet: mock, source: 'mock' })
  }

  return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
}
