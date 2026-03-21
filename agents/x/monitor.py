"""X (Twitter) Monitor Agent — v2.

Find conversations where System R AI adds genuine value.
Build @systemr_ai presence in Solana AI/RWA/DeFAI circles.

CRITICAL: Agent NEVER posts. Human posts from @systemr_ai and personal account.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import structlog

from shared.config import settings
from shared.coordination import Draft, Platform, send_draft
from shared.dynamo import now_iso, put_item
from shared.filters import passes_so_what_test
from shared.llm_client import LLMTask, complete

logger = structlog.get_logger()

# Weighted keywords — score is sum of matched tier values
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
        "baozi solana", "solana RWA dashboard",
    ],
}

EXCLUDE = [
    "meme coin", "memecoin", "pump.fun", "pump fun", "rug", "rugged",
    "airdrop farming", "free airdrop", "bonk", "wif", "degen",
    "to the moon", "100x", "shitcoin", "presale scam",
    "dog coin", "cat coin", "pepe",
]

SCORE_THRESHOLD = 65


@dataclass
class Tweet:
    tweet_id: str
    username: str
    display_name: str
    followers: int
    text: str
    reply_count: int
    like_count: int
    retweet_count: int
    created_at: datetime
    is_retweet: bool = False


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


def passes_quality_filter(tweet: Tweet) -> tuple[bool, str]:
    if tweet.followers < 500:
        return False, f"Followers {tweet.followers} < 500"
    if tweet.like_count < 5 and tweet.reply_count < 3:
        return False, "Low engagement (< 5 likes AND < 3 replies)"
    age_hours = (datetime.now(timezone.utc) - tweet.created_at).total_seconds() / 3600
    if age_hours > 24:
        return False, f"Too old ({age_hours:.0f}h)"
    if tweet.is_retweet:
        return False, "Retweet-only"
    return True, "Passes quality filter"


def assign_priority(tweet: Tweet) -> str:
    if tweet.followers >= 10000:
        return "HIGH"
    if tweet.followers >= 1000:
        return "MEDIUM"
    return "LOW"


def score_tweet(tweet: Tweet) -> int:
    if is_excluded(tweet.text):
        return 0

    kw_score, _ = keyword_score(tweet.text)
    score = min(kw_score, 40)

    # Audience
    if tweet.followers >= 100_000:
        score += 20
    elif tweet.followers >= 50_000:
        score += 16
    elif tweet.followers >= 10_000:
        score += 12
    elif tweet.followers >= 1_000:
        score += 8

    # Engagement
    engagement = tweet.reply_count + tweet.like_count + tweet.retweet_count
    if engagement >= 100:
        score += 20
    elif engagement >= 50:
        score += 15
    elif engagement >= 20:
        score += 10
    elif engagement >= 5:
        score += 5

    # Timeliness
    age_hours = (datetime.now(timezone.utc) - tweet.created_at).total_seconds() / 3600
    if age_hours <= 1:
        score += 20
    elif age_hours <= 4:
        score += 15
    elif age_hours <= 12:
        score += 10
    elif age_hours <= 24:
        score += 5

    return min(score, 100)


REPLY_PROMPT = """Context:
- Poster: @{username} ({followers} followers)
- Post: "{tweet_text}"
- Engagement: {replies} replies, {likes} likes

