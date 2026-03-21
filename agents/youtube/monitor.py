"""YouTube Monitor Agent — v2.

Find collaboration targets and content gaps.
Quality filters: <30 days old, >500 subscribers, >500 views.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
import structlog

from shared.config import settings
from shared.coordination import Draft, Platform, send_draft
from shared.filters import passes_so_what_test

logger = structlog.get_logger()

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"

YOUTUBE_QUERIES = [
    "solana AI agent",
    "solana RWA",
    "tokenized assets solana",
    "DeFAI",
    "solana trading infrastructure",
    "USDY yield solana",
    "solana prediction market",
    "solana agent kit tutorial",
    "drift protocol tutorial",
    "jupiter solana polymarket",
]

QUALITY_FILTERS = {
    "max_age_days": 30,
    "min_subscribers": 500,
    "min_views": 500,
}


@dataclass
class YouTubeVideo:
    video_id: str
    title: str
    channel_title: str
    channel_id: str
    description: str
    published_at: str
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    subscriber_count: int = 0


def passes_quality_filter(video: YouTubeVideo) -> tuple[bool, str]:
    try:
        pub = datetime.fromisoformat(video.published_at.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - pub).days
        if age_days > QUALITY_FILTERS["max_age_days"]:
            return False, f"Too old ({age_days}d)"
    except (ValueError, TypeError):
        pass

    if video.subscriber_count < QUALITY_FILTERS["min_subscribers"]:
        return False, f"Channel too small ({video.subscriber_count} subs)"

    if video.view_count < QUALITY_FILTERS["min_views"]:
        return False, f"Too few views ({video.view_count})"

    return True, "Passes"


def assign_priority(video: YouTubeVideo) -> str:
    if video.subscriber_count >= 50000:
        return "HIGH"
    if video.subscriber_count >= 10000:
        return "MEDIUM"
    return "LOW"


def score_video(video: YouTubeVideo) -> int:
    score = 0

    # Channel authority
    if video.subscriber_count >= 50000:
        score += 10
    elif video.subscriber_count >= 10000:
        score += 8
    elif video.subscriber_count >= 1000:
        score += 6

    # Views
    if video.view_count >= 10000:
        score += 12
    elif video.view_count >= 5000:
        score += 8
    elif video.view_count >= 1000:
        score += 5

    # Engagement
    engagement = video.like_count + video.comment_count
    if engagement >= 100:
        score += 10
    elif engagement >= 20:
        score += 5

    # Recency bonus
    try:
        pub = datetime.fromisoformat(video.published_at.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - pub).days
        if age_days <= 7:
            score += 8
        elif age_days <= 14:
            score += 5
    except (ValueError, TypeError):
        pass

    # Topic relevance via keywords in title
    text_lower = f"{video.title} {video.description}".lower()
    relevance_kws = [
        "ai agent", "rwa", "tokenized", "defai", "trading bot",
        "solana agent", "prediction market", "usdy", "drift",
    ]
    hits = sum(1 for kw in relevance_kws if kw in text_lower)
    score += min(hits * 5, 20)

    return min(score, 100)


async def search_videos(query: str, *, max_results: int = 5) -> list[YouTubeVideo]:
    if not settings.youtube.is_configured:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        # Search
        resp = await client.get(YOUTUBE_SEARCH_URL, params={
            "part": "snippet", "q": query, "type": "video",
            "order": "date", "maxResults": max_results,
            "key": settings.youtube.api_key,
        })
        if resp.status_code != 200:
            logger.error("youtube_search_failed", status=resp.status_code)
            return []

        data = resp.json()
        videos = []
        video_ids = []
        channel_ids = set()

        for item in data.get("items", []):
            vid_id = item.get("id", {}).get("videoId", "")
            snippet = item.get("snippet", {})
            channel_id = snippet.get("channelId", "")
            videos.append(YouTubeVideo(
                video_id=vid_id,
                title=snippet.get("title", ""),
                channel_title=snippet.get("channelTitle", ""),
                channel_id=channel_id,
                description=snippet.get("description", ""),
                published_at=snippet.get("publishedAt", ""),
            ))
            video_ids.append(vid_id)
            channel_ids.add(channel_id)

        # Fetch video stats
        if video_ids:
            stats_resp = await client.get(YOUTUBE_VIDEOS_URL, params={
                "part": "statistics", "id": ",".join(video_ids),
                "key": settings.youtube.api_key,
            })
            if stats_resp.status_code == 200:
                for item in stats_resp.json().get("items", []):
                    stats = item.get("statistics", {})
                    for v in videos:
                        if v.video_id == item["id"]:
                            v.view_count = int(stats.get("viewCount", 0))
                            v.like_count = int(stats.get("likeCount", 0))
                            v.comment_count = int(stats.get("commentCount", 0))

        # Fetch channel subscriber counts
        if channel_ids:
            ch_resp = await client.get(YOUTUBE_CHANNELS_URL, params={
                "part": "statistics", "id": ",".join(channel_ids),
                "key": settings.youtube.api_key,
            })
            if ch_resp.status_code == 200:
                ch_stats = {item["id"]: int(item.get("statistics", {}).get("subscriberCount", 0))
                           for item in ch_resp.json().get("items", [])}
                for v in videos:
                    v.subscriber_count = ch_stats.get(v.channel_id, 0)

    return videos


async def monitor_all(*, score_threshold: int = 30) -> list[dict]:
    results: list[dict] = []

    for query in YOUTUBE_QUERIES:
        videos = await search_videos(query, max_results=5)
        logger.info("youtube_searched", query=query, results=len(videos))

        for video in videos:
            passes_qf, qf_reason = passes_quality_filter(video)
            if not passes_qf:
                continue

            score = score_video(video)
            if score < score_threshold:
                continue

            # "So What?" test
            swt = passes_so_what_test(f"{video.title} {video.description}", source_platform="YOUTUBE")
            if not swt.passes:
                continue

            priority = assign_priority(video)

            result = {
                "video_id": video.video_id,
                "title": video.title,
                "channel": video.channel_title,
                "subscribers": video.subscriber_count,
                "views": video.view_count,
                "score": score,
                "priority": priority,
                "query": query,
                "so_what": swt.rationale,
            }
            results.append(result)

            if score >= 80:
                await send_draft(Draft(
                    platform=Platform.TELEGRAM,
                    score=score,
                    source=f"YouTube: {video.channel_title} ({video.subscriber_count:,} subs)",
                    source_detail=f"{video.view_count:,} views | {priority}",
                    original_message=video.title,
                    suggested_reply=f"[{priority}] {swt.rationale}\nQuery: {query}",
                    link=f"https://youtube.com/watch?v={video.video_id}",
                    metadata={"priority": priority, "so_what": swt.rationale},
                ))

    logger.info("youtube_complete", scored=len(results))
    return results
