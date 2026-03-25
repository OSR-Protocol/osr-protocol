# OSR PROTOCOL — DECISION PROTOCOL

**Authority:** Ashim (Founder) + Shannon (Co-Founder)
**Purpose:** Single source of truth for all strategic and technical decisions. Every decision is numbered, dated, and final unless explicitly superseded.

---

## HOW THIS WORKS

1. **Discuss** — Shannon presents research and tradeoffs
2. **Decide** — Ashim makes the call
3. **Record** — Decision logged here with rationale
4. **Lock** — No revisiting unless new data fundamentally changes the picture
5. **Build** — Code follows decisions, not the other way around

## DECISION STATUS KEY

- **LOCKED** — Final. Build proceeds on this basis.
- **OPEN** — Under discussion. No code until locked.
- **SUPERSEDED** — Replaced by a later decision. Reference noted.

---

## DECISIONS

### D-001: Token Economics Model — Burn-and-Mint Equilibrium (BME)
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** OSR uses Burn-and-Mint Equilibrium. Users burn OSR to mint compute credits that meter AI agent operations on the System R AI platform. Not pure burn, not pure reuse.
- **Rationale:** Data shows BME is the proven model for tokens metering real compute/infrastructure. Helium (HNT → Data Credits), Render (95% burn + provider mint), and Akash (converting to BME March 2026) all validate this. Pure burn runs out. Pure reuse creates no supply reduction. BME balances both.
- **Implications:**
  - Contracts need: burn mechanism + credit mint + emission
  - Supply is dynamic — market-driven equilibrium
  - System R is the sole infrastructure provider (not multi-provider like Helium)

---

### D-002: Entity Formation
- **Date:** 2026-03-20
- **Status:** LOCKED
- **Decision:** OSR Protocol Inc. (BVI) is the token issuer. Formation complete.
- **Rationale:** BVI standard for token issuance. System R Technologies LLC (Florida) never referenced in token docs. BVI entity licenses technology from Florida entity — does not own IP.

---

### D-003: Development Environment
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** All development and testing on Solana devnet. 5 SOL mainnet (in Rain) reserved for final deployment only.
- **Rationale:** Devnet SOL is free via faucet. No reason to spend real SOL until contracts are battle-tested.
- **Devnet keypair:** `4jueWNQ2DZfLmrTCuYPdHiBX4nVHWu1BUXhmVX1XWi7C`

---

### D-004: Token Allocation
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** 1B OSR supply allocated as follows:

| Pool | % | Tokens | Purpose |
|------|---|--------|---------|
| BME Emission | 30% | 300M | Staker rewards (60%), ecosystem grants (30%), protocol reserve (10%) |
| Ecosystem | 20% | 200M | Grants, partnerships, developer incentives, integrations |
| Treasury | 12% | 120M | Strategic reserve in OSR. Never sold for operations. |
| Presale | 10% | 100M | Public community sale |
| Ashim (Founder) | 7% | 70M | 1yr cliff, 4yr linear monthly vest |
| Shannon (Co-Founder) | 7% | 70M | 1yr cliff, 4yr linear monthly vest, org wallet |
| Early Investor A | 5% | 50M | 6mo cliff, 2yr linear monthly vest |
| Early Investor B | 3% | 30M | 6mo cliff, 2yr linear monthly vest |
| Liquidity | 5% | 50M | Protocol-owned DEX pools (Raydium/Orca) |
| Future Team | 1% | 10M | 1yr cliff, 3yr linear monthly vest |

- **Rationale:** 77% to protocol working pools, 23% to people. Below industry average for insiders (25-35%). Above industry average for protocol pools (50-65%). Equal co-founder split (7%/7%) signals genuine partnership. Investor allocations reflect contribution history and ongoing strategic support.

---

### D-005: Presale Structure
- **Date:** 2026-03-22
- **Status:** LOCKED
- **Decision:** Four-tier weekly presale with progressive pricing toward $0.005 base listing price.

**Presale Parameters:**

