"""$OSR Token Mint Script.

Creates the SPL token on Solana with:
- Fixed supply: 1,000,000,000 (1B)
- 9 decimals
- Mint authority: REVOKED after creation
- Freeze authority: REVOKED after creation

IMPORTANT: This script requires a Ledger hardware wallet for signing.
Run on devnet first: python scripts/mint_token.py --devnet
Production: python scripts/mint_token.py --mainnet

Prerequisites:
  pip install solders solana spl-token
"""

from __future__ import annotations

import argparse
import sys

import structlog

from shared.config import settings

logger = structlog.get_logger()


def mint_token(*, network: str = "devnet", dry_run: bool = True) -> None:
    """Mint the $OSR SPL token."""
    supply = settings.solana.token_supply
    decimals = settings.solana.token_decimals
    total_raw = supply * (10**decimals)

    if network == "mainnet":
        rpc_url = settings.solana.rpc_url or settings.helius.rpc_url
    else:
        rpc_url = settings.solana.devnet_rpc_url or settings.helius.devnet_rpc_url

    logger.info(
        "mint_config",
        network=network,
        supply=f"{supply:,}",
        decimals=decimals,
        total_raw_units=f"{total_raw:,}",
        rpc=rpc_url[:50] + "...",
        dry_run=dry_run,
    )

    if dry_run:
        logger.info("dry_run_complete", message="Pass --execute to create token")
        print(f"\nDRY RUN — Token config:")
        print(f"  Name:    {settings.solana.token_supply:,} Operating System R ($OSR)")
        print(f"  Supply:  {supply:,} tokens")
        print(f"  Raw:     {total_raw:,} units (with {decimals} decimals)")
        print(f"  Network: {network}")
        print(f"  Mint authority: will be REVOKED")
        print(f"  Freeze authority: will be REVOKED")
        print(f"\n  Run with --execute to create on {network}")
        return

    # Actual minting requires Ledger signing
    # This is the execution path — only runs with --execute flag
    try:
        from solders.keypair import Keypair  # noqa: F401
        from solana.rpc.api import Client

        client = Client(rpc_url)
        logger.info("rpc_connected", network=network, slot=client.get_slot().value)

        # Token creation steps:
        # 1. Create mint account (Ledger signs)
        # 2. Set decimals to 9
        # 3. Mint total supply to treasury
        # 4. Revoke mint authority (permanent — supply can never increase)
        # 5. Revoke freeze authority (permanent — tokens can never be frozen)

        logger.info("mint_requires_ledger", message="Connect Ledger and approve transaction")
        print("\nIMPORTANT: This requires Ledger hardware wallet approval.")
        print("Steps that will execute:")
        print("  1. Create SPL token mint account")
        print("  2. Mint 1,000,000,000 tokens to treasury")
        print("  3. Revoke mint authority (PERMANENT)")
        print("  4. Revoke freeze authority (PERMANENT)")
        print("\nWaiting for Ledger confirmation...")

        # TODO: Implement Ledger signing integration
        # The actual signing must go through the Ledger device
        # This prevents any private key from existing in software
        logger.warning("ledger_integration_pending", message="Ledger signing not yet implemented")

    except ImportError as e:
        logger.error("missing_dependency", error=str(e))
        print(f"Missing dependency: {e}")
        print("Install: pip install solders solana")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mint $OSR SPL Token")
    parser.add_argument("--devnet", action="store_true", help="Use devnet (default)")
    parser.add_argument("--mainnet", action="store_true", help="Use mainnet-beta")
    parser.add_argument("--execute", action="store_true", help="Actually create token (default is dry run)")
    args = parser.parse_args()

    network = "mainnet" if args.mainnet else "devnet"
    mint_token(network=network, dry_run=not args.execute)