Rules:
1. Address point with substance
2. Reference: layered execution, risk validation, behavioral memory, agent infrastructure
3. Do NOT mention $OSR, System R, presale, or any token
4. Match technical level
5. Under 280 characters
6. Make reader check profile"""


async def draft_reply(tweet: Tweet) -> str:
    prompt = REPLY_PROMPT.format(
        username=tweet.username,
        followers=f"{tweet.followers:,}",
        tweet_text=tweet.text[:500],
        replies=tweet.reply_count,
        likes=tweet.like_count,
    )
    system = (
        "You are an expert in systematic trading infrastructure and AI agent systems on Solana. "
        "You reply with genuine technical substance. Never promotional. "
        "Your goal is to add value so the reader checks your profile."
    )
    return await complete(prompt, system=system, task=LLMTask.DRAFT_REPLY, max_tokens=200, temperature=0.7)


async def process_tweet(tweet: Tweet) -> dict | None:
    if is_excluded(tweet.text):
        return None

    passes_qf, qf_reason = passes_quality_filter(tweet)
    if not passes_qf:
        return None

    score = score_tweet(tweet)
    if score < SCORE_THRESHOLD:
        return None

    # "So What?" test
    swt = passes_so_what_test(
        tweet.text,
        source_platform="X",
        author_followers=tweet.followers,
        score=score,
    )
    if not swt.passes:
        return None

    kw_points, matched_kws = keyword_score(tweet.text)
    priority = assign_priority(tweet)

    reply = await draft_reply(tweet)

    # Store
    put_item("x_engagements", {
        "tweet_id": tweet.tweet_id,
        "original_poster": tweet.username,
        "original_text": tweet.text[:500],
        "followers": tweet.followers,
        "suggested_reply": reply,
        "score": score,
        "priority": priority,
        "keywords": matched_kws,
        "so_what": swt.rationale,
        "was_posted": False,
        "actual_reply": "",
        "result_follows": 0,
        "result_likes": 0,
        "scored_at": now_iso(),
    })

    # Coordination channel — only HIGH goes as Telegram notification
    draft = Draft(
        platform=Platform.X,
        score=score,
        source=f"@{tweet.username} ({tweet.followers:,} followers)",
        source_detail=f"{tweet.reply_count} replies, {tweet.like_count} likes | {priority}",
        original_message=tweet.text,
        suggested_reply=reply,
        link=f"https://x.com/{tweet.username}/status/{tweet.tweet_id}",
        metadata={"priority": priority, "keywords": matched_kws, "so_what": swt.rationale},
    )
    if priority == "HIGH" and score >= 80:
        await send_draft(draft)

    logger.info("x_scored", score=score, priority=priority, user=tweet.username)
    return {"score": score, "priority": priority, "reply": reply, "keywords": matched_kws, "so_what": swt.rationale}


async def search_recent(*, max_results: int = 25) -> list[dict]:
    if not settings.x.is_configured:
        logger.error("x_not_configured")
        return []

    import httpx

    # Build query from top-tier keywords
    top_kws = KEYWORDS[10][:5]
    query = " OR ".join(f'"{kw}"' for kw in top_kws) + " -is:retweet lang:en"
    url = "https://api.twitter.com/2/tweets/search/recent"
    params = {
        "query": query,
        "max_results": min(max_results, 100),
        "tweet.fields": "created_at,public_metrics",
        "user.fields": "public_metrics",
        "expansions": "author_id",
    }
    headers = {"Authorization": f"Bearer {settings.x.bearer_token}"}

    results: list[dict] = []
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, params=params, headers=headers)
        if response.status_code != 200:
            logger.error("x_search_failed", status=response.status_code, body=response.text[:200])
            return []

        data = response.json()
        tweets = data.get("data", [])
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

        for td in tweets:
            author = users.get(td.get("author_id", ""), {})
            metrics = td.get("public_metrics", {})
            author_metrics = author.get("public_metrics", {})

            tweet = Tweet(
                tweet_id=td["id"],
                username=author.get("username", "unknown"),
                display_name=author.get("name", ""),
                followers=author_metrics.get("followers_count", 0),
                text=td.get("text", ""),
                reply_count=metrics.get("reply_count", 0),
                like_count=metrics.get("like_count", 0),
                retweet_count=metrics.get("retweet_count", 0),
                created_at=datetime.fromisoformat(td["created_at"].replace("Z", "+00:00")),
            )
            result = await process_tweet(tweet)
            if result:
                results.append(result)

    logger.info("x_search_complete", checked=len(tweets), scored=len(results))
    return results
