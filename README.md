# OSR Protocol

**Onchain infrastructure for agentic finance on Solana.**

$OSR is a Burn and Mint Equilibrium (BME) token that meters AI agent operations on the System R AI platform. Users burn $OSR to receive USD pegged compute credits. Agents consume credits as they access compute, language models, cloud infrastructure, risk engines, and the full trading operating system.

Built on Solana. Incorporated in the British Virgin Islands.

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana&logoColor=white)](https://solana.com)

---

## Token Details

| Property | Value |
|----------|-------|
| Name | Operating System R |
| Ticker | $OSR |
| Network | Solana |
| Total Supply | 1,000,000,000 (1B) |
| Decimals | 9 |
| Token Program | SPL Token |
| Devnet Mint | `DJXh4DpaXMKsDaLc4TLQbpK4e8EVV5jTUe7vzvDVXa9s` |
| Issuer | OSR Protocol Inc. (BVI) |

## How It Works

```
User acquires $OSR
       |
       v
Burns $OSR for compute credits (USD pegged via Pyth oracle)
       |
       v
Credits consumed as agent uses platform resources
       |
       v
Burned tokens permanently destroyed (circulating supply decreases)
       |
       v
Emission pool releases pre minted tokens to stakers and ecosystem
```

The protocol also accepts USDC, USDT, and PYUSD. Stablecoin payments are received as service payments. The protocol independently handles buyback and burn as a treasury operation.

## Pricing Tiers

Two pricing tiers, both determined entirely by on chain wallet history. Both are pure pay as you go. No plans. No contracts. No caps.

**Tier 1: Presale participants.** Wallets verified on chain through presale transaction history receive a 20% permanent discount on all platform operations. Earned through early participation. The wallet is the identity. The on chain burn history is the loyalty record.

**Tier 2: Regular $OSR holders.** Wallets that acquired $OSR on the open market after launch pay the standard rate with loyalty improvements based on cumulative lifetime burn history:

| Cumulative $OSR Burned | Rate Improvement |
|------------------------|-----------------|
| 0 to 100,000 | Standard rate |
| 100,001 to 500,000 | 5% improvement |
| 500,001 to 1,000,000 | 10% improvement |
| 1,000,001 and above | 15% improvement |

Hold $OSR. Connect wallet. Consume credits for platform operations. Disconnect when finished. Return when ready.

## Token Allocation

| Pool | % | Tokens | Vesting |
|------|---|--------|---------|
| BME Emission | 30% | 300,000,000 | Declining emission schedule over 8 years |
| Ecosystem | 20% | 200,000,000 | Milestone based grants |
| Treasury | 12% | 120,000,000 | Strategic reserve, never sold for operations |
| Presale | 10% | 100,000,000 | 20% TGE, 1 month cliff, 4 month linear |
| Founder | 7% | 70,000,000 | 1 year cliff, 4 year linear monthly |
| Co-Founder | 7% | 70,000,000 | 1 year cliff, 4 year linear monthly |
| Early Investor A | 5% | 50,000,000 | 6 month cliff, 2 year linear monthly |
| Early Investor B | 3% | 30,000,000 | 6 month cliff, 2 year linear monthly |
| Liquidity | 5% | 50,000,000 | Protocol owned DEX pools |
| Future Team | 1% | 10,000,000 | 1 year cliff, 3 year linear monthly |

77% of supply is in protocol working pools. 23% goes to the people who built and funded the project, all locked behind cliff and vesting periods. In Year 1, zero insider tokens are circulating.

## Presale

| Parameter | Value |
|-----------|-------|
| Base listing price | $0.005 per token |
| Minimum purchase | $549 |
| Maximum per wallet | $25,000 |
| Hard cap | $500,000 total raise |
| Accepted payments | SOL, USDC, USDT |

**Four weekly pricing tiers:**

| Week | Dates | Price | Discount |
|------|-------|-------|----------|
| 1 | March 25 — March 31, 2026 | $0.00375 | 25% |
| 2 | April 1 — April 7, 2026 | $0.00425 | 15% |
| 3 | April 8 — April 14, 2026 | $0.0045 | 10% |
| 4 | April 15 — April 21, 2026 | $0.00475 | 5% |

## Vesting

| Recipient | Cliff | Vesting |
|-----------|-------|---------|
| Presale buyers | 1 month | 20% at TGE, 4 month linear |
| Founders | 1 year | 4 year linear monthly |
| Early Investors | 6 months | 2 year linear monthly |
| Future Team | 1 year | 3 year linear monthly |

## Repository Structure

```
osr-protocol/
    agents/                 # Python agents (wallet discovery, Telegram, X, LinkedIn, Reddit, YouTube)
    contracts/              # Anchor programs (Rust) [in development]
        escrow/             # Token escrow for vesting
        presale/            # Presale contract
    dashboard/              # Next.js ops dashboard (localhost:3000)
    docs/                   # Whitepaper and technical documentation
        whitepaper.md       # Full protocol specification
    infra/                  # Cloud resource definitions
    keys/                   # Devnet allocation proof (no private keys committed)
        devnet/ALLOCATION.md
    scripts/                # Token mint, airdrop, Dialect messaging
    shared/                 # Common Python: config, LLM client, DynamoDB helpers
    tests/                  # Python unit tests
    DECISIONS.md            # 22 locked design decisions with rationale (2 deferred)
    README.md               # This file
```

## Key Design Decisions

All decisions are documented in [DECISIONS.md](DECISIONS.md) with rationale. Key highlights:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token model | Burn and Mint Equilibrium | Proven by Helium, Render, Akash for compute metering |
| Credit peg | USD denominated via Pyth oracle | Users need predictable costs regardless of token volatility |
| Credit batching | Burn once, use many | Solana tx fees ($0.036) can exceed micro compute costs ($0.001) |
| Stablecoin flow | Two step separation | User pays for service (step 1), protocol handles buyback and burn (step 2). BVI VASP compliant. |
| Treasury | Three fund architecture | Token treasury ($OSR), operating fund (USDC), strategic reserve (mixed). Prevents death spiral. |
| Governance | Solana Realms, tiered voting | Standard (5% quorum), Major (10%), Critical (15%). Staked tokens get 1.5x voting weight. |
| Emission | Declining schedule, 8 years | 50M/yr years 1 to 2, decreasing. 60% stakers, 30% ecosystem, 10% reserve. |
| Security | Simple contracts, phased audits | Under 1,000 lines custom Rust. Anchor framework. Bug bounty on Immunefi. |
| Mint authority | Revoked after distribution | All 1B tokens pre minted. Emission releases existing tokens, not new minting. |

## Governance

Token holders govern protocol parameters through onchain voting:

| Tier | Quorum | Approval | Voting Period |
|------|--------|----------|---------------|
| Standard (parameter changes) | 5% circulating | Over 50% | 5 days |
| Major (upgrades, large grants) | 10% circulating | Over 66% | 7 days |
| Critical (governance rules) | 15% circulating | Over 75% | 14 days |

Staked $OSR receives 1.5x voting weight. Proposals require 0.5% of circulating supply to create. Community controls governance from day one (all insider tokens locked behind cliff in Year 1).

## Financial Architecture

| Fund | Holds | Purpose |
|------|-------|---------|
| Token Treasury | $OSR only | Strategic partnerships, ecosystem incentives. Never sold for operations. |
| Operating Fund | USDC only | Infrastructure, salaries, legal, marketing. Independent of token price. |
| Strategic Reserve | Mixed | Security audits, legal opinions, emergencies, growth opportunities. |

Treasury operations use tiered time locks with full onchain transparency. Monthly reports published.

## Devnet Deployment

The token is live on Solana devnet with full allocation distributed:

| Pool | Tokens | Token Account |
|------|--------|---------------|
| Emission | 300,000,000 | `DAzSPYwqnK6L35B5BkrS3AKyKB8frS7ZyYeQ1qsAdnyw` |
| Ecosystem | 200,000,000 | `AZSGXjtPu2wL3PCpMogutNd5syzmtYCqUYsGtv5aDb48` |
| Treasury | 120,000,000 | `DfWs7hU5qnPJ7ee7c1dZTqHCzNdt7eodjikC6gHNwwQk` |
| Presale | 100,000,000 | `FkFfMvCRRX1hX6uLXdDntK37mUUEFppiwJRrRGNYYeSq` |
| Founders | 140,000,000 | See [ALLOCATION.md](keys/devnet/ALLOCATION.md) |
| Investors | 80,000,000 | See [ALLOCATION.md](keys/devnet/ALLOCATION.md) |
| Liquidity | 50,000,000 | `GxgFz72g7QxzNeikim2F4uDrdQrWNxvB7ECKWM9yjAKQ` |
| Future Team | 10,000,000 | `EUPy2TWsjvXbjG3j6EVuvFwSg2kj6qtCFG5qae5M8BZd` |

Verify on Solana Explorer: [View Token on Devnet](https://explorer.solana.com/address/DJXh4DpaXMKsDaLc4TLQbpK4e8EVV5jTUe7vzvDVXa9s?cluster=devnet)

## Verify on Solana

```bash
# Check total supply
spl-token supply DJXh4DpaXMKsDaLc4TLQbpK4e8EVV5jTUe7vzvDVXa9s --url devnet

# Check any allocation wallet balance
spl-token balance --address 2vJs6VH6ZC5YyvZrTLiNDzovDegya8eR31e7DuPX2nrD --url devnet
```

## Build

**Python agents and scripts** (requires Python 3.11+):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.template .env   # fill in API keys
pytest
```

**Dashboard** (requires Node.js 18+):

```bash
cd dashboard
npm install
npm run dev              # http://localhost:3000
```

**Presale contract** (requires Rust, Anchor, Solana CLI):

```bash
cd contracts/presale
anchor build
anchor test
```

## Documentation

| Document | Description |
|----------|-------------|
| [Whitepaper](docs/whitepaper.md) | Full protocol specification, token economics, governance, roadmap |
| [Decisions](DECISIONS.md) | 22 locked decisions with rationale (2 deferred), covering all protocol design choices |
| [Allocation Proof](keys/devnet/ALLOCATION.md) | Devnet token distribution with all wallet addresses |
| [Coordination Setup](docs/COORDINATION_CHANNEL_SETUP.md) | Telegram channel security configuration |

## Security

The protocol prioritizes simplicity over complexity.

| Measure | Status |
|---------|--------|
| Anchor framework (account validation, signer checks) | Active |
| Automated static analysis (Soteria) | Active |
| Dependency auditing (cargo audit) | Active |
| Fuzz testing (Trdelnik) | Active |
| Open source contracts | This repository |
| Bug bounty (Immunefi) | Pre launch |
| Focused audit (presale contract) | Post launch |
| Full program audit | Post revenue |
| Mint authority | Revoked after distribution |
| Freeze authority | Revoked at launch |

All mainnet operations use Ledger hardware wallets. No private keys in code or cloud storage.

Security audit findings and status are documented in [SECURITY.md](SECURITY.md).

## Roadmap

| Phase | Focus |
|-------|-------|
| **Foundation, Launch, User Acquisition** | Token live on mainnet, presale, DEX liquidity, platform accessible, user growth from day one |
| **Traction, Ecosystem, Cross Chain** | Third party agents, ecosystem grants, Solana partnerships, cross chain agent operations |
| **Self Governance, Proprietary Intelligence** | Community governance, proprietary models trained on platform operational data |
| **The New Frontier** | Agentic use cases expanding into compliance, insurance, treasury management, real estate |

Phases are milestone driven, not calendar driven. See the [whitepaper](docs/whitepaper.md) for detailed phase descriptions.

## Entity

Issued by OSR Protocol Inc., British Virgin Islands.

## Contact

| Channel | Link |
|---------|------|
| Website | [osrprotocol.com](https://osrprotocol.com) |
| GitHub | [github.com/OSR-Protocol](https://github.com/OSR-Protocol) |
| Email | dev@osrprotocol.com |

---

**OSR Protocol Inc.**
Intershore Chambers, Road Town, Tortola, British Virgin Islands