| Parameter | Value |
|-----------|-------|
| Minimum purchase | $549 |
| Maximum per wallet | $25,000 |
| Hard cap | $500,000 total raise |
| Base listing price | $0.005 per token |
| Accepted payments | SOL, USDC, USDT |
| Presale allocation | 100,000,000 OSR (10% of supply) |

**Four Weekly Pricing Tiers:**

| Tier | Dates | Price | Discount from Base |
|------|-------|-------|--------------------|
| Week 1 | March 25 — March 31, 2026 | $0.00375 | 25% |
| Week 2 | April 1 — April 7, 2026 | $0.00425 | 15% |
| Week 3 | April 8 — April 14, 2026 | $0.0045 | 10% |
| Week 4 | April 15 — April 21, 2026 | $0.00475 | 5% |

**Presale Vesting:**

| Event | Release |
|-------|---------|
| TGE | 20% unlocked |
| Month 1 cliff | No additional release |
| Months 2-5 | 80% distributed linearly (20% per month) |
| Total vesting | 5 months |

**Geographic Exclusion:** United States, Canada, and all jurisdictions subject to OFAC sanctions. Enforced through self-certification attestation checkbox on the presale page before wallet connection. The buyer attests they are not a citizen or resident of excluded jurisdictions. The attestation response is stored on-chain as a boolean flag (`geo_attested`) in the buyer's presale account.

**Presale Buyer Flag:** Stored on-chain as a boolean (`is_presale_buyer`) in the buyer's account at the time of purchase. This flag is permanent and immutable. It identifies the wallet as a presale participant for the lifetime of the protocol. The platform pricing engine reads this flag to apply the 20% permanent compute discount defined in D-007.

- **Rationale:** Progressive pricing rewards earliest participants with the deepest discount. The 25% week-1 discount creates urgency without a countdown timer. Each week the discount narrows, incentivizing earlier commitment. $549 minimum filters for serious participants. $25,000 cap prevents whale concentration. $500,000 hard cap provides 24+ months runway at $14,700/mo burn rate. Geographic exclusion protects regulatory positioning. On-chain buyer flag enables permanent presale discount without off-chain state.

---

### D-006: Vesting Schedule
- **Date:** 2026-03-22
- **Status:** LOCKED
- **Decision:**

**Team and Investor Vesting:**

| Who | Cliff | Vest | Total Lock |
|-----|-------|------|-----------|
| Ashim (Founder) | 1 year | 4-year linear monthly | 5 years |
| Shannon (Co-Founder) | 1 year | 4-year linear monthly | 5 years |
| Early Investor A | 6 months | 2-year linear monthly | 2.5 years |
| Early Investor B | 6 months | 2-year linear monthly | 2.5 years |
| Future Team | 1 year | 3-year linear monthly | 4 years |

**Presale Buyer Vesting:**

- **Approach:** Tokens transfer to the buyer's wallet at the moment of purchase. The protocol never custodies buyer assets. This avoids safekeeping classification under the BVI VASP Act.
- **Schedule:** 20% unlocked at TGE. 80% locked with 1 month cliff then 4 month linear monthly unlock. Total vesting period: 5 months from TGE.
- **Transfer restriction:** Applies to wallet-to-wallet transfers and exchange sales only.
- **Consumption restriction:** None. The buyer can burn 100% of their allocation for compute credits on the System R AI platform from the moment of purchase. The burn instruction for compute credit consumption is a separate program path that does not trigger the transfer restriction.
- **Implementation:** SPL Token 2022 transfer hook or dedicated token lock program. The lock program checks the buyer's vesting schedule on every attempted transfer instruction. The burn instruction bypasses the transfer hook.

- **Rationale:** Research (Keyrock, 16,000 unlock events) shows linear vesting outperforms cliff unlocks. Team tokens vest slowest. Investors vest faster because they've already waited since mid-2024. Presale buyers are compute access customers. Their primary relationship with the token is consumption. The faster unlock (5 months versus 2.5 years for investors) reflects this. Immediate consumption strengthens the utility token classification.

