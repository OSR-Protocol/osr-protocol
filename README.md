# OSR Protocol

**Onchain infrastructure for agentic finance on Solana.**

$OSR is a Burn and Mint Equilibrium (BME) token that meters AI agent operations on the System R AI platform. Users burn $OSR to receive USD pegged compute credits. Agents consume credits as they access compute, language models, cloud infrastructure, risk engines, and the full trading operating system.

Built on Solana. Incorporated in the British Virgin Islands.

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana&logoColor=white)](https://solana.com)
[![License](https://img.shields.io/badge/License-BSL%201.1-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-72%20passing-brightgreen)]()

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
| Devnet Mint | `HBeMPtFD4fFf4otKst3AMvW8E5eJBhB4oqNeNRJneJHB` |
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

## Token Allocation

| Pool | % | Tokens | Vesting |
|------|---|--------|---------|
| BME Emission | 30% | 300,000,000 | Halving schedule over 8 years |
| Ecosystem | 20% | 200,000,000 | Milestone based grants |
| Treasury | 12% | 120,000,000 | Strategic reserve, never sold for operations |
| Presale | 10% | 100,000,000 | Public community sale |
| Founders | 14% | 140,000,000 | 1 year cliff, 4 year linear monthly |
| Early Investors | 8% | 80,000,000 | 6 month cliff, 2 year linear monthly |
| Liquidity | 5% | 50,000,000 | Protocol owned DEX pools |
| Future Team | 1% | 10,000,000 | 1 year cliff, 3 year linear monthly |

77% of supply is in protocol working pools. 23% goes to the people who built and funded the project, all locked behind cliff and vesting periods. In Year 1, zero insider tokens are circulating.

## Architecture

```
osr-protocol/
    agents/                 # 6 monitoring agents (wallet discovery, social, content)
        discovery/          # Solana wallet scanner via Helius RPC
        x/                  # X (Twitter) sentiment monitor
        telegram/           # Telegram group monitor via Telethon
        youtube/            # YouTube content discovery
        linkedin/           # LinkedIn research briefer
        reddit_rss.py       # Reddit RSS content parser
    contracts/              # Anchor programs (Rust) [in development]
        escrow/             # Token escrow for vesting
        presale/            # Presale contract
    dashboard/              # Next.js ops dashboard (6 pages)
    docs/                   # Whitepaper and technical documentation
    infra/                  # AWS DynamoDB table definitions
    keys/                   # Devnet allocation proof (no private keys committed)
    scripts/                # Utility scripts (token mint, auth helpers)
    shared/                 # Common Python modules
        config.py           # Centralized environment loading
        coordination.py     # Telegram coordination channel
        dynamo.py           # DynamoDB helpers (osr_ prefix)
        filters.py          # "So What?" strategic alignment filter
        llm_client.py       # Multi provider LLM client (Claude, GPT, Gemini, DeepSeek)
    tests/                  # 72 unit tests
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
| Governance | Solana Realms, three tier voting | Standard (5% quorum), Major (10%), Critical (15%). Staked tokens get 1.5x voting weight. |
| Emission | Halving schedule, 8 years | 50M/yr years 1 to 2, decreasing. 60% stakers, 30% ecosystem, 10% reserve. |
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

Verify on Solana Explorer: [View Token on Devnet](https://explorer.solana.com/address/HBeMPtFD4fFf4otKst3AMvW8E5eJBhB4oqNeNRJneJHB?cluster=devnet)

## Development

```bash
# Python (agents, scripts, shared)
python -m pytest tests/ -v                    # Run all tests (72 passing)
python -m pytest tests/agents/discovery/ -v   # Discovery agent tests
python -m pytest tests/shared/ -v             # Shared infra tests

# Linting
ruff check agents/ shared/ scripts/           # Python lint
ruff format agents/ shared/ scripts/          # Python format

# Dashboard (Next.js)
cd dashboard && npm install && npm run dev    # Dev server on localhost:3000

# Solana
solana config set --url devnet                # Set to devnet
spl-token supply HBeMPtFD4fFf4otKst3AMvW8E5eJBhB4oqNeNRJneJHB --url devnet  # Check supply
```

## Documentation

| Document | Description |
|----------|-------------|
| [Whitepaper](docs/whitepaper.md) | Full protocol specification, token economics, governance, roadmap |
| [Decisions](DECISIONS.md) | 24 locked decisions with rationale, covering all protocol design choices |
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

## Roadmap

| Phase | Focus |
|-------|-------|
| **Foundation, Launch, User Acquisition** | Token live on mainnet, presale, DEX liquidity, platform accessible, user growth from day one |
| **Traction, Ecosystem, Cross Chain** | Third party agents, ecosystem grants, Solana partnerships, cross chain agent operations |
| **Self Governance, Proprietary Intelligence** | Community governance, proprietary models trained on platform operational data |
| **The New Frontier** | Agentic use cases expanding into compliance, insurance, treasury management, real estate |

Phases are milestone driven, not calendar driven. See the [whitepaper](docs/whitepaper.md) for detailed phase descriptions.

## Entity

**OSR Protocol Inc.** is incorporated in the British Virgin Islands. The BVI entity issues the token and manages protocol operations. Technology is licensed from System R Technologies LLC (Florida) through a written intercompany agreement.

## Contact

| Channel | Link |
|---------|------|
| Website | [osrprotocol.com](https://osrprotocol.com) |
| GitHub | [github.com/OSR-Protocol](https://github.com/OSR-Protocol) |
| Email | dev@osrprotocol.com |

---

**OSR Protocol Inc.**
Intershore Chambers, Road Town, Tortola, British Virgin Islands
