#!/usr/bin/env python3
"""
Test Telegram connection for all exam channels.
Fetches the last few messages from each channel to verify access.
Results are saved to Convex (channel_health table) for the UI.

Follows SCRAPER_RULES.md rate limits.
Run: python test_connection.py
"""
import asyncio
import os
import random

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import FloodWaitError

load_dotenv()
API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]

MAX_MESSAGES_SINGLE = 10
MAX_MESSAGES_MULTI = 5
MULTI_THRESHOLD = 3

DELAY_BETWEEN = float(os.environ.get("DELAY_BETWEEN_API_CALLS", "1.2"))


async def safe_sleep(base: float):
    """Sleep with random jitter."""
    await asyncio.sleep(base + random.uniform(0, base * 0.5))


async def run():
    phone = os.environ.get("PHONE", "").strip()
    if not phone:
        phone = input("Enter your Telegram phone (e.g. +966...): ").strip()
    if not phone:
        print("PHONE required.")
        return

    use_convex = bool(os.environ.get("CONVEX_URL"))
    channels = set()

    if use_convex:
        from convex_db import get_exam_channels
        exams = get_exam_channels() or []
        for exam in exams:
            for ch in exam.get("channels", []):
                channels.add(ch)
    else:
        print("CONVEX_URL not set. Please set it in .env to use this script.")
        return

    if not channels:
        print("No channels found in any exam. Add channels to your exams first.")
        return

    channels = sorted(channels)
    msg_limit = MAX_MESSAGES_MULTI if len(channels) >= MULTI_THRESHOLD else MAX_MESSAGES_SINGLE

    print("Testing %d channel(s), fetching last %d messages each..." % (len(channels), msg_limit))

    client = TelegramClient("exams_session", API_ID, API_HASH, system_version="4.16.30")
    await client.start(phone=phone)
    print("Connected to Telegram.\n")

    from convex_db import save_channel_health

    for i, ch in enumerate(channels, 1):
        print("  [%d/%d] Testing @%s..." % (i, len(channels), ch), end=" ", flush=True)
        try:
            await safe_sleep(DELAY_BETWEEN)
            entity = await client.get_entity(ch)

            messages = await client.get_messages(entity, limit=msg_limit)
            total = messages.total if hasattr(messages, "total") else len(messages)

            latest = []
            for msg in messages:
                msg_date = msg.date.strftime("%Y-%m-%d %H:%M:%S") if msg.date else ""
                text = (msg.text or "")[:200].strip()
                latest.append({
                    "id": msg.id,
                    "date": msg_date,
                    "text": text,
                })

            save_channel_health(
                channel=ch,
                status="ok",
                message_count=total,
                latest_messages=latest,
            )
            print("OK (%d total messages, fetched %d)" % (total, len(latest)))

        except FloodWaitError as e:
            wait = e.seconds + 5
            print("FLOOD_WAIT %ds, sleeping %ds..." % (e.seconds, wait))
            await asyncio.sleep(wait)
            # Retry once
            try:
                entity = await client.get_entity(ch)
                messages = await client.get_messages(entity, limit=msg_limit)
                total = messages.total if hasattr(messages, "total") else len(messages)
                save_channel_health(channel=ch, status="ok", message_count=total, latest_messages=[])
                print("  OK after retry (%d messages)" % total)
            except Exception as e2:
                save_channel_health(channel=ch, status="error", error=str(e2))
                print("  ERROR after retry: %s" % e2)

        except Exception as e:
            error_msg = str(e)
            save_channel_health(channel=ch, status="error", error=error_msg)
            print("ERROR: %s" % error_msg)
            await safe_sleep(2)

    await client.disconnect()
    print("\nDone. Results saved to Convex. Check the Connection Health tab in the UI.")


if __name__ == "__main__":
    asyncio.run(run())
