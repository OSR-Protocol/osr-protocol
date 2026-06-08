# OSR Protocol

OSR Protocol is a Solana-based utility protocol for compute-credit access across supported agentic finance infrastructure.

[![Solana Mainnet](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana&logoColor=white)](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)
[![Website](https://img.shields.io/badge/website-osrprotocol.com-5fd69a)](https://osrprotocol.com/)

## What this repository contains

This repository contains protocol source code, token references, contract history, and supporting materials for OSR Protocol.

Contract names, source-code paths, and historical identifiers may remain in the codebase where changing them would break technical history or deployed references. Public-facing language should use the current OSR Protocol positioning.

## Token reference

| Property | Value |
|---|---|
| Symbol | OSR |
| Network | Solana mainnet |
| Mint address | `E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc` |
| Token program | SPL Token |
| Mint authority | Revoked |
| Freeze authority | Revoked |
| Issuer | OSR Protocol Inc. |

Verify on chain:

```bash
spl-token supply E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc --url mainnet-beta
```

[View OSR on Solscan](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)

## Utility focus

OSR is designed for compute-credit access where OSR utility is enabled. The protocol website explains the current public sale interface, accepted payment assets, token facts, and participation boundaries.

Current public pages:

- OSR website: https://osrprotocol.com/
- Whitepaper: https://osrprotocol.com/whitepaper
- Transparency: https://osrprotocol.com/transparency
- About: https://osrprotocol.com/about

## Relationship to System R AI

System R AI is the first supported product surface for OSR compute-credit utility. System R AI is a decision intelligence system for trading and investing, while OSR remains the protocol and token layer for access, settlement, and onchain participation.

## Development

### Prerequisites

- Rust
- Anchor CLI
- Solana CLI
- Node.js
- Python 3.11+

### Build and test

Use the contract and package folders in this repository for local development. Avoid changing deployed contract identifiers unless the change has been explicitly approved.

```bash
pytest
```

## Boundaries

OSR Protocol is not a broker, investment adviser, signal service, or promise of returns. It does not execute trades for users. Users remain responsible for their own trading and investing decisions.

This repository is for informational and development purposes. It is not trading or investment guidance, a return guarantee, a broker service, or a signal service.
