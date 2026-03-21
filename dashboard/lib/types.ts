export interface WalletScore {
  wallet_address: string
  score: number
  tier: number
  classification: string
  confidence: number
  reasoning: string
  presale_count: number
  defi_protocols: string[]
  ai_protocols: string[]
  hold_duration_days: number
  sol_balance: number
  last_active: string
  social_match: Record<string, string>
  scored_at: string
  airdrop_sent: boolean
  dialect_sent: boolean
}

export interface SocialFeedItem {
  id: string
  platform: 'TELEGRAM' | 'X' | 'REDDIT' | 'YOUTUBE' | 'LINKEDIN' | 'ONCHAIN'
  score: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  source: string
  source_detail: string
  original_message: string
  suggested_reply: string
  url: string
  keywords: string[]
  created_at: string
  status: 'pending' | 'actioned' | 'dismissed'
}

export interface DraftItem {
  id: string
  platform: string
  source_post: string
  source_url: string
  source_author: string
  draft_reply: string
  score: number
  created_at: string
  status: 'pending' | 'copied' | 'edited' | 'dismissed'
}

export interface LinkedInTarget {
  id: string
  name: string
  title: string
  company: string
  category: string
  relevance: string
  recent_activity: string
  connection_message: string
  followup_message: string
  status: 'pending' | 'connected' | 'skipped'
  week: string
}

export interface AgentStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  last_scan: string
  items_found: number
  error_message?: string
}

export interface OverviewStats {
  agents: AgentStatus[]
  total_wallets: number
  total_posts_found: number
  drafts_pending: number
  wallets_tier1: number
  wallets_tier2: number
  wallets_tier3: number
  last_refreshed: string
}

export interface AgentSettings {
  primary_keywords: string[]
  secondary_keywords: string[]
  scoring_weights: Record<string, number>
  target_subreddits: string[]
  telegram_groups: string[]
  linkedin_targets: LinkedInTarget[]
  score_threshold: number
}
