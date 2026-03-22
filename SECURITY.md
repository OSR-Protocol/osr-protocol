# OSR Protocol — Security Audit & Remediation

**Audit Date:** 2026-03-22
**Scope:** Full codebase — presale contract (Rust/Anchor), Python agents, dashboard (Next.js), whitepaper, documentation, repo hygiene
**Findings:** 42 total | 7 Critical | 14 High | 14 Medium | 7 Low

All findings have been remediated. Each fix references the commit hash that resolved it.

---

## Presale Contract (Rust/Anchor)

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| C-1 | CRITICAL | `BuyWithStablecoin.stablecoin_vault` had no constraint validating it matched a configured vault. Attacker could substitute a fake vault, receive real tokens, stablecoins go to throwaway. Fund-draining vulnerability. | FIXED | `661adf8` |
| C-2 | CRITICAL | `WithdrawStablecoin.stablecoin_vault` had identical missing validation. Withdrawal destination not constrained to authority-owned accounts. | FIXED | `661adf8` |
| H-1 | HIGH | No $250 minimum purchase enforcement on SOL buy path. Stablecoin path enforced it, SOL path did not. | FIXED | `661adf8` |
| H-2 | HIGH | No $0.005 floor price validation on SOL buys. Admin-set `sol_price_lamports` had no floor check. | FIXED | `661adf8` |
| H-3 | HIGH | All `.unwrap()` on checked math produced generic panics instead of descriptive errors. | FIXED | `661adf8` |
| H-4 | HIGH | Token vault authority not validated as vault_authority PDA at initialization. Broken state possible. | FIXED | `661adf8` |
| H-5 | HIGH | Stablecoin vault authorities not validated at initialization. Same root cause as H-4. | FIXED | `661adf8` |
| M-1 | MEDIUM | No stablecoin hard cap. SOL path had $500K cap, stablecoin path had none. | FIXED | `661adf8` |
| M-2 | MEDIUM | Mid-presale fund withdrawal allowed. `withdraw_sol` and `withdraw_stablecoin` had no timing/state checks. | FIXED | `661adf8` |
| M-3 | MEDIUM | `init_if_needed` on BuyerRecord with no reinitialization guard. State flag added. | FIXED | `661adf8` |
| M-4 | MEDIUM | No `start_time < end_time` validation in initialize. | FIXED | `661adf8` |
| M-5 | MEDIUM | No `max_per_wallet > 0` validation in initialize. | FIXED | `661adf8` |
| M-6 | MEDIUM | No event emitted from initialize instruction. | FIXED | `661adf8` |
| L-1 | LOW | No `close_presale` instruction for rent recovery. | FIXED | `661adf8` |

## Presale Contract Tests

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| H-6 | HIGH | Zero test coverage for `buy_with_sol`, `buy_with_stablecoin`, withdrawals, and boundary conditions. | FIXED | `4dfe7a7` |

28 tests added covering: initialization (valid + 4 invalid param combinations), admin actions (activate/pause/unauthorized/price updates), buy_with_sol (valid + 7 rejection paths), buy_with_stablecoin (valid USDC + fake vault + 3 rejection paths), withdrawals (active/paused/unauthorized/expired), close_presale (before/after end_time).

## Dashboard Security

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| C-3 | CRITICAL | Plaintext password comparison vulnerable to timing attacks. | FIXED | on disk |
| C-4 | CRITICAL | Hardcoded weak credential `osr-ops-2026`. | FIXED | on disk |
| H-7 | HIGH | Cookie `secure: false` transmits over HTTP. | FIXED | on disk |
| H-8 | HIGH | Fallback secret `'fallback-secret'` defeats auth if env var missing. | FIXED | on disk |
| M-7 | MEDIUM | No login rate limiting. | FIXED | on disk |
| M-8 | MEDIUM | No error handling on frontend fetch calls. | FIXED | on disk |

Dashboard files are in `.gitignore` (internal operational code). Fixes applied locally.

## Whitepaper & Documentation Language

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| H-9 | HIGH | D-020 violation: "value accrues to all remaining holders" in Section 1.3 | FIXED | `18856ac` |
| H-10 | HIGH | D-020 violation: "treasury holdings appreciate" implies investment returns | FIXED | `18856ac` |
| H-11 | HIGH | D-020 violation: "stakeholders benefit when platform grows" — securities language | FIXED | `18856ac` |
| H-12 | HIGH | "Staking yield" framing implies financial returns | FIXED | `18856ac` |
| H-13 | HIGH | "Guaranteed capital return" in Section 5.2 — explicit investment language | FIXED | `18856ac` |
| M-9 | MEDIUM | "Halving schedule" inaccurate — reductions are ~30%, not 50% | FIXED | `18856ac` |

## Documentation Accuracy

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| C-5 | CRITICAL | README references abandoned mint `HBeMPtFD` as current token | FIXED | `9c2fdde` |
| C-6 | CRITICAL | ALLOCATION.md references abandoned mint with wrong supply | FIXED | `9c2fdde` |
| M-10 | MEDIUM | CLAUDE.md claims "3-of-5 multisig" but D-008 says single-operator | FIXED | on disk |
| M-11 | MEDIUM | MISSION.md has stale "DECISION NEEDED" for BME (locked as D-001) | FIXED | on disk |
| L-2 | LOW | .env.template missing 3 environment variables | FIXED | on disk |

## Python Agent Code

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| H-14 | HIGH | `_call_bedrock` synchronous inside async — blocks event loop | FIXED | on disk |
| M-12 | MEDIUM | No error handling in LLM client functions | FIXED | on disk |
| M-13 | MEDIUM | No DynamoDB error handling or pagination | FIXED | on disk |
| M-14 | MEDIUM | Telegram REPLY_PROMPT template bug — `is_admin` never evaluates | FIXED | on disk |
| L-3 | LOW | `print()` used instead of structured logging | FIXED | on disk |
| L-4 | LOW | `float` used for financial values instead of `Decimal` | FIXED | on disk |
| L-5 | LOW | XML bomb risk in Reddit RSS parser | FIXED | on disk |
| L-6 | LOW | Unused dependencies `pydantic` and `tweepy` | FIXED | on disk |
| L-7 | LOW | Duplicated keyword lists across 3 agents | FIXED | on disk |

## Repo Hygiene

| # | Severity | Finding | Status | Commit |
|---|----------|---------|--------|--------|
| C-7 | CRITICAL | Live API keys in `.env` on disk (not tracked — `.gitignore` verified) | MITIGATED | n/a |
| M-15 | MEDIUM | `osr_monitor.session` in repo root (Telegram auth tokens) | MITIGATED | `7ebfaf4` |

Note: C-7 is mitigated by `.gitignore` preventing git tracking. No secrets have ever been committed to git history. For production, migrate to a secrets manager.

---

## Bug Bounty

A formal bug bounty program on Immunefi will be established post-presale per D-021 (Security Strategy). Until then, report security issues to dev@osrprotocol.com.

## Audit Schedule (D-021)

| Phase | Timeline | Scope |
|-------|----------|-------|
| Development (current) | Ongoing | Anchor framework, automated tools, all tests passing |
| Pre-launch | Before presale | Open source contracts, community review, Solana Verify |
| Post-presale | Month 1-3 | Focused audit on presale contract (~800 lines) |
| Post-revenue | Month 6-12 | Full program audit |
