"""Tests for X monitor v2."""

from datetime import datetime, timedelta, timezone

from agents.x.monitor import (
    Tweet,
    assign_priority,
    is_excluded,
    keyword_score,
    passes_quality_filter,
    score_tweet,
)


def _tweet(text="test", followers=5000, likes=10, replies=5, age_hours=2, is_retweet=False) -> Tweet:
    return Tweet(
        tweet_id="123", username="test", display_name="Test",
        followers=followers, text=text,
        reply_count=replies, like_count=likes, retweet_count=0,
        created_at=datetime.now(timezone.utc) - timedelta(hours=age_hours),
        is_retweet=is_retweet,
    )


class TestExclude:
    def test_meme_excluded(self):
        assert is_excluded("Check out this pump.fun memecoin")

    def test_normal_passes(self):
        assert not is_excluded("Solana AI agent infrastructure")

    def test_rug_excluded(self):
        assert is_excluded("This token just rugged")


class TestKeywordScoring:
    def test_tier_10_keyword(self):
        score, matched = keyword_score("solana AI agent is the future")
        assert score >= 10
        assert "solana AI agent" in matched

    def test_tier_8_keyword(self):
        score, matched = keyword_score("USDY tokenization on Solana")
        assert score >= 8

    def test_multiple_tiers(self):
        score, matched = keyword_score("solana AI agent with DeFAI infrastructure using USDY")
        assert score >= 18  # At least tier 10 + tier 8

    def test_no_keywords(self):
        score, matched = keyword_score("nice weather today")
        assert score == 0
        assert len(matched) == 0


class TestQualityFilter:
    def test_low_followers_rejected(self):
        t = _tweet(followers=100)
        ok, _ = passes_quality_filter(t)
        assert not ok

    def test_low_engagement_rejected(self):
        t = _tweet(likes=1, replies=0)
        ok, _ = passes_quality_filter(t)
        assert not ok

    def test_old_tweet_rejected(self):
        t = _tweet(age_hours=30)
        ok, _ = passes_quality_filter(t)
        assert not ok

    def test_retweet_rejected(self):
        t = _tweet(is_retweet=True)
        ok, _ = passes_quality_filter(t)
        assert not ok

    def test_valid_passes(self):
        t = _tweet(followers=1000, likes=10, replies=5, age_hours=2)
        ok, _ = passes_quality_filter(t)
        assert ok


class TestPriority:
    def test_high_priority(self):
        t = _tweet(followers=50000)
        assert assign_priority(t) == "HIGH"

    def test_medium_priority(self):
        t = _tweet(followers=5000)
        assert assign_priority(t) == "MEDIUM"

    def test_low_priority(self):
        t = _tweet(followers=200)
        assert assign_priority(t) == "LOW"


class TestScoring:
    def test_excluded_scores_zero(self):
        t = _tweet(text="pump.fun memecoin 100x")
        assert score_tweet(t) == 0

    def test_relevant_high_engagement(self):
        t = _tweet(text="solana AI agent infrastructure is the future of DeFAI",
                   followers=50000, likes=100, replies=30, age_hours=1)
        score = score_tweet(t)
        assert score >= 60

    def test_score_capped(self):
        t = _tweet(text="solana AI agent DeFAI solana USDY RWA solana agent kit",
                   followers=200000, likes=500, replies=100, age_hours=0.5)
        assert score_tweet(t) <= 100