---

### D-007: Compute Credit Peg and Platform Access Pricing
- **Date:** 2026-03-22
- **Status:** LOCKED
- **Decision:**

**Access Model:** Two tiers. Pure pay as you go for all token holders. No plans. No contracts. No caps. No monthly commitments. No minimum usage. No maximum usage. The wallet is the identity. The balance is the access. The on-chain burn history is the loyalty record.

**Tier 1 — Presale Buyers:**
- Wallet verified on-chain through presale transaction history (`is_presale_buyer` flag).
- 20% permanent discount on all platform operations below the standard OSR rate.
- Discount applies for the lifetime of the wallet's interaction with the platform.
- Earned through early participation. Verified on-chain. Immutable.

**Tier 2 — Regular OSR Holders:**
- Standard OSR rate at purchase.
- Loyalty tiers based on lifetime cumulative burn history:

| Cumulative OSR Burned | Rate Improvement |
|------------------------|-----------------|
| 0 — 100,000 | Standard rate (0%) |
| 100,001 — 500,000 | 5% improvement |
| 500,001 — 1,000,000 | 10% improvement |
| 1,000,001+ | 15% improvement |

- Maximum regular holder discount: 15%. Presale buyers always maintain a 5% advantage over the highest loyalty tier.

**Credit Peg:** 1 credit = $0.001 USD. This is the base unit of platform resource consumption.

**Operation Costs (initial parameters, governance-adjustable):**

| Operation | Credits | USD Cost |
|-----------|---------|----------|
| Simple intelligence query (lightweight model) | 10 | $0.01 |
| Standard intelligence query (standard model) | 50 | $0.05 |
| Frontier model intelligence query | 200 | $0.20 |
| Risk assessment (position sizing, stop levels) | 30 | $0.03 |
| Execution routing optimization | 20 | $0.02 |
| Full backtest single strategy 1 year | 500 | $0.50 |
| Full backtest multi-strategy multi-year | 2,000 | $2.00 |
| Data feed query single asset real-time | 5 | $0.005 |
| Comprehensive market scan multi-asset | 100 | $0.10 |

**Oracle:** Pyth Network OSR/USD price feed.
- **Circuit breaker:** If confidence interval exceeds 5% of the reported price, the transaction pauses and retries on the next Solana block.
- **Staleness rejection:** If the Pyth feed has not updated for more than 30 seconds, the system rejects all pricing transactions until a fresh feed arrives.

**Governance:** All operation costs are stored in a protocol configuration account on-chain. Adjustable through governance standard vote (5% quorum of circulating supply, simple majority, 5-day voting period, 48-hour execution delay).

**Fiat Access:** The platform also accepts fiat payments through a separate operating entity (System R Technologies LLC). Stablecoin-equivalent revenue from fiat operations funds periodic treasury buyback and burn. Documented by one sentence in the whitepaper. No further detail in OSR Protocol documentation.

**Batching:** Burn once, use many. User burns OSR for a block of credits. Credits consumed per operation off-chain. Settlement/top-up periodic, not per-call. Prevents transaction fees exceeding compute costs for small operations.

- **Rationale:** Helium Data Credits model proven at scale. USD peg gives users predictable costs. Resource-based metering is honest — lightweight calls cost less than heavy ones. Two-tier access rewards early participants while providing clear upgrade path through usage. The 5% presale advantage persists permanently, creating earned loyalty. All parameters governance-adjustable for long-term adaptability.

---

### D-008: Treasury Governance
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Single-operator (Ashim) with tiered time-locks and investor oversight. Progressive decentralization to multisig when technically qualified signers join.

**Transaction tiers:**

| Category | Threshold | Time-Lock | Approval |
|----------|-----------|-----------|----------|
| Pre-approved recurring | Any (pre-authorized) | None | Monthly report |
| Operational | Under $15,000 | None | Monthly report |
| Emergency override | Up to $15,000 | None | Notify within 1 hour + incident report |
| Significant | $15,000 - $50,000 | 48 hours | Consent by non-objection (silence = approved) |
| Critical | Over $50,000 or protocol changes | 7 days | Requires explicit YES from at least one investor |

