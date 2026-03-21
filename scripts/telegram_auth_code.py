"""Non-interactive Telegram auth with code provided as argument."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import settings


async def main():
    from telethon import TelegramClient

    code = sys.argv[1] if len(sys.argv) > 1 else None
    if not code:
        print("Usage: python scripts/telegram_auth_code.py <code>")
        sys.exit(1)

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

    if not await client.is_user_authorized():
        print(f"  Sending code request to {settings.telegram.phone}...")
        await client.send_code_request(settings.telegram.phone)
        print(f"  Signing in with code: {code}")
        try:
            await client.sign_in(settings.telegram.phone, code)
        except Exception as e:
            print(f"  Sign-in error: {e}")
            # Might need 2FA password
            if "password" in str(e).lower() or "two" in str(e).lower():
                print("  2FA is enabled — need your Telegram password too.")
            await client.disconnect()
            sys.exit(1)

    me = await client.get_me()
    print(f"\n  Authenticated as: {me.first_name} (@{me.username})")
    print(f"  User ID: {me.id}")
    print(f"  Session saved to: {session_path}.session")

    print("\n  Recent chats:")
    async for dialog in client.iter_dialogs(limit=5):
        print(f"    {dialog.name}")

    await client.disconnect()
    print("\n  Done. Telethon ready.")


if __name__ == "__main__":
    asyncio.run(main())
