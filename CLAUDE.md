# CLAUDE.md — OSR Protocol

## MANDATORY FIRST READ

**Before doing ANY work, read `MISSION.md` in this repo root.** It contains the current milestone, decisions log, and session handoff.

## Project Overview

OSR Protocol is the Solana blockchain economic layer for System R AI. $OSR is an SPL utility token that meters AI agent operations on the platform. This repo contains:

- **agents/** — Python agents (wallet discovery, Telegram, X, LinkedIn)
- **contracts/** — Anchor programs (escrow, presale) in Rust
- **tools/** — Next.js tools site (tools.systemr.ai)
- **scripts/** — Token mint, airdrop, Dialect messaging
- **infra/** — AWS resource definitions (DynamoDB, Lambda, ECS)
- **shared/** — Common Python: config, LLM client, DynamoDB helpers

## Commands

```bash
# Python (agents, scripts, shared)
python -m pytest tests/ -v                    # Run all tests
python -m pytest tests/agents/discovery/ -v   # Discovery agent tests
python -m pytest tests/shared/ -v             # Shared infra tests

# Anchor (contracts)
cd contracts/escrow && anchor test             # Escrow contract tests
cd contracts/presale && anchor test            # Presale contract tests

# Tools site (Next.js)
cd tools && npm run dev                        # Dev server
cd tools && npm run build                      # Production build

# Linting
ruff check agents/ shared/ scripts/            # Python lint
ruff format agents/ shared/ scripts/           # Python format
```

## Architecture Rules

1. **Secrets in .env only** — loaded via `shared/config.py`, never hardcoded
2. **Agents NEVER post** — observe, score, draft. Human posts manually.
3. **Public keys only in code** — private keys stay on Ledger hardware wallet
4. **DynamoDB tables prefixed `osr_`** — avoid collision with System R tables
5. **Claude via Bedrock in production** — direct Anthropic API for dev only
6. **No print()** — use `structlog` for logging
7. **Decimal for money** — all financial values use `decimal.Decimal`

## Entity Context

- Token documentation references **OSR Protocol Inc.** (BVI) only
- **System R Technologies LLC** (Florida) is NEVER mentioned in token docs
- Agent platform is "System R AI" — the technology, not the legal entity

## Security

- .env in .gitignore (verified before first commit)
- Telethon .session files in .gitignore
- All Solana signing through Ledger
- Squads multisig 3-of-5 for treasury operations
- No secrets in logs or error messages

## Key Files

| File | Purpose |
|------|---------|
| shared/config.py | Centralized .env loading + validation |
| shared/llm_client.py | Multi-provider LLM client (Claude, GPT, Gemini, DeepSeek) |
| shared/dynamo.py | DynamoDB helpers with osr_ prefix |
| agents/discovery/scanner.py | Wallet discovery + scoring engine |
| agents/telegram/monitor.py | Telethon group monitor |
| agents/x/monitor.py | X API stream + search monitor |
| scripts/mint_token.py | SPL token mint script |
