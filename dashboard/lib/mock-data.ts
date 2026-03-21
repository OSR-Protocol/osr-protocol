import type { WalletScore, SocialFeedItem, DraftItem, AgentStatus, LinkedInTarget } from './types'

// Mock data for development when DynamoDB tables are empty or not created yet

export const MOCK_AGENTS: AgentStatus[] = [
  { name: 'Wallet Discovery', status: 'running', last_scan: new Date().toISOString(), items_found: 847 },
  { name: 'X Monitor', status: 'error', last_scan: new Date(Date.now() - 3600000).toISOString(), items_found: 0, error_message: 'HTTP 402 — Credits depleted' },
  { name: 'Telegram Monitor', status: 'stopped', last_scan: '', items_found: 0, error_message: 'Awaiting phone auth' },
  { name: 'Reddit RSS', status: 'running', last_scan: new Date().toISOString(), items_found: 50 },
  { name: 'YouTube Monitor', status: 'running', last_scan: new Date().toISOString(), items_found: 10 },
  { name: 'LinkedIn Briefer', status: 'running', last_scan: new Date().toISOString(), items_found: 3 },
]

export const MOCK_WALLETS: WalletScore[] = [
  {
    wallet_address: '3PFkJVowwwxq8X35rQUK2u9hgHT7A1d2wqMnUBPG8X2v',
    score: 85, tier: 1, classification: 'high_conviction', confidence: 0.92,
    reasoning: 'Active presale participant with diverse DeFi and AI protocol usage',
    presale_count: 3, defi_protocols: ['jupiter', 'raydium', 'orca', 'marinade', 'drift'],
    ai_protocols: ['elizaos', 'virtuals'], hold_duration_days: 45,
    sol_balance: 396.636, last_active: new Date().toISOString(),
    social_match: { sns: 'whale.sol' }, scored_at: new Date().toISOString(),
    airdrop_sent: false, dialect_sent: false,
  },
  {
    wallet_address: '8X35rQUK2u9hgHT7A1d2wqMnUBPG8X2v3PFkJVowwwxq',
    score: 72, tier: 2, classification: 'defi_power_user', confidence: 0.85,
    reasoning: 'Heavy DeFi user across 6 protocols, no AI protocol interaction',
    presale_count: 1, defi_protocols: ['jupiter', 'raydium', 'orca', 'marinade', 'parcl', 'metadao'],
    ai_protocols: [], hold_duration_days: 30,
    sol_balance: 12.5, last_active: new Date(Date.now() - 86400000 * 3).toISOString(),
    social_match: { backpack: 'defi_chad' }, scored_at: new Date().toISOString(),
    airdrop_sent: false, dialect_sent: false,
  },
  {
    wallet_address: 'uZ1N4C9dc71EjD3rvwGL4z3oT5RBvJmkL2uF9sMq1xW',
    score: 65, tier: 2, classification: 'ai_native', confidence: 0.78,
    reasoning: 'ElizaOS user with moderate DeFi activity',
    presale_count: 0, defi_protocols: ['jupiter', 'raydium', 'drift'],
    ai_protocols: ['elizaos'], hold_duration_days: 14,
    sol_balance: 1.267, last_active: new Date(Date.now() - 86400000).toISOString(),
    social_match: {}, scored_at: new Date().toISOString(),
    airdrop_sent: false, dialect_sent: false,
  },
  {
    wallet_address: '25Eax9W8SA3wBVJixvf2kL5Tj3NqGrP7bLmFX4d8zQu1',
    score: 45, tier: 3, classification: 'casual', confidence: 0.71,
    reasoning: 'Light DeFi activity, mostly Jupiter swaps',
    presale_count: 0, defi_protocols: ['jupiter', 'raydium', 'orca'],
    ai_protocols: [], hold_duration_days: 7,
    sol_balance: 0.55, last_active: new Date(Date.now() - 86400000 * 10).toISOString(),
    social_match: {}, scored_at: new Date().toISOString(),
    airdrop_sent: false, dialect_sent: false,
  },
  {
    wallet_address: 'HrH5obyb8koKwZ4nCBxiKL9RMn2vJGLqEF5tBj8aSd3R',
    score: 38, tier: 3, classification: 'casual', confidence: 0.65,
    reasoning: 'Occasional DeFi user with small balance',
    presale_count: 0, defi_protocols: ['jupiter', 'orca', 'marinade'],
    ai_protocols: [], hold_duration_days: 5,
    sol_balance: 0.8, last_active: new Date(Date.now() - 86400000 * 20).toISOString(),
    social_match: {}, scored_at: new Date().toISOString(),
    airdrop_sent: false, dialect_sent: false,
  },
]

