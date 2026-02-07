#!/usr/bin/env python3
"""One-time migration: load existing JSON files into Convex."""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local")

CHANNEL = os.environ.get("CHANNEL_USERNAME", "smlemay")
OUTPUT = Path(__file__).resolve().parent / "output"


def main():
    if not os.environ.get("CONVEX_URL"):
        print("Set CONVEX_URL in .env or .env.local first.")
        return

    from convex_db import (
        save_text_messages,
        save_summary,
        save_pdfs_metadata,
        save_images_metadata,
    )

    # Text messages
    text_path = OUTPUT / "text_messages.json"
    if text_path.exists():
        with open(text_path, encoding="utf-8") as f:
            entries = json.load(f)
        print(f"Migrating {len(entries)} text messages...")
        save_text_messages(CHANNEL, entries)
        print("  Done.")

    # Summary
    summary_path = OUTPUT / "summary.txt"
    if summary_path.exists():
        text = summary_path.read_text(encoding="utf-8")
        save_summary(CHANNEL, text)
        print("Migrated summary.")

    # PDFs
    pdfs_path = OUTPUT / "pdfs" / "pdfs_metadata.json"
    if pdfs_path.exists():
        with open(pdfs_path, encoding="utf-8") as f:
            pdfs = json.load(f)
        print(f"Migrating {len(pdfs)} PDF records...")
        save_pdfs_metadata(CHANNEL, pdfs)
        print("  Done.")

    # Images
    images_path = OUTPUT / "images" / "images_metadata.json"
    if images_path.exists():
        with open(images_path, encoding="utf-8") as f:
            images = json.load(f)
        print(f"Migrating {len(images)} image records...")
        save_images_metadata(CHANNEL, images)
        print("  Done.")

    print("Migration complete.")


if __name__ == "__main__":
    main()
