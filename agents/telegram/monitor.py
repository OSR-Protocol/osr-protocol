"""Telegram Group Monitor Agent — v2.

Monitor where target users gather. Identify community leaders and conversation entry points.
CRITICAL: Agent NEVER posts. Observes, scores, drafts. Human posts manually.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import structlog

from shared.config import settings
from shared.coordination import Draft, Platform, send_draft
from shared.dynamo import get_item, now_iso, put_item, update_item
from shared.filters import passes_so_what_test
from shared.llm_client import LLMTask, complete

logger = structlog.get_logger()

# Same weighted keywords as X Monitor for consistency
KEYWORDS = {
    10: [
        "solana AI agent", "AI agent solana", "DeFAI solana",
        "RWA solana", "tokenized assets solana", "solana agent kit",
        "solana trading agent", "on-chain AI agent",
        "solana prediction market AI", "DeFAI infrastructure",
    ],
    8: [
        "USDY", "OUSG", "BUIDL solana", "tokenized treasury solana",
        "drift protocol AI", "real world asset solana", "DeFAI",
        "solana agent kit plugin", "ElizaOS solana",
        "jupiter polymarket", "drift BET",
    ],
    6: [
        "solana DeFi agent", "on-chain AI", "parcl",
        "Griffain", "TARS AI solana", "Rig framework solana",
        "solana hackathon AI", "colosseum solana AI",
        "superteam AI", "metadao futarchy",
    ],
    4: [
        "tokenized real estate solana", "solana infrastructure AI",
        "solana builder AI", "prediction market agent",
    ],
}

EXCLUDE = [
    "meme coin", "memecoin", "pump.fun", "pump fun", "rug", "rugged",
    "airdrop farming", "free airdrop", "bonk", "wif", "degen",
    "to the moon", "100x", "shitcoin", "presale scam",
    "dog coin", "cat coin", "pepe",
]

TELEGRAM_GROUPS = [
    "@solana", "@DriftProtocol", "@JupiterExchange",
    "@OrcaProtocol", "@RaydiumProtocol",
    "@superteam_uae", "@superteam_india",
]

SCORE_THRESHOLD = 60


@dataclass
class TelegramMessage:
    message_id: int
    group_name: str
    group_id: int
    member_count: int
    username: str
    user_id: int
    text: str
    timestamp: datetime
    is_admin: bool = False
    reply_count: int = 0
    is_forwarded: bool = False


def is_excluded(text: str) -> bool:
    text_lower = text.lower()
    return any(ex in text_lower for ex in EXCLUDE)


def keyword_score(text: str) -> tuple[int, list[str]]:
    text_lower = text.lower()
    total = 0
    matched = []
    for weight, kws in KEYWORDS.items():
        for kw in kws:
            if kw.lower() in text_lower:
                total += weight
                matched.append(kw)
    return total, matched


def passes_quality_filter(msg: TelegramMessage) -> tuple[bool, str]:
    if msg.is_forwarded:
        return False, "Forwarded promotional message"
    age_hours = (datetime.now(timezone.utc) - msg.timestamp).total_seconds() / 3600
    if age_hours > 12:
        return False, f"Too old ({age_hours:.0f}h)"
    if len(msg.text) < 20:
        return False, "Too short"
    return True, "Passes"


def assign_priority(msg: TelegramMessage) -> str:
    if msg.is_admin:
        return "HIGH"
    if msg.reply_count >= 3:
        return "MEDIUM"
    return "LOW"


def score_message(msg: TelegramMessage) -> int:
    if is_excluded(msg.text):
        return 0

    kw_points, _ = keyword_score(msg.text)
    score = min(kw_points, 40)

    # Admin bonus
    if msg.is_admin:
        score += 20

    # Discussion bonus (replies)
    if msg.reply_count >= 5:
        score += 15
    elif msg.reply_count >= 3:
        score += 10

    # Timeliness
    age_hours = (datetime.now(timezone.utc) - msg.timestamp).total_seconds() / 3600
    if age_hours <= 1:
        score += 15
    elif age_hours <= 4:
        score += 10
    elif age_hours <= 12:
        score += 5

    # Substantive message bonus
    if len(msg.text) > 100:
        score += 5

    return min(score, 100)


REPLY_PROMPT = """Drafting reply for Telegram crypto group.

Group: {group_name} ({member_count} members)
Message: "{message_text}"
Poster: {username} {"[ADMIN]" if is_admin else ""}