export const MOCK_SOCIAL_FEED: SocialFeedItem[] = [
  {
    id: 'r1', platform: 'REDDIT', score: 72, priority: 'MEDIUM',
    source: 'r/algotrading', source_detail: 'u/algo_trader42 | Keywords: systematic trading',
    original_message: 'Weekly Discussion Thread - More people working on trading systems are exploring AI agents',
    suggested_reply: '[Reddit monitoring — observe only]',
    url: 'https://reddit.com/r/algotrading/comments/abc123',
    keywords: ['systematic trading', 'ai agent'], created_at: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'y1', platform: 'YOUTUBE', score: 40, priority: 'LOW',
    source: 'YouTube: The Prediction Engineer', source_detail: '119 views | 0 likes',
    original_message: 'The 7-Day AI Trading Bot Experiment',
    suggested_reply: '[YouTube monitoring — observe only]',
    url: 'https://youtube.com/watch?v=NvOSCdt7Wf0',
    keywords: ['ai trading', 'trading bot'], created_at: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'y2', platform: 'YOUTUBE', score: 35, priority: 'LOW',
    source: 'YouTube: Mike Frisco', source_detail: '1 views | 0 likes',
    original_message: 'I Built a Solana Trading Bot That Actually Makes Money',
    suggested_reply: '[YouTube monitoring — observe only]',
    url: 'https://youtube.com/watch?v=3JLLeHSTv1k',
    keywords: ['solana', 'trading bot'], created_at: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'r2', platform: 'REDDIT', score: 68, priority: 'MEDIUM',
    source: 'r/algotrading', source_detail: 'u/risk_mgr | Keywords: risk management',
    original_message: 'How I manage risk as an algo trader - sharing my framework',
    suggested_reply: '[Reddit monitoring — observe only]',
    url: 'https://reddit.com/r/algotrading/comments/def456',
    keywords: ['risk management'], created_at: new Date(Date.now() - 3600000).toISOString(), status: 'pending',
  },
]

export const MOCK_DRAFTS: DraftItem[] = [
  {
    id: 'd1', platform: 'LINKEDIN',
    source_post: 'Bill Qian - Managing Partner at Cypher Capital',
    source_url: 'https://linkedin.com/in/billqian',
    source_author: 'Bill Qian',
    draft_reply: 'Hi Bill, your recent post on AI agent infrastructure in DeFi really resonated. I\'m building AI-powered trading infrastructure for institutional crypto markets. Would love to connect and hear your thoughts on where this space is heading in the Solana ecosystem.',
    score: 0, created_at: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'd2', platform: 'LINKEDIN',
    source_post: 'Anis Baarma - Founder & CEO at CoreNest Capital',
    source_url: 'https://linkedin.com/in/anisbaarma',
    source_author: 'Anis Baarma',
    draft_reply: 'Hi Anis, saw your Token2049 panel on AI in finance - timely insights on infrastructure challenges. I\'m building AI trading infrastructure and would value connecting with someone navigating similar territory in the Web3 space.',
    score: 0, created_at: new Date().toISOString(), status: 'pending',
  },
]

export const MOCK_LINKEDIN_TARGETS: LinkedInTarget[] = [
  {
    id: 'lt1', name: 'Bill Qian', title: 'Managing Partner', company: 'Cypher Capital',
    category: 'Dubai VCs', relevance: 'Dubai-based crypto VC, active in Solana ecosystem',
    recent_activity: 'Posted about AI agent infrastructure in DeFi',
    connection_message: 'Hi Bill, your post on AI agent infrastructure resonated...',
    followup_message: '', status: 'pending', week: 'Week 1',
  },
  {
    id: 'lt2', name: 'Anis Baarma', title: 'Founder & CEO', company: 'CoreNest Capital',
    category: 'Dubai VCs', relevance: 'Web3 and AI infrastructure focus',
    recent_activity: 'Attended Token2049 Dubai',
    connection_message: 'Hi Anis, saw your Token2049 panel insights...',
    followup_message: '', status: 'pending', week: 'Week 1',
  },
  {
    id: 'lt3', name: 'Mathias Ruch', title: 'Founder & CEO', company: 'CV VC',
    category: 'Dubai VCs', relevance: 'Swiss-Dubai VC, blockchain focus, agent space deal flow',
    recent_activity: 'Published report on autonomous trading agents',
    connection_message: 'Hi Mathias, your report on autonomous trading agents caught my attention...',
    followup_message: '', status: 'connected', week: 'Week 1',
  },
]
