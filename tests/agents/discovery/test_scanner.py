"""Tests for wallet discovery scanner v2."""

from datetime import datetime, timedelta, timezone

import pytest

from agents.discovery.scanner import (
    WalletProfile,
    assign_tier,
    build_rationale,
    passes_hard_filters,
    score_wallet,
)


def _profile(**kwargs) -> WalletProfile:
    defaults = {
        "address": "test",
        "sol_balance": 10,
        "protocols": {"Jupiter", "Raydium", "Drift"},
        "defi_categories": {"trading"},
        "tx_count_90d": 50,
        "wallet_age_days": 120,
        "last_active": datetime.now(timezone.utc),
    }
    defaults.update(kwargs)
    return WalletProfile(**defaults)


class TestHardFilters:
    def test_low_balance_fails(self):
        p = _profile(sol_balance=1)
        ok, reason = passes_hard_filters(p)
        assert not ok
        assert "balance" in reason.lower()

    def test_young_wallet_fails(self):
        p = _profile(wallet_age_days=30)
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_few_protocols_fails(self):
        p = _profile(protocols={"Jupiter"})
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_low_tx_fails(self):
        p = _profile(tx_count_90d=5)
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_high_failure_rate_fails(self):
        p = _profile(failure_rate=0.6)
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_bot_fails(self):
        p = _profile(daily_tx_avg=200)
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_is_bot_flag_fails(self):
        p = _profile(is_bot=True)
        ok, reason = passes_hard_filters(p)
        assert not ok

    def test_valid_profile_passes(self):
        p = _profile()
        ok, reason = passes_hard_filters(p)
        assert ok


class TestScoring:
    def test_empty_profile_scores_low(self):
        p = WalletProfile(address="empty", sol_balance=2, protocols={"a", "b", "c"})
        score, _ = score_wallet(p)
        assert score < 30

    def test_whale_scores_high(self):
        p = _profile(
            sol_balance=400,
            protocols={"Jupiter", "Raydium", "Drift", "Orca", "Marinade"},
            ai_protocols={"ElizaOS", "SolanaAgentKit"},
            rwa_holdings={"USDY"},
            defi_categories={"trading", "LP", "lending"},
            has_sol_domain=True,
            is_governance_voter=True,
            last_active=datetime.now(timezone.utc),
        )
        score, breakdown = score_wallet(p)
        assert score >= 80
        assert "sol_balance_200_plus" in breakdown
        assert "interacted_elizaos" in breakdown

    def test_capital_tiers(self):
        p2 = _profile(sol_balance=5)
        p10 = _profile(sol_balance=15)
        p50 = _profile(sol_balance=75)
        p200 = _profile(sol_balance=250)
        s2, _ = score_wallet(p2)
        s10, _ = score_wallet(p10)
        s50, _ = score_wallet(p50)
        s200, _ = score_wallet(p200)
        assert s2 < s10 < s50 < s200

    def test_ai_protocols_high_value(self):
        p_no_ai = _profile()
        p_ai = _profile(ai_protocols={"SolanaAgentKit"})
        s_no, _ = score_wallet(p_no_ai)
        s_ai, _ = score_wallet(p_ai)
        assert s_ai >= s_no + 25

    def test_rwa_holder_bonus(self):
        p_no = _profile()
        p_rwa = _profile(rwa_holdings={"USDY"})
        s_no, _ = score_wallet(p_no)
        s_rwa, _ = score_wallet(p_rwa)
        assert s_rwa > s_no

    def test_governance_voter_bonus(self):
        p = _profile(is_governance_voter=True)
        _, breakdown = score_wallet(p)
        assert "governance_voter" in breakdown

    def test_score_capped_at_100(self):
        p = _profile(
            sol_balance=500,
            protocols=set(f"p{i}" for i in range(10)),
            ai_protocols={"ElizaOS", "SolanaAgentKit"},
            rwa_holdings={"USDY"},
            defi_categories={"trading", "LP", "lending", "prediction"},
            has_sol_domain=True,
            has_backpack=True,
            is_governance_voter=True,
            claimed_airdrop=True,
            uses_wormhole=True,
            lifetime_swap_volume=1000,
            last_active=datetime.now(timezone.utc),
        )
        score, _ = score_wallet(p)
        assert score <= 100


class TestTierAssignment:
    def test_tier_1(self):
        assert assign_tier(80) == 1
        assert assign_tier(100) == 1

    def test_tier_2(self):
        assert assign_tier(50) == 2
        assert assign_tier(79) == 2

    def test_tier_3(self):
        assert assign_tier(30) == 3
        assert assign_tier(49) == 3

    def test_discard(self):
        assert assign_tier(0) == 0
        assert assign_tier(29) == 0


class TestRationale:
    def test_rationale_includes_balance(self):
        p = _profile(sol_balance=400)
        score, breakdown = score_wallet(p)
        r = build_rationale(p, score, breakdown)
        assert "400 SOL" in r

    def test_rationale_includes_ai(self):
        p = _profile(ai_protocols={"ElizaOS"})
        score, breakdown = score_wallet(p)
        r = build_rationale(p, score, breakdown)
        assert "AI agent" in r
        assert "ElizaOS" in r
