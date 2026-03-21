"""Centralized configuration loaded from .env file.

All secrets flow through here. No other module reads .env directly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

_ENV_LOADED = False


def _load_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    _ENV_LOADED = True


def _get(key: str, default: str = "") -> str:
    _load_env()
    return os.getenv(key, default)


def _get_required(key: str) -> str:
    _load_env()
    val = os.getenv(key)
    if not val or val.startswith("___"):
        raise ValueError(f"Missing required env var: {key}. Update .env file.")
    return val


@dataclass(frozen=True)
class XConfig:
    consumer_key: str = field(default_factory=lambda: _get("X_CONSUMER_KEY"))
    consumer_secret: str = field(default_factory=lambda: _get("X_CONSUMER_SECRET"))
    bearer_token: str = field(default_factory=lambda: _get("X_BEARER_TOKEN"))
    access_token: str = field(default_factory=lambda: _get("X_ACCESS_TOKEN"))
    access_token_secret: str = field(default_factory=lambda: _get("X_ACCESS_TOKEN_SECRET"))

    @property
    def is_configured(self) -> bool:
        return bool(self.bearer_token and not self.bearer_token.startswith("___"))


@dataclass(frozen=True)
class TelegramConfig:
    api_id: str = field(default_factory=lambda: _get("TELEGRAM_API_ID"))
    api_hash: str = field(default_factory=lambda: _get("TELEGRAM_API_HASH"))
    phone: str = field(default_factory=lambda: _get("TELEGRAM_PHONE"))
    bot_token: str = field(default_factory=lambda: _get("TELEGRAM_BOT_TOKEN"))
    coordination_channel_id: str = field(default_factory=lambda: _get("TELEGRAM_COORDINATION_CHANNEL_ID"))

    @property
    def is_configured(self) -> bool:
        return bool(self.api_id and not self.api_id.startswith("___"))


@dataclass(frozen=True)
class HeliusConfig:
    api_key: str = field(default_factory=lambda: _get("HELIUS_API_KEY"))
    api_key_secondary: str = field(default_factory=lambda: _get("HELIUS_API_KEY_SECONDARY"))

    @property
    def rpc_url(self) -> str:
        return f"https://mainnet.helius-rpc.com/?api-key={self.api_key}"

    @property
    def devnet_rpc_url(self) -> str:
        return f"https://devnet.helius-rpc.com/?api-key={self.api_key}"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("___"))


@dataclass(frozen=True)
class AWSConfig:
    account_id: str = field(default_factory=lambda: _get("AWS_ACCOUNT_ID", "015809853210"))
    region: str = field(default_factory=lambda: _get("AWS_REGION", "us-east-1"))


@dataclass(frozen=True)
class LLMConfig:
    anthropic_api_key: str = field(default_factory=lambda: _get("ANTHROPIC_API_KEY"))
    openai_api_key: str = field(default_factory=lambda: _get("OPENAI_API_KEY"))
    gemini_api_key: str = field(default_factory=lambda: _get("GEMINI_API_KEY"))
    deepseek_api_key: str = field(default_factory=lambda: _get("DEEPSEEK_API_KEY"))

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key and not self.anthropic_api_key.startswith("___"))

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key and not self.openai_api_key.startswith("___"))

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key and not self.gemini_api_key.startswith("___"))

    @property
    def has_deepseek(self) -> bool:
        return bool(self.deepseek_api_key and not self.deepseek_api_key.startswith("___"))


@dataclass(frozen=True)
class SolanaConfig:
    rpc_url: str = field(default_factory=lambda: _get("SOLANA_RPC_URL"))
    devnet_rpc_url: str = field(default_factory=lambda: _get("SOLANA_DEVNET_RPC_URL"))
    treasury_pubkey: str = field(default_factory=lambda: _get("SOLANA_TREASURY_PUBKEY"))
    operations_pubkey: str = field(default_factory=lambda: _get("SOLANA_OPERATIONS_PUBKEY"))
    token_mint: str = field(default_factory=lambda: _get("OSR_TOKEN_MINT"))
    token_supply: int = 1_000_000_000
    token_decimals: int = 9


@dataclass(frozen=True)
class LinkedInConfig:
    client_id: str = field(default_factory=lambda: _get("LINKEDIN_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _get("LINKEDIN_CLIENT_SECRET"))

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and not self.client_id.startswith("___"))


@dataclass(frozen=True)
class YouTubeConfig:
    api_key: str = field(default_factory=lambda: _get("YOUTUBE_API_KEY"))
    project_id: str = field(default_factory=lambda: _get("YOUTUBE_PROJECT_ID"))

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("___"))


@dataclass(frozen=True)
class SocialConfig:
    reddit_client_id: str = field(default_factory=lambda: _get("REDDIT_CLIENT_ID"))
    reddit_client_secret: str = field(default_factory=lambda: _get("REDDIT_CLIENT_SECRET"))
    reddit_username: str = field(default_factory=lambda: _get("REDDIT_USERNAME"))
    reddit_password: str = field(default_factory=lambda: _get("REDDIT_PASSWORD"))
    reddit_rss_subreddits: str = field(default_factory=lambda: _get(
        "REDDIT_RSS_SUBREDDITS", "solana,algotrading,cryptocurrency,systemtrading"
    ))


@dataclass(frozen=True)
class Settings:
    x: XConfig = field(default_factory=XConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    helius: HeliusConfig = field(default_factory=HeliusConfig)
    aws: AWSConfig = field(default_factory=AWSConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    solana: SolanaConfig = field(default_factory=SolanaConfig)
    social: SocialConfig = field(default_factory=SocialConfig)
    linkedin: LinkedInConfig = field(default_factory=LinkedInConfig)
    youtube: YouTubeConfig = field(default_factory=YouTubeConfig)
    dynamo_table_prefix: str = "osr_"
    environment: str = field(default_factory=lambda: _get("ENVIRONMENT", "development"))


# Singleton — import this everywhere
settings = Settings()
