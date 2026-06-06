# OSR Protocol

OSR Protocol is an onchain compute credit and settlement subproject connected to System R AI.

System R AI is a decision intelligence system for trading and investing. OSR is not the primary System R product, and System R should not be described with retired product-category language.

[![Solana Mainnet](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana&logoColor=white)](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/OSR-Protocol/osr-protocol)

## Relationship to System R AI

System R AI has two main product layers:

1. Agentic Trading Workspace
For active traders to research, plan, journal, and review decisions.

2. API Toolkit
Finance tools for agents, Python workflows, notebooks, and backend services.

OSR Protocol may support compute credit and settlement research around these workflows.

## What this repository contains

This repository contains protocol source code, contract history, security notes, and supporting materials for OSR Protocol. Legacy contract documentation is included for repository history. It is not current System R AI product positioning.

Contract names, source-code paths, and historical identifiers may remain in the codebase where changing them would break technical history or deployed contract references. Public product language should use OSR Protocol and System R AI's current positioning.

## Token reference

| Property | Value |
|---|---|
| Symbol | OSR |
| Network | Solana mainnet |
| Mint Address | `E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc` |
| Token Program | SPL Token |
| Mint Authority | Permanently revoked |
| Freeze Authority | Permanently revoked |
| Issuer | OSR Protocol Inc. |

Verify on chain:

```bash
spl-token supply E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc --url mainnet-beta
```

[View on Solscan](https://solscan.io/token/E2grvu8fyeeuVaxj2DrHVBqv8j21jK3vyJpXG8FJjJNc)

## System R AI context

System R AI is the primary product company. The public product architecture is:

- Agentic Trading Workspace: for active traders to research, plan, journal, and review decisions.
- API Toolkit: finance tools for agents, Python workflows, notebooks, and backend services.

Current API Toolkit capabilities are described in the docs and machine readable agent metadata. Developers should use the documented MCP, SDK, REST, and OpenAPI surfaces that are live and valid.

## Trust boundary

System R AI is software for decision support.
It is not financial advice.
It is not a broker.
It is not a signal service.
It does not guarantee profits.
AI outputs can be wrong.
Users remain responsible for their own trading and investing decisions.

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

## Links

| | |
|---|---|
| OSR Protocol website | [osrprotocol.com](https://osrprotocol.com) |
| System R AI | [systemr.ai](https://systemr.ai) |
| System R Docs | [docs.systemr.ai](https://docs.systemr.ai) |
| System R Agents | [agents.systemr.ai](https://agents.systemr.ai) |
| GitHub | [OSR-Protocol](https://github.com/OSR-Protocol) |

## Legal

Issued by OSR Protocol Inc.

This repository is for informational and development purposes. It is not investment advice, financial advice, a profit guarantee, a broker service, or a signal service.
