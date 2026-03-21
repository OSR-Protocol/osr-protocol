"""One-time Telegram Telethon authentication.

Run: PYTHONPATH=. python scripts/telegram_auth.py
Sends a code to your phone. Enter it when prompted.
Creates a session file for future use.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import settings


async def main():
    from telethon import TelegramClient

    print("=" * 50)
    print("TELEGRAM TELETHON AUTH")
    print("=" * 50)
    print(f"  API ID: {settings.telegram.api_id}")
    print(f"  Phone: {settings.telegram.phone}")
    print()

    # Session file stored in repo root (gitignored via *.session)
    session_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "osr_monitor"
    )

    client = TelegramClient(
        session_path,
        int(settings.telegram.api_id),
        settings.telegram.api_hash,
    )

    await client.start(phone=settings.telegram.phone)

    me = await client.get_me()
    print(f"\n  Authenticated as: {me.first_name} (@{me.username})")
    print(f"  User ID: {me.id}")
    print(f"  Phone: {me.phone}")
    print(f"\n  Session file saved. Future runs won't need auth.")

    # Quick test — list a few dialogs
    print("\n  Testing connection — listing 5 recent chats:")
    async for dialog in client.iter_dialogs(limit=5):
        print(f"    {dialog.name}")

    await client.disconnect()
    print("\n  Done. Telethon is ready.")


if __name__ == "__main__":
    asyncio.run(main())
