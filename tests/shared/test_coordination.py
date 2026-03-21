"""Tests for coordination channel formatting."""

from shared.coordination import Draft, Platform, format_draft


class TestDraftFormatting:
    def test_telegram_draft_format(self):
        draft = Draft(
            platform=Platform.TELEGRAM,
            score=87,
            source="Solana Alpha Hunters (32K members)",
            source_detail="@username (seen in 3 groups)",
            original_message="What infrastructure do AI agents need?",
            suggested_reply="Great question. The key layers are...",
            link="https://t.me/group/123",
        )
        formatted = format_draft(draft)
        assert "TELEGRAM" in formatted
        assert "87/100" in formatted
        assert "Solana Alpha Hunters" in formatted
        assert "Suggested Reply:" in formatted

    def test_x_draft_format(self):
        draft = Draft(
            platform=Platform.X,
            score=92,
            source="@bigtrader (45K followers)",
            source_detail="23 replies, 89 likes",
            original_message="What does an AI agent need to operate autonomously?",
            suggested_reply="Layered execution with risk validation...",
            link="https://x.com/bigtrader/status/123",
        )
        formatted = format_draft(draft)
        assert "X" in formatted
        assert "92/100" in formatted

    def test_long_message_truncated(self):
        draft = Draft(
            platform=Platform.TELEGRAM,
            score=60,
            source="Test Group",
            source_detail="@user",
            original_message="x" * 500,
            suggested_reply="reply",
        )
        formatted = format_draft(draft)
        # Original message should be truncated to 300 chars
        assert len([line for line in formatted.split("\n") if "xxx" in line][0]) <= 310

    def test_no_link_still_formats(self):
        draft = Draft(
            platform=Platform.ONCHAIN,
            score=75,
            source="Wallet Discovery",
            source_detail="Tier 1 wallet",
            original_message="High conviction wallet found",
            suggested_reply="N/A",
        )
        formatted = format_draft(draft)
        assert "ONCHAIN" in formatted
        assert "75/100" in formatted
