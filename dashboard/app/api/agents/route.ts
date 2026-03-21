import { NextResponse } from 'next/server'
import { scanTable } from '@/lib/dynamo'
import { MOCK_AGENTS } from '@/lib/mock-data'
import type { AgentStatus } from '@/lib/types'

export async function GET() {
  // Try to read agent status from DynamoDB, fall back to mock
  const items = await scanTable('agent_status')

  if (items.length > 0) {
    const agents: AgentStatus[] = items.map(item => ({
      name: item.name,
      status: item.status,
      last_scan: item.last_scan || '',
      items_found: item.items_found || 0,
      error_message: item.error_message,
    }))
    return NextResponse.json({ agents, source: 'dynamodb' })
  }

  return NextResponse.json({ agents: MOCK_AGENTS, source: 'mock' })
}
