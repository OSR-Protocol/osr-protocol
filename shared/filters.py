"""Global "So What?" filter — every agent output must pass this.

Three goals:
  (a) Presale pipeline — Find wallets likely to participate at $250+
  (b) Ecosystem visibility — Get noticed by Solana Foundation, Superteam, protocols, VCs, builders
  (c) Partnerships & investment — Funding, grants, accelerators, strategic partnerships

If an item doesn't advance at least one goal, it's discarded silently.
50 quality items/day > 500 noise.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Goal(str, Enum):
    PRESALE = "presale_pipeline"
    VISIBILITY = "ecosystem_visibility"
    PARTNERSHIPS = "partnerships_investment"


@dataclass
class FilterResult:
    passes: bool
    goal: Goal | None
    rationale: str


# Signals that map to each goal
PRESALE_SIGNALS = [
    "wallet", "presale", "airdrop", "token sale", "whitelist",
    "sol balance", "defi", "trading", "swap", "liquidity",
    "prediction market", "drift", "jupiter", "raydium",
    "rwa", "usdy", "ousg", "buidl", "ai agent",
]

VISIBILITY_SIGNALS = [
    "solana foundation", "superteam", "ecosystem", "hackathon",
    "colosseum", "breakpoint", "solana agent kit", "elizaos",
    "builder", "infrastructure", "developer", "protocol team",
    "open source", "github", "tutorial", "guide",
    "defai", "rwa solana", "prediction market",
]

PARTNERSHIP_SIGNALS = [
    "vc", "venture", "funding", "investment", "grant",
    "accelerator", "incubator", "listing", "exchange",
    "market maker", "partnership", "integration",
    "a16z", "multicoin", "polychain", "paradigm", "pantera",
    "hack vc", "delphi", "framework", "alliance dao",
    "collaboration", "sponsor",
]

# Hard exclude — noise that never passes
NOISE_SIGNALS = [
    "meme coin", "memecoin", "pump.fun", "pump fun", "rug", "rugged",
    "airdrop farming", "free airdrop", "bonk", "wif", "degen",
    "to the moon", "100x", "shitcoin", "presale scam",
    "dog coin", "cat coin", "pepe", "wen pump", "moon",
    "price prediction", "crypto signal", "guaranteed profit",
]


def passes_so_what_test(
    text: str,
    *,
    source_platform: str = "",
    author_followers: int = 0,
    score: int = 0,
) -> FilterResult:
    """Every agent item must pass this before appearing in dashboard or coordination channel.

    Returns FilterResult with passes=True/False and a one-line rationale.
    """
    text_lower = text.lower()

    # Hard exclude — noise never passes
    for noise in NOISE_SIGNALS:
        if noise in text_lower:
            return FilterResult(
                passes=False,
                goal=None,
                rationale=f"Noise filter: matched '{noise}'",
            )

    # Check each goal
    presale_hits = sum(1 for s in PRESALE_SIGNALS if s in text_lower)
    visibility_hits = sum(1 for s in VISIBILITY_SIGNALS if s in text_lower)
    partnership_hits = sum(1 for s in PARTNERSHIP_SIGNALS if s in text_lower)

    # Boost for high-authority sources
    authority_bonus = 0
    if author_followers >= 10000:
        authority_bonus = 2
    elif author_followers >= 1000:
        authority_bonus = 1

    presale_hits += authority_bonus if presale_hits > 0 else 0
    visibility_hits += authority_bonus if visibility_hits > 0 else 0
    partnership_hits += authority_bonus if partnership_hits > 0 else 0

    # Determine strongest goal match
    best_goal = None
    best_hits = 0
    best_rationale = ""

    if presale_hits > best_hits:
        best_goal = Goal.PRESALE
        best_hits = presale_hits
        best_rationale = "Advances presale pipeline"

    if visibility_hits > best_hits:
        best_goal = Goal.VISIBILITY
        best_hits = visibility_hits
        best_rationale = "Advances ecosystem visibility"

    if partnership_hits > best_hits:
        best_goal = Goal.PARTNERSHIPS
        best_hits = partnership_hits
        best_rationale = "Advances partnerships/investment"

    # Must have at least 1 signal hit to pass
    if best_hits < 1:
        return FilterResult(
            passes=False,
            goal=None,
            rationale="No strategic goal alignment — discarded",
        )

    return FilterResult(
        passes=True,
        goal=best_goal,
        rationale=best_rationale,
    )


def passes_so_what_test_wallet(
    *,
    sol_balance: float,
    protocol_count: int,
    has_ai_interaction: bool,
    has_rwa_holdings: bool,
    has_prediction_market: bool,
) -> FilterResult:
    """Wallet-specific "So What?" test — does this wallet advance presale pipeline?"""
    if sol_balance < 2:
        return FilterResult(False, None, "Balance too low for $250 presale participation")

    if protocol_count < 3:
        return FilterResult(False, None, "Too few protocols — likely not sophisticated enough")

    rationale_parts = [f"{sol_balance:.1f} SOL"]
    if has_ai_interaction:
        rationale_parts.append("AI agent user")
    if has_rwa_holdings:
        rationale_parts.append("RWA holder")
    if has_prediction_market:
        rationale_parts.append("prediction market trader")
    rationale_parts.append(f"{protocol_count} protocols")

    return FilterResult(
        passes=True,
        goal=Goal.PRESALE,
        rationale=f"Presale candidate: {', '.join(rationale_parts)}",
    )
