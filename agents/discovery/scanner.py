"""On-Chain Wallet Discovery Agent — v2.

Find wallets most likely to participate in $OSR presale at $250+ minimum.
Based on Jupiter ($955K qualifying), Drift ($500 min), Jito (9,852 addresses), Parcl criteria.

Goal: 50-100 quality wallets per daily scan. Quality > quantity.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

import structlog

from shared.config import settings
from shared.dynamo import batch_put, now_iso, put_item
from shared.filters import passes_so_what_test_wallet, FilterResult

logger = structlog.get_logger()

# ── Target Programs ─────────────────────────────────────────────────────────

TARGET_PROGRAMS = {
    "Drift": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH",
    "Jupiter": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "Raydium": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "Orca": "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "Marinade": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
    "Parcl": "PARCLo33FGZV7bjiLXPCRmeKBFR2sGW9HBSQAB62qse",
    "Maple": "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K",
    "Tensor": "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
    "MetaDAO": "meta3GsrNmce28LGuzGVGA5ycVNqfYwH2ZDi8oUYZp4",
    "Jito": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    "Marginfi": "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
    "Kamino": "KAMINov7nDHbDaGJCef7S6Y7mBgdB3HFnj1BVZquizp",
}

RWA_TOKEN_MINTS = {
    "USDY": "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
}

AI_AGENT_PROGRAMS = {
    "ElizaOS": "ELZAi16S7VNr5lgKBzFRWaN1p3eeKbhaHRKGMXJnkfu",
    "SolanaAgentKit": "SAKi2gmatHHg6bqBFp73ktw1Ct3Q8YJfXMjq8oQdd1N",
}

# ── Hard Filters ────────────────────────────────────────────────────────────

HARD_FILTERS = {
    "min_sol_balance": 2,
    "min_wallet_age_days": 90,
    "min_unique_protocols": 3,
    "min_transactions_90d": 20,
    "max_failure_rate": 0.50,
    "max_daily_tx_avg": 100,
}

# ── Scoring Model ───────────────────────────────────────────────────────────

SCORING = {
    # Capital signals
    "sol_balance_2_10": 5,
    "sol_balance_10_50": 15,
    "sol_balance_50_200": 25,
    "sol_balance_200_plus": 35,
    # Activity breadth
    "protocols_3_4": 10,
    "protocols_5_plus": 20,
    # Recency
    "active_7_days": 15,
    "active_14_days": 10,
    "active_30_days": 5,
    # DeFi sophistication
    "uses_perpetuals_drift": 15,
    "provides_liquidity": 10,
    "uses_lending": 10,
    "lifetime_volume_800_plus": 10,
    # AI / Agent signals (exact target audience)
    "interacted_solana_agent_kit": 25,
    "interacted_elizaos": 20,
    "holds_ai_agent_tokens": 15,
    # RWA signals
    "holds_rwa_token": 20,
    "interacted_parcl": 15,
    # Prediction market signals
    "uses_drift_bet": 20,
    "uses_metadao_futarchy": 15,
    # Identity signals
    "has_sol_domain": 10,
    "has_backpack_xnft": 10,
    "governance_voter": 15,
    "claimed_previous_airdrop": 10,
    # Cross-chain
    "wormhole_bridge_user": 10,
}


@dataclass
class WalletProfile:
    address: str
    sol_balance: float = 0
    protocols: set[str] = field(default_factory=set)
    defi_categories: set[str] = field(default_factory=set)  # trading, lending, LP, staking, prediction
    ai_protocols: set[str] = field(default_factory=set)
    rwa_holdings: set[str] = field(default_factory=set)
    prediction_markets: set[str] = field(default_factory=set)
    last_active: datetime | None = None
    wallet_age_days: int = 0
    tx_count_90d: int = 0
    failure_rate: float = 0
    daily_tx_avg: float = 0
    has_sol_domain: bool = False
    sol_domain: str = ""
    twitter_handle: str = ""
    has_backpack: bool = False
    is_governance_voter: bool = False
    claimed_airdrop: bool = False
    uses_wormhole: bool = False
    lifetime_swap_volume: float = 0
    is_bot: bool = False


def passes_hard_filters(p: WalletProfile) -> tuple[bool, str]:
    """Check mandatory hard filters. ALL must pass."""
    if p.sol_balance < HARD_FILTERS["min_sol_balance"]:
        return False, f"SOL balance {p.sol_balance:.2f} < {HARD_FILTERS['min_sol_balance']} minimum"
    if p.wallet_age_days < HARD_FILTERS["min_wallet_age_days"]:
        return False, f"Wallet age {p.wallet_age_days}d < {HARD_FILTERS['min_wallet_age_days']}d minimum"
    if len(p.protocols) < HARD_FILTERS["min_unique_protocols"]:
        return False, f"Protocols {len(p.protocols)} < {HARD_FILTERS['min_unique_protocols']} minimum"
    if p.tx_count_90d < HARD_FILTERS["min_transactions_90d"]:
        return False, f"Tx count {p.tx_count_90d} < {HARD_FILTERS['min_transactions_90d']} minimum"
    if p.failure_rate > HARD_FILTERS["max_failure_rate"]:
        return False, f"Failure rate {p.failure_rate:.0%} > {HARD_FILTERS['max_failure_rate']:.0%} max"
    if p.daily_tx_avg > HARD_FILTERS["max_daily_tx_avg"]:
        return False, f"Daily tx avg {p.daily_tx_avg:.0f} > {HARD_FILTERS['max_daily_tx_avg']} max (likely bot)"
    if p.is_bot:
        return False, "Bot pattern detected"
    return True, "Passes all hard filters"


def score_wallet(p: WalletProfile) -> tuple[int, dict[str, int]]:
    """Score a wallet 0-100+ with full breakdown."""
    breakdown: dict[str, int] = {}
    total = 0

    # Capital signals
    if p.sol_balance >= 200:
        breakdown["sol_balance_200_plus"] = 35
    elif p.sol_balance >= 50:
        breakdown["sol_balance_50_200"] = 25
    elif p.sol_balance >= 10:
        breakdown["sol_balance_10_50"] = 15
    elif p.sol_balance >= 2:
        breakdown["sol_balance_2_10"] = 5

    # Protocol breadth
    if len(p.protocols) >= 5:
        breakdown["protocols_5_plus"] = 20
    elif len(p.protocols) >= 3:
        breakdown["protocols_3_4"] = 10

    # Recency
    if p.last_active:
        days = (datetime.now(timezone.utc) - p.last_active).days
        if days <= 7:
            breakdown["active_7_days"] = 15
        elif days <= 14:
            breakdown["active_14_days"] = 10
        elif days <= 30:
            breakdown["active_30_days"] = 5

    # DeFi sophistication
    if "trading" in p.defi_categories and "Drift" in p.protocols:
        breakdown["uses_perpetuals_drift"] = 15
    if "LP" in p.defi_categories:
        breakdown["provides_liquidity"] = 10
    if "lending" in p.defi_categories:
        breakdown["uses_lending"] = 10
    if p.lifetime_swap_volume >= 800:
        breakdown["lifetime_volume_800_plus"] = 10

    # AI / Agent signals — highest value
    if "SolanaAgentKit" in p.ai_protocols:
        breakdown["interacted_solana_agent_kit"] = 25
    if "ElizaOS" in p.ai_protocols:
        breakdown["interacted_elizaos"] = 20

    # RWA signals
    if p.rwa_holdings:
        breakdown["holds_rwa_token"] = 20
    if "Parcl" in p.protocols:
        breakdown["interacted_parcl"] = 15

    # Prediction market signals
    if "prediction" in p.defi_categories:
        if "MetaDAO" in p.protocols:
            breakdown["uses_metadao_futarchy"] = 15

    # Identity signals
    if p.has_sol_domain:
        breakdown["has_sol_domain"] = 10
    if p.has_backpack:
        breakdown["has_backpack_xnft"] = 10
    if p.is_governance_voter:
        breakdown["governance_voter"] = 15
    if p.claimed_airdrop:
        breakdown["claimed_previous_airdrop"] = 10

    # Cross-chain
    if p.uses_wormhole:
        breakdown["wormhole_bridge_user"] = 10

    total = sum(breakdown.values())
    return min(total, 100), breakdown


def assign_tier(score: int) -> int:
    """Tier classification based on score."""
    if score >= 80:
        return 1  # Whitelist + trial token + personalized Dialect
    if score >= 50:
        return 2  # Trial token + standard Dialect
    if score >= 30:
        return 3  # Dialect message only
    return 0  # Discard — do not store


def build_rationale(p: WalletProfile, score: int, breakdown: dict[str, int]) -> str:
    """Build a human-readable rationale string for the wallet."""
    parts = []

    # Capital
    if p.sol_balance >= 200:
        parts.append(f"{p.sol_balance:.0f} SOL whale")
    elif p.sol_balance >= 50:
        parts.append(f"{p.sol_balance:.0f} SOL")
    elif p.sol_balance >= 10:
        parts.append(f"{p.sol_balance:.1f} SOL")
    else:
        parts.append(f"{p.sol_balance:.2f} SOL")

    # Top signals
    if p.ai_protocols:
        parts.append(f"AI agent user ({', '.join(p.ai_protocols)})")
    if p.rwa_holdings:
        parts.append(f"holds {', '.join(p.rwa_holdings)}")
    if "uses_perpetuals_drift" in breakdown:
        parts.append("Drift perp trader")
    if p.is_governance_voter:
        parts.append("governance voter")
    if p.has_sol_domain:
        parts.append(f"SNS: {p.sol_domain}")

    # Activity
    if p.last_active:
        days = (datetime.now(timezone.utc) - p.last_active).days
        parts.append(f"active {days}d ago")

    parts.append(f"{len(p.protocols)} protocols")

    return ", ".join(parts) + f" — {'high' if score >= 80 else 'moderate' if score >= 50 else 'low'} conversion potential for $250+ presale"


async def fetch_wallet_data(address: str) -> WalletProfile:
    """Fetch comprehensive wallet data from Helius."""
    if not settings.helius.is_configured:
        return WalletProfile(address=address)

    import httpx

    profile = WalletProfile(address=address)
    rpc_url = settings.helius.rpc_url

    async with httpx.AsyncClient(timeout=15) as client:
        # Get SOL balance
        resp = await client.post(rpc_url, json={
            "jsonrpc": "2.0", "id": 1,
            "method": "getBalance", "params": [address]
        })
        if resp.status_code == 200:
            lamports = resp.json().get("result", {}).get("value", 0)
            profile.sol_balance = lamports / 1_000_000_000

        # Get recent transactions to determine protocols and activity
        tx_url = f"https://api.helius.xyz/v0/addresses/{address}/transactions"
        params = {"api-key": settings.helius.api_key, "limit": 100}
        resp = await client.get(tx_url, params=params)
        if resp.status_code == 200:
            txns = resp.json()
            profile.tx_count_90d = len(txns)

            # Analyze transactions for protocol interactions
            for txn in txns:
                source = txn.get("source", "")
                txn_type = txn.get("type", "")

                # Map sources to protocol names
                if source == "JUPITER":
                    profile.protocols.add("Jupiter")
                    profile.defi_categories.add("trading")
                elif source == "RAYDIUM":
                    profile.protocols.add("Raydium")
                    profile.defi_categories.add("trading")
                elif source in ("ORCA", "ORCA_WHIRLPOOLS"):
                    profile.protocols.add("Orca")
                    profile.defi_categories.add("trading")
                elif source == "MARINADE":
                    profile.protocols.add("Marinade")
                    profile.defi_categories.add("staking")
                elif source == "DRIFT":
                    profile.protocols.add("Drift")
                    profile.defi_categories.add("trading")

                # Check for LP activity
                if txn_type in ("ADD_LIQUIDITY", "REMOVE_LIQUIDITY"):
                    profile.defi_categories.add("LP")

                # Check for lending
                if source in ("MARGINFI", "KAMINO"):
                    profile.protocols.add(source.title())
                    profile.defi_categories.add("lending")

                # Check for NFT/Tensor
                if source == "TENSOR":
                    profile.protocols.add("Tensor")

            # Determine recency from first tx timestamp
            if txns:
                first_ts = txns[0].get("timestamp", 0)
                if first_ts:
                    profile.last_active = datetime.fromtimestamp(first_ts, tz=timezone.utc)

                # Bot detection: check if too many tx in short period
                if len(txns) >= 100:
                    first = txns[0].get("timestamp", 0)
                    last = txns[-1].get("timestamp", 0)
                    if first and last and (first - last) < 3600:
                        profile.is_bot = True
                    if first and last and (first - last) > 0:
                        span_days = max((first - last) / 86400, 1)
                        profile.daily_tx_avg = len(txns) / span_days

        # Check for token holdings (RWA)
        token_url = f"https://api.helius.xyz/v0/addresses/{address}/balances"
        resp = await client.get(token_url, params={"api-key": settings.helius.api_key})
        if resp.status_code == 200:
            data = resp.json()
            for token in data.get("tokens", []):
                mint = token.get("mint", "")
                if mint in RWA_TOKEN_MINTS.values():
                    rwa_name = next((k for k, v in RWA_TOKEN_MINTS.items() if v == mint), mint[:8])
                    profile.rwa_holdings.add(rwa_name)

    return profile


async def scan_program(program_name: str, program_id: str, *, limit: int = 50) -> list[str]:
    """Fetch unique wallet addresses that interacted with a program."""
    if not settings.helius.is_configured:
        return []

    import httpx

    url = f"https://api.helius.xyz/v0/addresses/{program_id}/transactions"
    params = {"api-key": settings.helius.api_key, "limit": min(limit, 100)}

    wallets: set[str] = set()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            logger.error("helius_error", program=program_name, status=resp.status_code)
            return []
        for txn in resp.json():
            for acct in txn.get("accountData", []):
                addr = acct.get("account", "")
                if addr and addr != program_id and len(addr) > 30:
                    wallets.add(addr)

    logger.info("scanned_program", program=program_name, wallets=len(wallets))
    return list(wallets)


async def run_discovery(
    *,
    programs: list[str] | None = None,
    max_wallets_per_program: int = 50,
    max_total: int = 200,
) -> dict:
    """Run the full discovery pipeline. Returns stats and top wallets."""
    target = programs or ["Drift"]  # Start with one, expand
    all_addresses: set[str] = set()

    # Phase 1: Collect addresses from programs
    for prog_name in target:
        prog_id = TARGET_PROGRAMS.get(prog_name)
        if not prog_id:
            continue
        addrs = await scan_program(prog_name, prog_id, limit=max_wallets_per_program)
        all_addresses.update(addrs)
        if len(all_addresses) >= max_total:
            break

    logger.info("discovery_phase1", unique_addresses=len(all_addresses))

    # Phase 2: Enrich, filter, score
    results = {
        "scanned": len(all_addresses),
        "passed_hard_filter": 0,
        "passed_so_what": 0,
        "tier_1": 0,
        "tier_2": 0,
        "tier_3": 0,
        "discarded": 0,
        "top_wallets": [],
    }

    scored_wallets = []

    for addr in list(all_addresses)[:max_total]:
        profile = await fetch_wallet_data(addr)

        # Hard filter
        passes, reason = passes_hard_filters(profile)
        if not passes:
            results["discarded"] += 1
            continue
        results["passed_hard_filter"] += 1

        # "So What?" test
        swt = passes_so_what_test_wallet(
            sol_balance=profile.sol_balance,
            protocol_count=len(profile.protocols),
            has_ai_interaction=bool(profile.ai_protocols),
            has_rwa_holdings=bool(profile.rwa_holdings),
            has_prediction_market="prediction" in profile.defi_categories,
        )
        if not swt.passes:
            results["discarded"] += 1
            continue
        results["passed_so_what"] += 1

        # Score
        score, breakdown = score_wallet(profile)
        tier = assign_tier(score)
        if tier == 0:
            results["discarded"] += 1
            continue

        rationale = build_rationale(profile, score, breakdown)
        results[f"tier_{tier}"] += 1

        wallet_data = {
            "wallet_address": profile.address,
            "score": score,
            "tier": tier,
            "sol_balance": profile.sol_balance,
            "protocols": list(profile.protocols),
            "defi_categories": list(profile.defi_categories),
            "ai_protocols": list(profile.ai_protocols),
            "rwa_holdings": list(profile.rwa_holdings),
            "prediction_markets": list(profile.prediction_markets),
            "has_sol_domain": profile.has_sol_domain,
            "sol_domain": profile.sol_domain,
            "twitter_handle": profile.twitter_handle,
            "governance_voter": profile.is_governance_voter,
            "last_active": profile.last_active.isoformat() if profile.last_active else "",
            "rationale": rationale,
            "so_what": swt.rationale,
            "breakdown": breakdown,
            "scored_at": now_iso(),
            "airdrop_sent": False,
            "dialect_sent": False,
        }

        scored_wallets.append(wallet_data)

        # Store in DynamoDB
        put_item("wallet_scores", wallet_data)

    # Sort by score desc
    scored_wallets.sort(key=lambda w: w["score"], reverse=True)
    results["top_wallets"] = scored_wallets[:20]

    logger.info("discovery_complete", **{k: v for k, v in results.items() if k != "top_wallets"})
    return results
