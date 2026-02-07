#!/usr/bin/env python3
"""
Extract ONLY text from the channel (no PDF/image download).
Use this to fill text_messages.json, messages_full.json, and output/text/<id>.txt
without re-downloading media. Run: python extract_text_only.py
"""
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()
API_ID = int(os.environ.get("API_ID", "27266674"))
API_HASH = os.environ.get("API_HASH", "829d8911e5fde485ba38beccb3ab5c94")
CHANNEL_USERNAME = os.environ.get("CHANNEL_USERNAME", "smlemay").strip().lstrip("@")

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
TEXT_DIR = OUTPUT_DIR / "text"
TEXT_DIR.mkdir(parents=True, exist_ok=True)


async def run():
    phone = os.environ.get("PHONE", "").strip()
    if not phone:
        phone = input("Enter your Telegram phone (e.g. +966539401211): ").strip()
    if not phone:
        print("PHONE required.")
        return

    client = TelegramClient("exams_session", API_ID, API_HASH, system_version="4.16.30")
    await client.start(phone=phone)
    print("Connected. Fetching text only from @%s..." % CHANNEL_USERNAME)

    entity = await client.get_entity(CHANNEL_USERNAME)
    text_entries = []
    messages_full = []
    count = 0

    async for msg in client.iter_messages(entity):
        count += 1
        if count % 100 == 0:
            print("  %d messages..." % count)
        msg_id = msg.id
        msg_date = msg.date.strftime("%Y-%m-%d %H:%M:%S") if msg.date else ""
        link = "https://t.me/%s/%s" % (CHANNEL_USERNAME, msg_id)
        text_content = (msg.text or "").strip()

        full_record = {
            "id": msg_id,
            "date": msg_date,
            "link": link,
            "views": getattr(msg, "views", None),
            "forward": getattr(msg, "forward", None) is not None,
            "type": "text" if not msg.media else ("image" if hasattr(msg.media, "photo") else "document"),
        }
        if text_content:
            full_record["text"] = text_content
            full_record["word_count"] = len(text_content.split())
            text_entries.append({
                "id": msg_id,
                "date": msg_date,
                "text": text_content,
                "views": full_record["views"],
                "link": link,
                "is_forward": full_record["forward"],
                "word_count": full_record["word_count"],
                "is_caption": bool(msg.media),
            })
            try:
                (TEXT_DIR / f"{msg_id}.txt").write_text(text_content, encoding="utf-8")
            except OSError:
                pass
        messages_full.append(full_record)
        await asyncio.sleep(0.03)

    await client.disconnect()

    summary_text = "Extraction Summary (text only)\nTotal text messages: %d\nFull records: %d" % (
        len(text_entries),
        len(messages_full),
    )

    if os.environ.get("CONVEX_URL"):
        from convex_db import save_text_messages as convex_save, save_summary as convex_save_summary
        convex_save(CHANNEL_USERNAME, text_entries)
        convex_save_summary(CHANNEL_USERNAME, summary_text)
        print("Done. Text messages: %d | Full records: %d → saved to Convex." % (len(text_entries), len(messages_full)))
    elif os.environ.get("DATABASE_URL"):
        from db import init_tables, save_text_messages
        init_tables()
        save_text_messages(text_entries, summary_text)
        print("Done. Text messages: %d | Full records: %d → saved to database." % (len(text_entries), len(messages_full)))
        print("Refresh your Railway app URL to see text.")
    else:
        with open(OUTPUT_DIR / "text_messages.json", "w", encoding="utf-8") as f:
            json.dump(text_entries, f, ensure_ascii=False, indent=2)
        with open(OUTPUT_DIR / "messages_full.json", "w", encoding="utf-8") as f:
            json.dump(messages_full, f, ensure_ascii=False, indent=2)
        print("Done. Text messages: %d | Full records: %d" % (len(text_entries), len(messages_full)))
        print("Saved: output/text_messages.json, output/messages_full.json, output/text/<id>.txt")
        print("Refresh http://127.0.0.1:5001 to see text in the viewer.")


if __name__ == "__main__":
    asyncio.run(run())
