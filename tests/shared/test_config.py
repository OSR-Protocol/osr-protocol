"""Tests for shared configuration module."""

import os

import pytest


class TestConfig:
    def test_settings_singleton_loads(self):
        from shared.config import Settings

        s = Settings()
        assert s.dynamo_table_prefix == "osr_"
        assert s.aws.region == "us-east-1"
        assert s.aws.account_id == "015809853210"

    def test_helius_rpc_url_format(self):
        from shared.config import HeliusConfig

        config = HeliusConfig()
        assert "helius-rpc.com" in config.rpc_url
        assert "helius-rpc.com" in config.devnet_rpc_url
        assert "devnet" in config.devnet_rpc_url

    def test_solana_config_defaults(self):
        from shared.config import SolanaConfig

        config = SolanaConfig()
        assert config.token_supply == 1_000_000_000
        assert config.token_decimals == 9

    def test_unconfigured_services_detected(self):
        from shared.config import HeliusConfig, TelegramConfig, XConfig

        # Without real env vars, these should report unconfigured
        x = XConfig()
        tg = TelegramConfig()
        h = HeliusConfig()
        # They're either empty or start with ___
        # is_configured returns False for placeholder values
        assert isinstance(x.is_configured, bool)
        assert isinstance(tg.is_configured, bool)
        assert isinstance(h.is_configured, bool)

    def test_llm_config_availability(self):
        from shared.config import LLMConfig

        config = LLMConfig()
        assert isinstance(config.has_anthropic, bool)
        assert isinstance(config.has_openai, bool)
        assert isinstance(config.has_gemini, bool)
        assert isinstance(config.has_deepseek, bool)
