"""LinkedIn Daily Briefing Agent — v2.

Build strategic relationships for investment, listings, ecosystem integration,
and Solana Foundation visibility. Does NOT use LinkedIn API.
Uses publicly available info + Claude via Bedrock.
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog

from shared.coordination import Draft, Platform, send_draft
from shared.llm_client import LLMTask, complete

logger = structlog.get_logger()

# Full target list — global, not limited to any region
LINKEDIN_TARGETS = {
    "solana_native": [
        {"firm": "Multicoin Capital", "focus": "Solana-native thesis, led Solana ecosystem"},
        {"firm": "Polychain Capital", "focus": "Solana-native, early infrastructure bets"},
        {"firm": "Colosseum Ventures", "focus": "$250K, Solana-native accelerator"},
        {"firm": "Solana Ventures", "focus": "Official Solana ecosystem fund"},
    ],
    "ai_crypto_vcs": [
        {"firm": "Hack VC", "focus": "Explicit AI+crypto thesis, invested $20M in Theo (trading infra)"},
        {"firm": "Delphi Ventures", "focus": "Runs dAGI Accelerator for crypto×AI"},
        {"firm": "Pantera Capital", "focus": "$6B AUM, raising $1.25B Solana vehicle"},
        {"firm": "Framework Ventures", "focus": "DeFi infrastructure focus"},
        {"firm": "Paradigm", "focus": "Research-driven, DeFi infrastructure"},
        {"firm": "a16z crypto", "focus": "CSX accelerator $500K min"},
        {"firm": "Placeholder", "focus": "Joel Monegro, thesis-driven"},
        {"firm": "Robot Ventures", "focus": "Tarun Chitra, quantitative DeFi"},
    ],
    "mena": [
        {"firm": "Cypher Capital", "focus": "Dubai crypto VC, Solana ecosystem"},
        {"firm": "CoreNest Capital", "focus": "Dubai VC, Web3 and AI infra"},
        {"firm": "CV VC", "focus": "Swiss-Dubai, blockchain focus"},
        {"firm": "Shorooq Partners", "focus": "MENA fintech VC"},
        {"firm": "Ghaf Capital", "focus": "Dubai crypto fund"},
        {"firm": "Hub71", "focus": "Abu Dhabi tech hub, Web3 track"},
    ],
    "india": [
        {"firm": "Hashed Emergent", "focus": "India Web3 fund"},
        {"firm": "Woodstock Fund", "focus": "India blockchain fund"},
        {"firm": "Superteam India", "focus": "Solana ecosystem India"},
    ],
    "exchanges": [
        {"firm": "MEXC Kickstarter", "focus": "Listing program for emerging tokens"},
        {"firm": "Gate.io Startup", "focus": "IEO platform"},
        {"firm": "Bitget Seed", "focus": "Early stage token listing"},
        {"firm": "KuCoin Spotlight", "focus": "New token listing program"},
        {"firm": "Bybit Launchpad", "focus": "Token launch platform"},
        {"firm": "Binance Labs", "focus": "Ecosystem fund + listing path"},
        {"firm": "Coinbase Ventures", "focus": "Strategic investment + listing"},
        {"firm": "OKX Ventures", "focus": "Exchange ecosystem fund"},
    ],
    "market_makers": [
        {"firm": "Kairon Labs", "focus": "Targets emerging tokens"},
        {"firm": "Empirica", "focus": "Targets smaller tokens"},
        {"firm": "Wintermute", "focus": "Aspirational, needs $50M+ FDV"},
    ],
    "ecosystem": [
        {"firm": "Solana Foundation — Lily Liu", "focus": "President, PayFi focus"},
        {"firm": "Solana Foundation — Dan Albert", "focus": "ED, network health"},
        {"firm": "Solana Foundation — Austin Federa", "focus": "Head of Strategy"},
        {"firm": "Alex Scott — Superteam UAE", "focus": "Solana Middle East"},
        {"firm": "Helius — Mert Mumtaz", "focus": "Solana infra, our RPC provider"},
        {"firm": "Jupiter team", "focus": "Top Solana DEX"},
        {"firm": "Drift team", "focus": "Top Solana perps"},
    ],
    "ai_builders": [
        {"firm": "ElizaOS/ai16z team", "focus": "AI agent framework on Solana"},
        {"firm": "SendAI (Solana Agent Kit)", "focus": "Agent kit maintainers"},
        {"firm": "Virtuals Protocol", "focus": "AI agent token ecosystem"},
        {"firm": "Olas Network", "focus": "Prediction market AI agents"},
        {"firm": "Baozi.bet", "focus": "Solana prediction market + AI"},
    ],
    "accelerators": [
        {"firm": "Colosseum", "focus": "$250K, Solana-native"},
        {"firm": "Alliance DAO", "focus": "$500K at $5M, 12 weeks"},
        {"firm": "a16z CSX", "focus": "$500K for 7%, 9 weeks SF"},
        {"firm": "Delphi dAGI Accelerator", "focus": "crypto×AI specific"},
        {"firm": "Solana Labs Incubator NYC", "focus": "Cohort 5 apps May 2026"},
    ],
    "cloud": [
        {"firm": "AWS Community Builders", "focus": "blockchain/AI track"},
        {"firm": "Google Cloud Web3", "focus": "$200K credits program"},
    ],
}


@dataclass
class LinkedInTarget:
    name: str
    title: str
    company: str
    category: str
    relevance: str
    recent_activity: str = ""
    why_they_matter: str = ""
    what_we_offer: str = ""


CONNECTION_PROMPT = """Target: {name}, {title} at {company}
Category: {category}
Recent activity: {activity}
Why they matter: {why}
What we offer them: {offer}

