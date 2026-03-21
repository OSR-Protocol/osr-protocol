"""Tests for Telegram monitor v2."""

from datetime import datetime, timedelta, timezone

from agents.telegram.monitor import (
    TelegramMessage,
    assign_priority,
    is_excluded,
    keyword_score,
    passes_quality_filter,
    score_message,
)


def _msg(text="test", age_hours=1, is_admin=False, reply_count=0, is_forwarded=False) -> TelegramMessage:
    return TelegramMessage(
        message_id=1, group_name="TestGroup", group_id=123,
        member_count=10000, username="user", user_id=456,
        text=text,
        timestamp=datetime.now(timezone.utc) - timedelta(hours=age_hours),
        is_admin=is_admin, reply_count=reply_count, is_forwarded=is_forwarded,
    )


class TestExclude:
    def test_meme_excluded(self):
        assert is_excluded("Check this memecoin on pump.fun")

    def test_normal_passes(self):
        assert not is_excluded("How does DeFAI infrastructure work on Solana?")


class TestKeywords:
    def test_tier_10_match(self):
        score, matched = keyword_score("solana AI agent for trading")
        assert score >= 10

    def test_no_match(self):
        score, matched = keyword_score("nice weather")
        assert score == 0


class TestQualityFilter:
    def test_forwarded_rejected(self):
        m = _msg(is_forwarded=True)
        ok, _ = passes_quality_filter(m)
        assert not ok

    def test_old_rejected(self):
        m = _msg(age_hours=15)
        ok, _ = passes_quality_filter(m)
        assert not ok

    def test_short_rejected(self):
        m = _msg(text="hi")
        ok, _ = passes_quality_filter(m)
        assert not ok

    def test_valid_passes(self):
        m = _msg(text="How does the Solana agent kit work for trading?")
        ok, _ = passes_quality_filter(m)
        assert ok


class TestPriority:
    def test_admin_high(self):
        m = _msg(is_admin=True)
        assert assign_priority(m) == "HIGH"

    def test_discussion_medium(self):
        m = _msg(reply_count=5)
        assert assign_priority(m) == "MEDIUM"

    def test_default_low(self):
        m = _msg()
        assert assign_priority(m) == "LOW"


class TestScoring:
    def test_excluded_zero(self):
        m = _msg(text="memecoin pump.fun 100x")
        assert score_message(m) == 0

    def test_admin_relevant_high(self):
        m = _msg(text="solana AI agent infrastructure for DeFAI is evolving fast",
                 is_admin=True, reply_count=5, age_hours=0.5)
        score = score_message(m)
        assert score >= 50

    def test_capped_at_100(self):
        m = _msg(text="solana AI agent DeFAI USDY RWA solana agent kit ElizaOS",
                 is_admin=True, reply_count=10, age_hours=0.1)
        assert score_message(m) <= 100
