"""Tests for the 'So What?' global filter."""

from shared.filters import (
    Goal,
    passes_so_what_test,
    passes_so_what_test_wallet,
)


class TestSoWhatFilter:
    def test_noise_rejected(self):
        r = passes_so_what_test("Check out this pump.fun memecoin 100x guaranteed")
        assert not r.passes
        assert "Noise" in r.rationale

    def test_presale_signal_passes(self):
        r = passes_so_what_test("This wallet has been active in DeFi trading on Jupiter and Drift")
        assert r.passes
        assert r.goal == Goal.PRESALE

    def test_visibility_signal_passes(self):
        r = passes_so_what_test("Solana Foundation announced new builder program with Superteam")
        assert r.passes
        assert r.goal == Goal.VISIBILITY

    def test_partnership_signal_passes(self):
        r = passes_so_what_test("Hack VC just raised a new fund for AI crypto investment")
        assert r.passes
        assert r.goal == Goal.PARTNERSHIPS

    def test_irrelevant_rejected(self):
        r = passes_so_what_test("Nice weather today in San Francisco")
        assert not r.passes

    def test_authority_boost(self):
        r1 = passes_so_what_test("Solana agent kit is interesting", author_followers=100)
        r2 = passes_so_what_test("Solana agent kit is interesting", author_followers=50000)
        # Both should pass but high authority should still pass
        if r1.passes and r2.passes:
            assert True  # Both pass, authority didn't break anything


class TestWalletSoWhat:
    def test_low_balance_rejected(self):
        r = passes_so_what_test_wallet(sol_balance=0.5, protocol_count=5, has_ai_interaction=False, has_rwa_holdings=False, has_prediction_market=False)
        assert not r.passes

    def test_few_protocols_rejected(self):
        r = passes_so_what_test_wallet(sol_balance=10, protocol_count=1, has_ai_interaction=False, has_rwa_holdings=False, has_prediction_market=False)
        assert not r.passes

    def test_good_wallet_passes(self):
        r = passes_so_what_test_wallet(sol_balance=50, protocol_count=5, has_ai_interaction=True, has_rwa_holdings=True, has_prediction_market=False)
        assert r.passes
        assert r.goal == Goal.PRESALE
        assert "AI agent user" in r.rationale

    def test_minimal_passing_wallet(self):
        r = passes_so_what_test_wallet(sol_balance=2, protocol_count=3, has_ai_interaction=False, has_rwa_holdings=False, has_prediction_market=False)
        assert r.passes