Rules:
1. Reference something specific from their profile or activity
2. State what Ashim builds in one sentence (AI trading infrastructure on Solana)
3. Do NOT pitch, mention token, presale, or token sale
4. Under 300 characters
5. Be genuine, specific, and brief"""

FOLLOWUP_PROMPT = """After {name} at {company} accepted the connection.
Context: {why}
What we offer: {offer}

Rules:
1. Thank briefly for connecting
2. Share ONE specific insight relevant to their work
3. Ask ONE specific question about their focus area
4. Offer to share our work if relevant
5. Under 500 characters
6. No pitch, no token, no presale"""


async def draft_connection_message(target: LinkedInTarget) -> str:
    prompt = CONNECTION_PROMPT.format(
        name=target.name, title=target.title, company=target.company,
        category=target.category,
        activity=target.recent_activity or "No recent activity found",
        why=target.why_they_matter,
        offer=target.what_we_offer or "Trading infrastructure, risk engine, AI agent platform on Solana",
    )
    system = (
        "You draft LinkedIn connection requests for the founder of System R AI, "
        "an AI trading infrastructure company on Solana. Be genuine, specific, brief. "
        "No sales pitch. Start real conversations."
    )
    return await complete(prompt, system=system, task=LLMTask.DRAFT_REPLY, max_tokens=200, temperature=0.7)


async def draft_followup_message(target: LinkedInTarget) -> str:
    prompt = FOLLOWUP_PROMPT.format(
        name=target.name, company=target.company,
        why=target.why_they_matter,
        offer=target.what_we_offer or "Trading infrastructure, risk engine, AI agent platform on Solana",
    )
    system = "You draft follow-up messages after LinkedIn connection acceptance. Genuine, insightful, conversational."
    return await complete(prompt, system=system, task=LLMTask.DRAFT_REPLY, max_tokens=300, temperature=0.7)


async def generate_briefing(targets: list[LinkedInTarget], category: str) -> str:
    parts = [
        f"[LINKEDIN BRIEFING] Category: {category}",
        f"Targets: {len(targets)}",
        "\u2501" * 40,
    ]

    for i, target in enumerate(targets, 1):
        conn_msg = await draft_connection_message(target)
        followup = await draft_followup_message(target)

        parts.extend([
            f"\n{i}. {target.name}",
            f"   {target.title} at {target.company}",
            f"   Category: {target.category}",
            f"   Why They Matter: {target.why_they_matter}",
            f"   What We Offer: {target.what_we_offer}",
            f"   Recent: {target.recent_activity or 'N/A'}",
            f"   Connection: {conn_msg}",
            f"   Follow-up: {followup}",
            "",
        ])

    return "\n".join(parts)


async def send_briefing(targets: list[LinkedInTarget], category: str) -> bool:
    briefing = await generate_briefing(targets, category)
    draft = Draft(
        platform=Platform.LINKEDIN,
        score=0,
        source=f"LinkedIn Briefing — {category}",
        source_detail=f"{len(targets)} targets",
        original_message="",
        suggested_reply=briefing,
    )
    return await send_draft(draft)
