"""Coordination channel — sends all agent drafts to a private Telegram channel.

All agents output here. Ashim reviews 3x daily.
Format is standardized across all agents.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

import structlog

from shared.config import settings

logger = structlog.get_logger()


class Platform(str, Enum):
    TELEGRAM = "TELEGRAM"
    X = "X"
    LINKEDIN = "LINKEDIN"
    ONCHAIN = "ONCHAIN"


PLATFORM_EMOJI = {
    Platform.TELEGRAM: "\U0001f535",  # 🔵
    Platform.X: "\U0001f426",  # 🐦
    Platform.LINKEDIN: "\U0001f4bc",  # 💼
    Platform.ONCHAIN: "\u26d3\ufe0f",  # ⛓️
}


@dataclass
class Draft:
    platform: Platform
    score: int
    source: str
    source_detail: str
    original_message: str
    suggested_reply: str
    link: str = ""
    metadata: dict | None = None


def format_draft(draft: Draft) -> str:
    """Format a draft for the coordination channel."""
    emoji = PLATFORM_EMOJI.get(draft.platform, "")
    now = datetime.now(timezone.utc).strftime("%H:%M UTC")
    lines = [
        f"{emoji} {draft.platform.value} | Score: {draft.score}/100",
        f"{draft.source}",
        f"{draft.source_detail}",
        f'"{draft.original_message[:300]}"',
        "\u2501" * 20,
        f"Suggested Reply: {draft.suggested_reply}",
        "\u2501" * 20,
    ]
    if draft.link:
        lines.append(f"\U0001f517 {draft.link} \u23f0 {now}")
    return "\n".join(lines)


async def send_draft(draft: Draft) -> bool:
    """Send a formatted draft to the Telegram coordination channel."""
    if not settings.telegram.bot_token or settings.telegram.bot_token.startswith("___"):
        logger.warning("coordination_skip", reason="Telegram bot token not configured")
        return False

    if not settings.telegram.coordination_channel_id or settings.telegram.coordination_channel_id.startswith("___"):
        logger.warning("coordination_skip", reason="Coordination channel ID not configured")
        return False

    import httpx

    message = format_draft(draft)
    url = f"https://api.telegram.org/bot{settings.telegram.bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram.coordination_channel_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        if response.status_code == 200:
            logger.info("coordination_sent", platform=draft.platform.value, score=draft.score)
            return True
        else:
            logger.error("coordination_failed", status=response.status_code, body=response.text)
            return False
