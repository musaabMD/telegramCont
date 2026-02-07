#!/usr/bin/env python3
"""Rebuild output/text_messages.json from output/text/*.txt so the viewer shows text."""
import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "output"
TEXT_DIR = OUTPUT / "text"
CHANNEL = "smlemay"

def main():
    if not TEXT_DIR.exists():
        print("No output/text folder.")
        return
    out = []
    for f in sorted(TEXT_DIR.glob("*.txt"), key=lambda x: int(x.stem) if x.stem.isdigit() else 0, reverse=True):
        try:
            msg_id = int(f.stem)
            text = f.read_text(encoding="utf-8", errors="replace").strip()
            if text:
                out.append({
                    "id": msg_id,
                    "date": "",
                    "text": text,
                    "views": None,
                    "link": f"https://t.me/{CHANNEL}/{msg_id}",
                    "is_forward": False,
                    "word_count": len(text.split()),
                    "is_caption": False,
                })
        except (ValueError, OSError):
            continue
    path = OUTPUT / "text_messages.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {path} with {len(out)} text messages.")
    print("Refresh http://127.0.0.1:5001 → Text messages tab.")

if __name__ == "__main__":
    main()
