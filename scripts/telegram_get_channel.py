"""Get the channel ID for OSR Command Center."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import settings


async def main():
    from telethon import TelegramClient

    session_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "osr_monitor"
    )

    client = TelegramClient(
        session_path,
        int(settings.telegram.api_id),
        settings.telegram.api_hash,
    )

    await client.connect()

    print("Looking for OSR Command Center channel...\n")
    async for dialog in client.iter_dialogs(limit=20):
        print(f"  {dialog.id:>15} | {dialog.name}")
        if "OSR" in dialog.name or "Command" in dialog.name or "osr" in dialog.name.lower():
            print(f"\n  >>> FOUND: {dialog.name}")
            print(f"  >>> Channel ID: {dialog.id}")
            print(f"  >>> Use in .env: TELEGRAM_COORDINATION_CHANNEL_ID={dialog.id}")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