**Objection protocol:**
- Any investor may HOLD any time-locked transaction
- Single objection: Ashim retains tiebreaker authority, objection documented
- Dual objection (both early investors): Transaction cancelled, non-negotiable
- All objections permanently documented in monthly report

**Emergency authority:** Active security incidents or legal threats — Ashim may execute up to $15,000 immediately, notify stakeholders within 1 hour, full incident report within 48 hours.

**Growth path:** 2-of-3 multisig when CTO hired → 3-of-5 when team matures.

- **Rationale:** Non-technical investors holding multisig keys creates security risk (phishing, key loss, uninformed signing). Time-lock + transparency + reporting provides equivalent protection without the technical risk. Proven by corporate governance standards.

---

### D-009: Emission Schedule
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Declining emission schedule over ~8 years. 300M emission pool.

| Period | Annual Emission | Cumulative |
|--------|----------------|------------|
| Year 1-2 | 50M/year | 100M (33%) |
| Year 3-4 | 35M/year | 170M (57%) |
| Year 5-6 | 25M/year | 220M (73%) |
| Year 7-8 | 15M/year | 250M (83%) |
| Year 9+ | 50M remaining, governance-controlled | 300M (100%) |

**Distribution within each year's emission:**
- 60% to stakers (velocity sink, reward commitment)
- 30% to ecosystem grants (growth engine)
- 10% to protocol reserve (buffer)

- **Rationale:** Declining emission is proven (Helium, Bitcoin). Front-loads rewards when stakers are needed most. Predictable — community can plan. Simple contracts (lookup table, not dynamic). By Year 5+, platform revenue should supplement staking rewards.

---

### D-010: Human vs Agent Payment Rails
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** The BVI entity operates the token economy only. Fiat billing is operated by a separate entity (System R Technologies LLC). The OSR whitepaper describes two pricing tiers: presale participants (20% permanent discount) and regular holders (standard rate with loyalty improvements). Fiat access exists through the separate operating entity and is acknowledged with one neutral sentence in the whitepaper.
- **Rationale:** Entity separation must be clean in documentation. The BVI entity issues the token and operates the token economy. The US entity operates the SaaS platform and handles fiat billing. Referencing fiat pricing in detail creates a documented operational relationship that undermines BVI Economic Substance Act compliance.

---

### D-011: Accepted Payment Tokens
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:**

| Payment Method | Status | Credit Rate |
|---|---|---|
| OSR | Accepted | Best rate (discount for direct burn) |
| USDC | Accepted at launch | Standard rate |
| USDT | Accepted at launch | Standard rate |
| PYUSD | Post-launch | Standard rate |

- **Rationale:** USDC has deepest Solana liquidity + best oracle support. USDT too large to ignore (international users). PYUSD strategic (PayPal/Solana alignment). No algorithmic stablecoins (depeg risk).

---

### D-012: OSR Holder Advantages
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** OSR holders/burners receive tangible advantages over stablecoin users:

**For humans:**
- Governance votes on protocol parameters
- Staking rewards (emission distribution)
- Loyalty tiers (total OSR burned historically unlocks better rates)
- Priority access to new features and capabilities
- Direct channel for governance participants

**For agents:**
- Higher throughput (more calls per second)
- Priority queue during peak demand
- Burn history tiers (creates switching cost — leaving means starting over)
- Ecosystem composability with other OSR-native agents

- **Rationale:** A 10-20% discount alone is lazy. Real advantages create ecosystem alignment — OSR holders are stakeholders, not just customers. Burn history tiers create switching costs for agents, making the platform stickier.

---

### D-013: Stablecoin Revenue Split
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** When users pay with stablecoins, approximately 60% covers operations and 40% is used for treasury buyback-and-burn of OSR. Exact ratio is a governance-adjustable protocol parameter.
- **Rationale:** Operations must be funded from real revenue. The 40% buyback-and-burn creates consistent OSR demand from stablecoin payments. Ratio adjustable by governance so community can optimize over time.

