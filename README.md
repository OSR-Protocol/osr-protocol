# OSR Protocol

**Compute credits for AI trading agents on Solana.**

[![Solana Mainnet](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana&logoColor=white)](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/OSR-Protocol/osr-protocol)
[![Whitepaper](https://img.shields.io/badge/whitepaper-v1.5-blue)](docs/whitepaper.md)

---

## What is OSR

OSR is a utility token on Solana that powers AI trading agent operations on the
[System R AI](https://agents.systemr.ai) platform. Agents deposit OSR to receive
USD-pegged compute credits, then consume those credits as they call platform tools:
risk engines, position sizing, broker execution, market intelligence, and more.
Every operation has a credit cost. When credits run out, agents deposit more.

The token uses a **Burn and Mint Equilibrium (BME)** model. When agents deposit OSR
directly, the tokens are burned and permanently removed from circulation. When agents
pay with stablecoins (USDC, USDT, PYUSD), the protocol uses that revenue to buy OSR
on the open market and burn it. Either way, every platform operation reduces the
circulating supply. The more agents use the platform, the more tokens get burned.

All 1 billion OSR tokens were minted at launch. No new tokens can ever be created
because mint authority has been permanently revoked. The emission pool releases
pre-minted tokens on a declining schedule over 8 years to stakers and the ecosystem,
but total supply only ever goes down as burns outpace emissions.

OSR is not a governance token. It is not a meme coin. It is a utility token that
meters access to institutional-grade trading infrastructure. The token has one job:
convert into compute credits that agents spend on the platform.

---

## Token Details

| Property | Value |
|---|---|
| Symbol | OSR |
| Name | Operating System R |
| Network | Solana mainnet |
| Mint Address | `E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc` |
| Total Supply | 1,000,000,000 |
| Decimals | 9 |
| Token Program | SPL Token |
| Mint Authority | Revoked (permanent, immutable supply) |
| Freeze Authority | Revoked (permanent) |
| Model | Burn and Mint Equilibrium |
| Issuer | OSR Protocol Inc. (BVI No. 2204362) |

Verify on chain:

```bash
spl-token supply E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc --url mainnet-beta
```

[View on Solscan](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)

---

## How It Works

```
Agent deposits OSR / SOL / USDC / USDT / PYUSD
        |
        v
Platform credits compute (USD-pegged via Pyth oracle)
        |
        v
Agent calls tools (55 tools, 25 brokers)
        |
        v
Compute credits deducted per call
        |
        v
Protocol buys and burns OSR (treasury operation)
```

**Direct OSR deposits:** Tokens are burned immediately. Credits issued at the current
Pyth oracle price.

**Stablecoin deposits:** User pays for platform access (step 1). The protocol handles
buyback and burn as a separate treasury operation (step 2). This two-step separation
keeps the user flow clean and maintains BVI VASP compliance.

**Credit batching:** Agents burn once and receive a batch of credits. This avoids
per-call Solana transaction fees ($0.036) exceeding the cost of micro compute
operations ($0.001).

---

## Presale

| Parameter | Value |
|---|---|
| Dates | March 25 to April 21, 2026 |
| Base price | $0.005 per token |
| Minimum purchase | $549 |
| Maximum per wallet | $25,000 |
| Hard cap | $500,000 |
| Accepted payments | SOL, USDC, USDT, PYUSD |
| Vesting | 20% at TGE, 1 month cliff, 4 months linear |
| Website | [osrprotocol.com](https://osrprotocol.com) |

**Weekly pricing tiers:**

| Week | Dates | Price | Discount |
|---|---|---|---|
| 1 | March 25 to March 31, 2026 | $0.00375 | 25% off |
| 2 | April 1 to April 7, 2026 | $0.00425 | 15% off |
| 3 | April 8 to April 14, 2026 | $0.0045 | 10% off |
| 4 | April 15 to April 21, 2026 | $0.00475 | 5% off |

**Presale buyer benefit:** Every wallet that participates in the presale receives a
**20% permanent discount** on all platform operations, forever. The discount is
verified on chain through presale transaction history. The wallet is the identity.
No codes, no claims, no expiration.

---

## Token Allocation

| Allocation | % | Tokens | Purpose |
|---|---|---|---|
| Emission | 30% | 300,000,000 | BME buyback pool, declining schedule over 8 years |
| Ecosystem | 20% | 200,000,000 | Grants, partnerships, developer incentives |
| Treasury | 12% | 120,000,000 | Strategic reserve, never sold for operations |
| Presale | 10% | 100,000,000 | Public sale (March 25 to April 21, 2026) |
| Ashim Nandi | 7% | 70,000,000 | Founder (1 year cliff, 4 year linear monthly) |
| Shannon | 7% | 70,000,000 | Co-Founder (1 year cliff, 4 year linear monthly) |
| Liquidity | 5% | 50,000,000 | Protocol-owned DEX pools (Raydium, Orca) |
| Jason | 5% | 50,000,000 | Early investor (6 month cliff, 2 year linear, custody) |
| Lynn | 3% | 30,000,000 | Early investor (6 month cliff, 2 year linear, custody) |
| Future Team | 1% | 10,000,000 | Employee vesting (1 year cliff, 3 year linear) |

77% of supply is in protocol working pools. 23% is allocated to the people who built
and funded the project, all locked behind cliff and vesting periods. In Year 1, zero
insider tokens are circulating.

**Vesting summary:**

| Recipient | Cliff | Vesting |
|---|---|---|
| Presale buyers | 1 month | 20% at TGE, 4 months linear |
| Founders | 1 year | 4 years linear monthly |
| Early investors | 6 months | 2 years linear monthly |
| Future team | 1 year | 3 years linear monthly |

---

## Platform

OSR pays for access to [agents.systemr.ai](https://agents.systemr.ai), a complete
trading operating system for AI agents.

**55 MCP tools** across seven categories:

- **Analysis** -- technical indicators, pattern recognition, signal generation
- **Intelligence** -- market news, sentiment, earnings, macro events
- **Risk** -- position sizing, portfolio risk, drawdown limits, kill switch
- **Planning** -- trade planning, strategy backtesting, scenario analysis
- **Data** -- real-time and historical market data across all asset classes
- **ML** -- model training, prediction, feature engineering
- **Memory** -- persistent agent memory, trade journals, learning from outcomes

**25 brokers** across five markets:

- **Traditional** -- equities, options, futures, forex
- **Crypto** -- centralized exchanges, wallet-based execution
- **DeFi** -- on-chain swaps, liquidity provision
- **Prediction markets** -- event-based trading
- **Multi-asset** -- brokers spanning multiple categories

Every tool call costs compute credits. Agents deposit, call tools, and the credits
are deducted per operation. No subscriptions. No plans. Pure pay-as-you-go.

---

## Contracts

| Contract | Address | Tests |
|---|---|---|
| Presale | `9K1VNBCK6WRDVzYbidG4hH9L3crPXxhqvTBACqM5q8bi` | 37 passing |
| Escrow/Vesting | Deployed on mainnet | 13 passing |

Both contracts are written in Rust using the Anchor framework. Under 1,000 lines of
custom Rust each. All audit findings are documented and remediated in
[SECURITY.md](SECURITY.md).

**Security measures:**

- Anchor framework (account validation, signer checks)
- Automated static analysis (Soteria)
- Dependency auditing (cargo audit)
- Fuzz testing (Trdelnik)
- All mainnet operations use Ledger hardware wallets
- No private keys in code or cloud storage
- Mint authority revoked, freeze authority revoked

---

## Repository Structure

```
osr-protocol/
    contracts/
        presale/           Anchor presale program (37 tests)
        escrow/            Anchor vesting and escrow program (13 tests)
    docs/
        whitepaper.md      Full protocol specification
    agents/                Python agents (wallet discovery, social channels)
    dashboard/             Next.js ops dashboard
    scripts/               Token mint, airdrop, messaging utilities
    shared/                Common Python: config, LLM client, DynamoDB helpers
    tests/                 Python unit tests
    keys/                  Allocation proof (no private keys committed)
    infra/                 Cloud resource definitions
    tools/                 Developer tooling
    DECISIONS.md           22 locked design decisions with rationale
    SECURITY.md            Full audit: 42 findings, all remediated
```

---

## Development

### Prerequisites

- Rust (stable)
- Anchor CLI
- Solana CLI
- Node.js 18+
- Python 3.11+

### Build and test the presale contract

```bash
cd contracts/presale
anchor build
anchor test              # 37 tests
```

### Build and test the escrow contract

```bash
cd contracts/escrow
anchor build
anchor test              # 13 tests
```

### Run Python agents and scripts

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.template .env    # fill in API keys
pytest
```

### Run the ops dashboard

```bash
cd dashboard
npm install
npm run dev              # http://localhost:3000
```

### Verify on Solana

```bash
# Check total supply
spl-token supply E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc --url mainnet-beta

# Check presale program
solana program show 9K1VNBCK6WRDVzYbidG4hH9L3crPXxhqvTBACqM5q8bi --url mainnet-beta
```

---

## Team

| | |
|---|---|
| **Ashim Nandi** | Founder. Six years of systematic trading. Built the System R AI platform. |
| **Shannon** | Co-Founder. Protocol architect. Designed BME token economics, treasury, and vesting. |

---

## Links

| | |
|---|---|
| Website | [osrprotocol.com](https://osrprotocol.com) |
| Platform | [agents.systemr.ai](https://agents.systemr.ai) |
| System R AI | [systemr.ai](https://systemr.ai) |
| X | [@OsrProtocol](https://x.com/OsrProtocol) |
| LinkedIn | [osr-protocol-inc](https://linkedin.com/company/osr-protocol-inc) |
| GitHub | [OSR-Protocol](https://github.com/OSR-Protocol) |
| Email | hello@osrprotocol.com |

---

## Legal

Issued by **OSR Protocol Inc.** (BVI No. 2204362)
Intershore Chambers, Road Town, Tortola, British Virgin Islands.

- Terms of Service: [osrprotocol.com/terms.html](https://osrprotocol.com/terms.html)
- Privacy Policy: [osrprotocol.com/privacy.html](https://osrprotocol.com/privacy.html)

This repository and its contents do not constitute an offer, solicitation, or
recommendation to buy or sell any securities or tokens. OSR tokens are utility tokens
that provide access to platform compute services. Participation in the presale is
subject to the terms published at osrprotocol.com. Please review all documentation
and consult legal and financial advisors before participating.
