# OSR PROTOCOL — MISSION CONTROL

**Authority:** Ashim (Founder, System R AI)
**Purpose:** Single source of truth for the $OSR token launch and supporting systems.

---

## 1. CURRENT MILESTONE

```
CURRENT: AGENTS-LIVE — Get social agents and blockchain monitoring operational
STATUS: IN PROGRESS (70% complete)
STARTED: 2026-03-19
DONE WHEN: All agents producing real output in Telegram coordination channel + continuous monitoring
```

---

## 2. THREE STRATEGIC GOALS

Everything every agent does must serve one of these:
1. **Presale Pipeline** — Find 1,000-2,000 qualified wallets likely to participate at $250+
2. **Ecosystem Visibility** — Get noticed by Solana Foundation, Superteam, protocols, VCs, builders
3. **Partnerships & Investment** — Funding, grants, accelerators, strategic partnerships

Global "So What?" filter enforced in `shared/filters.py`. Every item must pass before appearing in dashboard or coordination channel.

---

## 3. PRIORITY ORDER

**COMPLETE:**
- [x] Repo scaffolded, shared infra, all agents coded (v2)
- [x] .env credentials filled (X, Telegram, Helius, YouTube, LinkedIn)
- [x] Coordination channel created — OSR Command Center (private, bot-posting, ID: -1003850929984)
- [x] Telethon authenticated (session: osr_monitor.session, user: Ken, ID: 8145251329)
- [x] "So What?" test — shared/filters.py enforced across all agents
- [x] All agents v2 — weighted keywords, quality filters, priority tagging, exclude lists
- [x] Ops Dashboard — 6 pages, auth, builds clean
- [x] 72 unit tests passing
- [x] Wallet Discovery — live on Helius mainnet, Jupiter scan found 3,009 SOL whale
- [x] Reddit RSS — live, content tagging working (found RWA+AI thesis validation post)
- [x] YouTube — live, quality filters working (found Genfinity 22.7K subs collab target)
- [x] LinkedIn Briefer — live, Hack VC briefing generated via Bedrock Claude Sonnet 4
- [x] Bot connectivity — @osr_command_bot posting to channel verified
- [x] First daily scan posted to OSR Command Center

**NEXT SESSION:**
- [ ] Fix wallet enrichment pipeline — 3-protocol filter too strict with only 50 recent txns; needs broader history pull
- [ ] Full enrichment on Jupiter whales (3,009 SOL, 1,836 SOL, 1,105 SOL) — AI/RWA/governance check
- [ ] X API — upgrade to Basic ($100/mo) or wait for credit refresh
- [ ] Telegram monitoring — join 5-7 target groups (@solana, @DriftProtocol, @JupiterExchange, etc.)
- [ ] Dashboard updates: Grants & Opportunities page, weekly targets card, content pipeline section, v2 wallet fields
- [ ] Dashboard mock data update with v2 fields (defi_categories, ai_protocols, rwa_holdings, prediction_markets)
- [ ] Set up scheduled agent runs (Lambda/EventBridge or cron for periodic scanning)
- [ ] DynamoDB tables — actually create them (currently using mock data in dashboard)

**UNBLOCKED — Entity formed 2026-03-20:**
- Token mint script → ready for devnet development
- Escrow contract, presale contract → ready for devnet development
- Tokenomics & whitepaper → DECISION NEEDED (consume-and-burn vs consume-and-reuse)
- tools.systemr.ai frontend
- Airdrop scripts, Dialect messaging

---

## 4. DECISIONS LOG

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-19 | Monorepo (osr-protocol) | Timeline too tight for multi-repo overhead |
| 2026-03-19 | Python 3.11+ for all agents | Consistency with System R, async support |
| 2026-03-19 | Helius free tier to start | 100K credits/day sufficient for discovery dev |
| 2026-03-19 | DynamoDB same AWS account, osr_ prefix | Simplicity, existing IAM, no cross-account |
| 2026-03-19 | Agents NEVER post | Human reviews all drafts, posts manually |
| 2026-03-19 | Bedrock primary LLM | Always available via IAM, Sonnet 4 inference profile |
| 2026-03-19 | LinkedIn agent uses NO API | No useful products approved. Claude + public info. |
| 2026-03-19 | Reddit via RSS feeds | API self-service discontinued Nov 2025 |
| 2026-03-19 | **HOLD all token/contract work** | Entity formation (OSR Protocol Inc. BVI) needs clarity first |
| 2026-03-20 | 3-protocol hard filter needs relaxing | Only 50 recent txns visible per wallet; lifetime history needed for accurate protocol count |
| 2026-03-20 | Coordination channel = Telegram Channel | Not group. One-way broadcast. Bot posts only. |
| 2026-03-21 | **BVI entity formed** | OSR Protocol Inc. (BVI) formation COMPLETE — token/contract work UNBLOCKED |
| 2026-03-21 | **BME model LOCKED (D-001)** | Burn-and-Mint Equilibrium — burn $OSR to mint compute credits. Proven by Helium/Render/Akash. See DECISIONS.md |
| 2026-03-21 | All dev work on devnet | 5 SOL mainnet stays in Phantom wallet until mainnet deployment ready |
| 2026-03-21 | Solana CLI installed | v3.1.11, spl-token v5.5.0, devnet keypair: 4jueWNQ2DZfLmrTCuYPdHiBX4nVHWu1BUXhmVX1XWi7C |