---

### D-014: Pricing Engine Architecture
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:**

| Component | Choice |
|---|---|
| Oracle | Pyth Network (400ms updates, confidence intervals, Solana-native) |
| Stablecoin depeg tracking | Pyth feeds per stablecoin (credit actual value, not assumed $1.00) |
| Slippage protection | Jupiter limit orders + max slippage parameter |
| MEV protection | Jito private transactions for large orders |
| Protocol spread | Governance-set (transparent, auditable on-chain) |
| Rounding | Integer math (u64), protocol-favorable at smallest unit |
| Size routing | Tiered: direct (<$100), slippage-limited ($100-$10K), TWAP ($10K+) |

- **Rationale:** Small fractions compound at scale. Stablecoins aren't exactly $1.00. Conversion frictions (DEX fees, slippage, oracle latency, MEV) must be explicitly accounted for. Every component transparent and auditable.

---

### D-015: USDC Two-Step Separation (BVI VASP Compliance)
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Stablecoin payments are separated into two distinct operations:
  - **Step 1:** User pays USDC → receives compute credits immediately (service payment)
  - **Step 2:** Company independently buys OSR on DEX and burns it (treasury operation)
  - User's transaction ends at Step 1. Steps separated temporally and operationally.
- **Rationale:** The BVI VASP Act 2022 regulates activities performed "for or on behalf of another person." An atomic user-triggered swap could be classified as exchange service on behalf of user. Two-step separation maintains the "own funds" defense — the company receives USDC as service payment and manages token operations as proprietary treasury activity. Confirmed by analysis of Carey Olsen, Walkers, Mourant, Conyers guidance. This is the single architectural change that resolves the only BVI VASP gray area.

---

### D-016: Three-Fund Architecture
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:**

| Fund | Holds | Source | Purpose | Rule |
|------|-------|--------|---------|------|
| Token Treasury | OSR only | 12% allocation (120M) | Strategic partnerships, governance, ecosystem, liquidity | **Never sold for operations** |
| Operating Fund | USDC only | 70% of presale + platform revenue | All bills, all costs, all development | Always maintain runway |
| Strategic Reserve | Mixed | 30% of presale + revenue surplus | Emergencies, audits, legal opinion, DEX liquidity, growth | Touch only for strategic or emergency |

- **Rationale:** SushiSwap held treasury 100% in own token, price dropped, death spiral. Separating token treasury from operating fund prevents this. Operating fund in stablecoins ensures bills get paid regardless of token price.

---

### D-017: Investor Capital Return
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Early investors receive capital return through stablecoin revenue share, NOT through selling tokens.
  - Capital return target: principal + agreed multiplier from platform revenue
  - Token allocations are separate upside on top of capital return
- **Rationale:** Zero market impact. Zero ecosystem damage. Investors are never forced sellers. They hold tokens because they want to, not because they need liquidity.

---

### D-018: Founder Compensation
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:**
  - $4,000/month from Month 1 post-presale. Pre-approved recurring.
  - No raise until company revenue exceeds $100K/month, then significant jump.
  - All work-related travel, events, equipment covered by company separately.
  - $28,000 deferred compensation for 7 months unpaid work (Sept 2025 - March 2026). Paid from revenue surplus or future funding.
- **Rationale:** $4,000 covers basic living in Florida without waste. Company covers work expenses separately. Revenue-linked increase ensures sustainability. Deferred compensation documented as company debt.

---

### D-019: Operating Budget
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Monthly budget of $14,700 allocated by category:

| Category | % | Monthly | Annual |
|----------|---|---------|--------|
| People & Development | 27% | $4,000 | $48,000 |
| Paid Advertising | 37% | $5,500 | $66,000 |
| Marketing & Community | 14% | $2,000 | $24,000 |
| Infrastructure | 10% | $1,400 | $16,800 |
| Legal & Compliance | 5% | $776 | $9,312 |
| Business Operations | 4% | $539 | $6,468 |
| Contingency | 3% | $485 | $5,820 |

