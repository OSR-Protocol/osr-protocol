"""Reddit RSS Monitor — v2.

Content intelligence — find topics, pain points, questions for content pipeline.
NOT for engagement. RSS feeds only (API discontinued Nov 2025).
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass

import httpx
import structlog

from shared.config import settings
from shared.coordination import Draft, Platform, send_draft
from shared.filters import passes_so_what_test

logger = structlog.get_logger()

RSS_FEEDS = [
    "https://www.reddit.com/r/solana/.rss",
    "https://www.reddit.com/r/defi/.rss",
]

# Weighted keywords matching X/Telegram for consistency
KEYWORDS = {
    10: ["RWA", "tokenized", "real world asset", "AI agent", "solana agent",
         "prediction market solana", "DeFAI"],
    8: ["USDY", "OUSG", "BUIDL", "yield comparison", "on-chain analytics",
        "drift bet", "polymarket solana"],
    6: ["solana yield", "tokenized treasury", "parcl", "metadao",
        "solana infrastructure", "solana dashboard"],
    4: ["solana builder", "solana tool", "solana analytics"],
}

EXCLUDE = ["meme", "bonk", "wif", "moon", "100x", "price prediction",
           "wen pump", "dog coin"]

CONTENT_TAGS = {
    "content_idea": ["how to", "tutorial", "guide", "explain", "comparison", "vs"],
    "pain_point": ["struggling", "issue", "problem", "broken", "frustrated", "help"],
    "question": ["?", "how do", "what is", "anyone know", "looking for"],
    "news": ["announced", "launched", "released", "partnership", "integration"],
    "discussion": [],  # Default tag
}


@dataclass
class RedditPost:
    title: str
    author: str
    subreddit: str
    link: str
    content: str
    published: str
    upvotes: int = 0
    comment_count: int = 0


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


def assign_content_tag(text: str) -> str:
    text_lower = text.lower()
    for tag, signals in CONTENT_TAGS.items():
        if tag == "discussion":
            continue
        if any(s in text_lower for s in signals):
            return tag
    return "discussion"


def score_post(post: RedditPost) -> int:
    if is_excluded(post.title):
        return 0

    kw_points, _ = keyword_score(f"{post.title} {post.content}")
    score = min(kw_points * 3, 50)  # Weighted higher since Reddit has fewer posts

    # Upvote quality (Reddit-specific)
    if post.upvotes >= 100:
        score += 25
    elif post.upvotes >= 50:
        score += 20
    elif post.upvotes >= 20:
        score += 15
    elif post.upvotes >= 5:
        score += 5

    # Discussion depth
    if post.comment_count >= 50:
        score += 15
    elif post.comment_count >= 20:
        score += 10
    elif post.comment_count >= 5:
        score += 5

    # Content tag bonus
    tag = assign_content_tag(post.title)
    if tag == "pain_point":
        score += 10  # Highest value — validates our product
    elif tag == "content_idea":
        score += 8
    elif tag == "question":
        score += 5

    return min(score, 100)


def parse_rss_feed(xml_text: str, subreddit: str) -> list[RedditPost]:
    posts: list[RedditPost] = []
    try:
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            title = entry.findtext("atom:title", "", ns)
            author_el = entry.find("atom:author", ns)
            author = author_el.findtext("atom:name", "", ns) if author_el is not None else ""
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href", "") if link_el is not None else ""
            content = entry.findtext("atom:content", "", ns)
            published = entry.findtext("atom:updated", "", ns)
            posts.append(RedditPost(
                title=title, author=author, subreddit=subreddit,
                link=link, content=content[:500], published=published,
            ))
    except ET.ParseError:
        logger.error("rss_parse_error", subreddit=subreddit)
    return posts


async def fetch_subreddit(url: str, subreddit: str) -> list[RedditPost]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers={"User-Agent": "OSR-Monitor/2.0"})
        if resp.status_code != 200:
            logger.warning("rss_fetch_failed", subreddit=subreddit, status=resp.status_code)
            return []
        return parse_rss_feed(resp.text, subreddit)


async def monitor_all(*, score_threshold: int = 40) -> list[dict]:
    results: list[dict] = []

    for feed_url in RSS_FEEDS:
        sub = feed_url.split("/r/")[1].rstrip("/.rss")
        posts = await fetch_subreddit(feed_url, sub)
        logger.info("rss_fetched", subreddit=sub, posts=len(posts))

        for post in posts:
            if is_excluded(post.title):
                continue

            score = score_post(post)
            if score < score_threshold:
                continue

            # "So What?" test
            swt = passes_so_what_test(f"{post.title} {post.content}", source_platform="REDDIT")
            if not swt.passes:
                continue

            kw_points, matched = keyword_score(f"{post.title} {post.content}")
            tag = assign_content_tag(post.title)

            result = {
                "title": post.title,
                "author": post.author,
                "subreddit": sub,
                "link": post.link,
                "score": score,
                "tag": tag,
                "keywords": matched,
                "so_what": swt.rationale,
            }
            results.append(result)

            # Only HIGH priority to coordination channel
            if score >= 80:
                await send_draft(Draft(
                    platform=Platform.TELEGRAM,
                    score=score,
                    source=f"Reddit r/{sub}",
                    source_detail=f"u/{post.author} | Tag: {tag}",
                    original_message=post.title,
                    suggested_reply=f"[{tag.upper()}] {swt.rationale}",
                    link=post.link,
                    metadata={"tag": tag, "keywords": matched, "so_what": swt.rationale},
                ))

    logger.info("reddit_monitor_complete", total_scored=len(results))
    return results