Rules:
1. Address poster's actual question with genuine knowledge
2. Focus on: systematic trading, risk management, agent infrastructure, RWA, DeFAI
3. Do NOT mention any token ticker, project name, presale, or promotion
4. Educational and value-adding ONLY
5. Under 200 words
6. Match group tone"""


async def draft_reply(msg: TelegramMessage) -> str:
    prompt = REPLY_PROMPT.format(
        group_name=msg.group_name,
        member_count=msg.member_count,
        message_text=msg.text[:500],
        username=msg.username or "Anonymous",
        is_admin=msg.is_admin,
    )
    system = (
        "You are an expert in systematic trading, AI agent infrastructure on Solana, "
        "and real-world asset tokenization. You contribute genuine knowledge. "
        "Never shill or promote. Your replies are thoughtful and invite discussion."
    )
    return await complete(prompt, system=system, task=LLMTask.DRAFT_REPLY, max_tokens=300, temperature=0.7)


async def track_user(msg: TelegramMessage) -> None:
    user_id = str(msg.user_id)
    _, matched = keyword_score(msg.text)
    existing = get_item("telegram_users", {"user_id": user_id})

    if existing:
        groups = set(existing.get("groups_seen_in", set()))
        groups.add(msg.group_name)
        keywords = set(existing.get("keywords_matched", set()))
        keywords.update(matched)
        update_item("telegram_users", {"user_id": user_id}, {
            "username": msg.username or "",
            "groups_seen_in": groups,
            "keywords_matched": keywords,
            "message_count": existing.get("message_count", 0) + 1,
            "last_seen": now_iso(),
        })
    else:
        put_item("telegram_users", {
            "user_id": user_id,
            "username": msg.username or "",
            "groups_seen_in": {msg.group_name},
            "keywords_matched": set(matched),
            "message_count": 1,
            "first_seen": now_iso(),
            "last_seen": now_iso(),
        })


async def process_message(msg: TelegramMessage) -> dict | None:
    if is_excluded(msg.text):
        return None

    passes_qf, qf_reason = passes_quality_filter(msg)
    if not passes_qf:
        return None

    kw_points, matched = keyword_score(msg.text)
    if kw_points == 0:
        return None

    score = score_message(msg)
    if score < SCORE_THRESHOLD:
        return None

    # "So What?" test
    swt = passes_so_what_test(msg.text, source_platform="TELEGRAM")
    if not swt.passes:
        return None

    priority = assign_priority(msg)
    await track_user(msg)

    reply = await draft_reply(msg)

    draft = Draft(
        platform=Platform.TELEGRAM,
        score=score,
        source=f"{msg.group_name} ({msg.member_count} members)",
        source_detail=f"@{msg.username or 'anon'} {'[ADMIN]' if msg.is_admin else ''} | {priority}",
        original_message=msg.text,
        suggested_reply=reply,
        link=f"https://t.me/{msg.group_name.lstrip('@')}/{msg.message_id}" if msg.group_name else "",
        metadata={"priority": priority, "keywords": matched, "so_what": swt.rationale},
    )
    if priority == "HIGH" and score >= 80:
        await send_draft(draft)

    logger.info("telegram_scored", score=score, priority=priority, group=msg.group_name)
    return {"score": score, "priority": priority, "reply": reply, "keywords": matched, "so_what": swt.rationale}


async def start_monitoring() -> None:
    if not settings.telegram.is_configured:
        logger.error("telegram_not_configured")
        return

    from telethon import TelegramClient, events

    client = TelegramClient("osr_monitor", int(settings.telegram.api_id), settings.telegram.api_hash)

    @client.on(events.NewMessage(chats=TELEGRAM_GROUPS))
    async def handler(event):
        msg = TelegramMessage(
            message_id=event.message.id,
            group_name=getattr(event.chat, "title", "Unknown"),
            group_id=event.chat_id,
            member_count=getattr(event.chat, "participants_count", 0) or 0,
            username=getattr(event.sender, "username", "") or "",
            user_id=event.sender_id or 0,
            text=event.message.text or "",
            timestamp=event.message.date.replace(tzinfo=timezone.utc) if event.message.date else datetime.now(timezone.utc),
            is_forwarded=event.message.forward is not None,
        )
        await process_message(msg)

    await client.start(phone=settings.telegram.phone)
    logger.info("telegram_monitor_started", groups=len(TELEGRAM_GROUPS))
    await client.run_until_disconnected()
