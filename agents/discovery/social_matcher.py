"""Social identity matching for discovered wallets.

Resolves Solana wallet addresses to social accounts via:
- SNS domains (.sol names) → X handles
- Backpack profiles → social accounts
- Superteam profiles → builder identities
- Realms DAO votes → governance participants
"""

from __future__ import annotations

import structlog

from shared.config import settings
from shared.dynamo import get_item, update_item

logger = structlog.get_logger()


async def resolve_sns_domain(address: str) -> str | None:
    """Resolve a wallet address to its .sol domain name via Helius."""
    if not settings.helius.is_configured:
        return None

    import httpx

    url = settings.helius.rpc_url
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getAccountInfo",
        "params": [address, {"encoding": "jsonParsed"}],
    }
    # SNS resolution uses the Bonfida Name Service
    # Helius DAS API provides domain resolution
    das_url = f"https://api.helius.xyz/v0/addresses/{address}/names"
    params = {"api-key": settings.helius.api_key}

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(das_url, params=params)
        if response.status_code == 200:
            data = response.json()
            names = data.get("domainNames", [])
            if names:
                return names[0]  # Primary .sol domain
    return None


async def resolve_backpack_profile(address: str) -> dict[str, str] | None:
    """Check if wallet has a Backpack profile with linked socials."""
    import httpx

    url = f"https://xnft-api-server.xnfts.dev/v1/users/fromPublicKey/{address}"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            if user:
                result = {}
                if user.get("username"):
                    result["backpack"] = user["username"]
                return result if result else None
    return None


async def match_social_identities(address: str) -> dict[str, str]:
    """Attempt to resolve a wallet address to social identities."""
    matches: dict[str, str] = {}

    # Try SNS domain
    sol_domain = await resolve_sns_domain(address)
    if sol_domain:
        matches["sns"] = sol_domain
        logger.debug("social_match_sns", address=address, domain=sol_domain)

    # Try Backpack
    backpack = await resolve_backpack_profile(address)
    if backpack:
        matches.update(backpack)
        logger.debug("social_match_backpack", address=address, profile=backpack)

    if matches:
        # Update DynamoDB record with social matches
        existing = get_item("wallet_scores", {"wallet_address": address})
        if existing:
            update_item("wallet_scores", {"wallet_address": address}, {"social_match": matches})

    return matches


async def batch_resolve(addresses: list[str]) -> dict[str, dict[str, str]]:
    """Resolve social identities for a batch of wallet addresses."""
    results: dict[str, dict[str, str]] = {}
    resolved = 0

    for address in addresses:
        matches = await match_social_identities(address)
        if matches:
            results[address] = matches
            resolved += 1

    logger.info("batch_resolve_complete", total=len(addresses), resolved=resolved)
    return results