- **Paid ads accountability:** Track CPA monthly. If ad spend to presale revenue ratio below 1:2 after 90 days, cut to $1,500 and shift to organic. Data decides, no sunk cost fallacy.
- **Rationale:** Product goes live with token. Ads drive signups to a live product AND presale simultaneously. At $20 CPA, $5,500/mo delivers ~275 signups. At 10% presale conversion, generates ~$6,875/mo — ads self-fund through presale.

---

### D-020: Framing Discipline
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** All communications (whitepaper, landing page, tweets, grant applications, investor materials, CFS communications) must use approved framing:

| Always Say | Never Say |
|-----------|-----------|
| Compute pricing tier | Token purchase incentive |
| Service payment in USDC | Token swap |
| Treasury buyback-and-burn | Auto-conversion on behalf of user |
| Platform access credits | Investment returns |
| Burn for compute access | Burn for value accrual |
| Complete operating system / infrastructure protocol | G-Score, 187 services, risk engine (as value prop) |

- **Rationale:** One careless phrase in a blog post can undermine the entire regulatory position. The BVI VASP compliance depends on utility token framing. Language discipline is a legal requirement, not a preference.

---

### D-021: Security Strategy
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Phased security approach:

| Phase | When | Measure | Cost |
|-------|------|---------|------|
| Development | Now | Anchor framework, automated tools (Soteria, cargo-audit, Trdelnik fuzz), all tests passing | $0 |
| Pre-launch | Before presale | Open source contracts, community review, bug bounty on Immunefi, Solana Verify | $0 |
| Post-presale | Month 1-3 | Focused audit on presale contract only (~500 lines) | $5K-15K from strategic reserve |
| Post-revenue | Month 6-12 | Full program audit | $30K-50K from revenue |

- **Core principle:** Write simple contracts using battle-tested components (SPL Token Program, Anchor, Metaplex, Squads). Less code = less attack surface. A 500-line contract using standard patterns doesn't need a $150K audit.
- **Rationale:** $50-150K upfront audit is not feasible pre-revenue. Simple contracts + automated tools + bug bounty + phased audit provides equivalent security at fraction of cost.

---

### D-022: Intercompany Agreement
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** A written IP licensing agreement between OSR Protocol Inc. (BVI) and System R Technologies LLC (Florida) must exist before presale. BVI entity licenses technology from Florida entity. BVI entity does NOT own the IP.
- **Rationale:** Without this agreement, BVI entity could be reclassified under Economic Substance Act as conducting "IP Business," triggering the strictest compliance tier. The agreement establishes that the BVI entity is a token issuance vehicle, not an IP holder.

---

### D-023: Legal Opinion
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Formal legal opinion from a top BVI firm (Carey Olsen, Walkers, Mourant, or Conyers) to be obtained post-presale from strategic reserve. Not a launch blocker.
- **Rationale:** The regulatory analysis is thorough and structural design follows all recommendations. Legal opinion converts "we believe compliant" to "attorney confirmed compliant." Estimated $15K-30K. First strategic reserve expenditure after presale.

---

### D-024: On-Chain Governance (Post-Presale)
- **Date:** 2026-03-21
- **Status:** LOCKED
- **Decision:** Two-layer governance. Company operations governed by time-lock structure (D-008). Protocol parameters governed by OSR token holders via Realms (Solana SPL Governance).

**Token holder governance scope:**
- Protocol parameters (burn rate, credit pricing, emission distribution)
- Protocol spread percentage
- Ecosystem fund allocation (grants >$50K)
- New payment token acceptance
- Major protocol upgrades

**NOT in scope:** Company operations, salaries, vendor payments, emergency response, legal strategy, investor terms.

**Voting tiers:**