---

## 5. SESSION HANDOFF

### Last Session: #6 (2026-03-21) — TOKENOMICS & GOVERNANCE
**What was done:**
- BVI entity formation confirmed COMPLETE (2026-03-20)
- Solana CLI installed (v3.1.11, spl-token v5.5.0)
- Devnet keypair generated: `4jueWNQ2DZfLmrTCuYPdHiBX4nVHWu1BUXhmVX1XWi7C`
- 5 SOL airdropped on devnet (via faucet.solana.com)
- GitHub org created: https://github.com/OSR-Protocol (osrprotocol account)
- **24 decisions locked in DECISIONS.md** — full tokenomics, governance, budget, allocation
- BME model locked (D-001), backed by Helium/Render/Akash research
- Token allocation locked: 77% protocol, 23% people (D-004)
- Three-fund architecture designed: Token Treasury / Operating Fund / Strategic Reserve (D-016)
- On-chain governance designed: Realms, 3-tier voting, staker 1.5x weight, founder veto Year 1-3 (D-024)
- Treasury governance: time-lock tiers ($5K/$50K), investor objection protocol (D-008)
- Operating budget: $14,700/mo with $5,500 paid ads (D-019)
- Comprehensive regulatory analysis: BVI VASP Act compliant with two-step USDC separation (D-015)
- Full research: BME failure modes, oracle attacks, MEV, stablecoin risks, governance attacks, tax implications, scalability

**What to do next session:**
1. Mint $OSR token on devnet (1B supply, 9 decimals)
2. Draft intercompany IP licensing agreement (BVI ↔ Florida) (D-022)
3. Begin whitepaper structure based on locked decisions
4. Resume agent work: fix wallet enrichment, join Telegram groups, X API
5. Push osr-protocol repo to GitHub OSR-Protocol org
6. Set up git config for Shannon attribution

**Blockers:**
- X API credits still depleted (HTTP 402)
- Wallet enrichment limited by Helius free tier (50 tx per wallet call)
- DynamoDB tables not yet created

---

## 6. BUILD STATE

| Metric | Value |
|--------|-------|
| Python files | 35 |
| Dashboard files | 29 (TS/TSX/CSS/JS) |
| Unit tests | 72 (all passing) |
| Agents | 6 (discovery, x, telegram, reddit, youtube, linkedin) |
| Agent version | v2 (strategic alignment, "So What?" filter, weighted keywords) |
| Dashboard pages | 6 (overview, wallets, social, drafts, linkedin, settings) |
| Coordination channel | LIVE (-1003850929984) |
| Telethon auth | DONE (session saved) |
| Bedrock model | us.anthropic.claude-sonnet-4-20250514-v1:0 |
| **$OSR Token (devnet)** | Mint: `HBeMPtFD4fFf4otKst3AMvW8E5eJBhB4oqNeNRJneJHB` |
| Token account | `8YdnHbhBxtVsLRfpUfjmGjSJQNXFss6fWKmY3BfGcuHr` |
| Supply | 1,000,000,000 (9 decimals) |

---

## 7. CREDENTIAL STATUS

| Service | Status | Notes |
|---------|--------|-------|
| Helius | ✅ LIVE | Free tier, 100K credits/day, 2 keys |
| Telegram (Telethon) | ✅ LIVE | Authenticated, session saved |
| Telegram (Bot) | ✅ LIVE | @osr_command_bot posting to channel |
| YouTube | ✅ LIVE | Free tier, 10K units/day |
| LinkedIn | ✅ CREDS | API useless, agent uses Claude + public info |
| Reddit | ✅ RSS | API blocked, RSS feeds working |
| AWS Bedrock | ✅ LIVE | Claude Sonnet 4 via inference profile |
| X API | ❌ BLOCKED | Credits depleted, need $100/mo upgrade |
| Anthropic API | ⬜ TODO | Not needed yet (Bedrock is primary) |

---

## 8. COORDINATION CHANNEL

- **Channel:** OSR Command Center (private)
- **ID:** -1003850929984
- **Bot:** @osr_command_bot (ID: 8601027765)
- **Format:** `[AGENT_NAME] [SCORE: XX] [PRIORITY: HIGH/MEDIUM/LOW]`
- **Rule:** Only HIGH priority (score 80+) triggers channel notification. Everything else → dashboard only.

---

## 9. KEY RESOURCES

| Resource | Location |
|----------|----------|
| Decision protocol | ~/Projects/osr-protocol/DECISIONS.md |
| Engineering brief | ~/Downloads/CLAUDE-CODE-CONTEXT.md |
| Access map | memory/osr_api_access_map.md |
| Repo | ~/Projects/osr-protocol/ |
| Dashboard | ~/Projects/osr-protocol/dashboard/ (localhost:3000) |
| System R (main platform) | ~/Projects/systemr-v2/ |
| Channel setup guide | ~/Projects/osr-protocol/docs/COORDINATION_CHANNEL_SETUP.md |

---

## 10. TOKEN DETAILS (PARKED)

| Property | Value |
|----------|-------|
| Name | Operating System R |
| Ticker | $OSR |
| Network | Solana (mainnet-beta) |
| Supply | 1,000,000,000 (1B) |
| Issuer | OSR Protocol Inc. (BVI, FORMED 2026-03-20) |
| Presale target | April 7, 2026 (contingent on entity formation) |
