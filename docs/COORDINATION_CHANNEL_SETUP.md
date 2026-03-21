# Telegram Coordination Channel — Setup Guide

All agent output flows to ONE private Telegram channel. This is the command center.

## Step 1: Create the Channel

1. Open Telegram → New Channel
2. Name: `OSR Command` (or whatever you prefer)
3. Description: `Agent monitoring output — private`
4. Type: **Private** (invite link only, not discoverable)
5. Skip adding members (you're the only admin)

## Step 2: Channel Security Settings

1. Open channel → Edit → Permissions
2. **Disable "Forward Messages"** — prevents screenshots/leaks
3. **Disable "Add Members"** — only you control access
4. Keep yourself as the ONLY admin

## Step 3: Create the Bot via @BotFather

1. Open @BotFather in Telegram
2. Send `/newbot`
3. Name: `OSR Monitor Bot`
4. Username: `osr_monitor_bot` (or similar available name)
5. **Copy the bot token** — looks like: `7123456789:AAH...`

## Step 4: Add Bot to Channel

1. Open your OSR Command channel
2. Add the bot as a member
3. Promote bot to **Admin** with ONLY "Post Messages" permission
4. Bot cannot read messages, manage channel, or do anything else

## Step 5: Get Channel ID

1. Forward any message from the channel to @userinfobot
2. Or: open the channel in web.telegram.org, the URL contains the ID
3. Private channel IDs look like: `-1001234567890`

## Step 6: Paste into .env

```
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_COORDINATION_CHANNEL_ID=-1001234567890
```

## Security Checklist

- [ ] Channel is PRIVATE
- [ ] Only Ashim is admin
- [ ] Bot has Post Messages permission ONLY
- [ ] Forwarding is disabled
- [ ] No other members
- [ ] Bot token in .env only (gitignored)