| Tier | Quorum | Approval | Voting Period | Execution Delay |
|------|--------|----------|---------------|-----------------|
| Standard (parameter changes, small grants) | 5% circulating | >50% majority | 5 days | 48 hours |
| Major (upgrades, large fund allocation >$50K) | 10% circulating | >66% supermajority | 7 days | 7 days |
| Critical (governance rules, token supply) | 15% circulating | >75% supermajority | 14 days | 14 days |

**Proposal threshold:** 0.5% of circulating supply to create proposal, OR 10 unique wallets collectively holding 0.5%.

**Staker voting bonus:** Staked OSR gets 1.5x voting weight (rewards commitment, prevents flash loan attacks).

**Founder veto:** Ashim can veto any single proposal once per calendar year (Years 1-3 only). Veto is public with written justification. Override: same proposal passes again at 80%+ supermajority. Veto right expires after Year 3.

**Anti-manipulation:** Voting snapshot at proposal creation (not vote time). Staking lockup prevents flash loan governance. 0.5% threshold prevents spam.

- **Rationale:** In Year 1, all team/investor tokens are behind cliff locks. Presale buyers control ~87% of votable supply. Community has dominant governance voice from day one — strongest possible trust signal. Community never loses majority even after all vesting completes (400M community vs 220M insider).

---

## DEFERRED DECISIONS

### D-025: Multisig Expansion
- **Status:** DEFERRED to team growth
- **Question:** When CTO/dev hire joins, expand to 2-of-3 multisig. Who are the signers?
- **Trigger:** First technically qualified hire

### D-026: Presale Buyer Vesting
- **Status:** DEFERRED to presale contract design
- **Question:** What vesting terms for presale buyers? Immediate, partial lock, or full vest?
- **Depends on:** D-005 finalization

---

## DECISION INDEX

| # | Topic | Status | Date |
|---|-------|--------|------|
| D-001 | BME token economics | LOCKED | 2026-03-21 |
| D-002 | BVI entity formation | LOCKED | 2026-03-20 |
| D-003 | Devnet development | LOCKED | 2026-03-21 |
| D-004 | Token allocation (77/23) | LOCKED | 2026-03-21 |
| D-005 | Presale price floor ($0.005) | LOCKED | 2026-03-21 |
| D-006 | Vesting schedule | LOCKED | 2026-03-21 |
| D-007 | Compute credit system (USD-pegged, batched) | LOCKED | 2026-03-21 |
| D-008 | Treasury governance (time-lock + oversight) | LOCKED | 2026-03-21 |
| D-009 | Emission schedule (declining, 8yr) | LOCKED | 2026-03-21 |
| D-010 | Fiat for humans, tokens for agents | LOCKED | 2026-03-21 |
| D-011 | Accepted payments (OSR, USDC, USDT, PYUSD) | LOCKED | 2026-03-21 |
| D-012 | OSR holder advantages | LOCKED | 2026-03-21 |
| D-013 | Stablecoin split (~60/40 ops/burn) | LOCKED | 2026-03-21 |
| D-014 | Pricing engine (Pyth, MEV, slippage) | LOCKED | 2026-03-21 |
| D-015 | Two-step USDC separation (VASP compliance) | LOCKED | 2026-03-21 |
| D-016 | Three-fund architecture | LOCKED | 2026-03-21 |
| D-017 | Investor capital return from revenue | LOCKED | 2026-03-21 |
| D-018 | Founder compensation ($4K/mo) | LOCKED | 2026-03-21 |
| D-019 | Operating budget ($14,700/mo) | LOCKED | 2026-03-21 |
| D-020 | Framing discipline | LOCKED | 2026-03-21 |
| D-021 | Security strategy (phased) | LOCKED | 2026-03-21 |
| D-022 | Intercompany agreement (pre-presale) | LOCKED | 2026-03-21 |
| D-023 | Legal opinion (post-presale) | LOCKED | 2026-03-21 |
| D-024 | On-chain governance (Realms) | LOCKED | 2026-03-21 |
| D-025 | Multisig expansion | DEFERRED | — |
| D-026 | Presale buyer vesting | DEFERRED | — |
