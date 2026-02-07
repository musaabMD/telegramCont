#!/usr/bin/env python3
"""
Local web viewer for extracted Telegram channel content.
Run: python viewer.py  →  open http://127.0.0.1:5001
When DATABASE_URL is set (e.g. Railway Postgres), reads from database instead of files.
"""
import json
import os
import re
from pathlib import Path

from flask import Flask, jsonify, render_template, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
PDF_DIR = OUTPUT_DIR / "pdfs"
IMAGE_DIR = OUTPUT_DIR / "images"
TEXT_DIR = OUTPUT_DIR / "text"
DIST_DIR = BASE_DIR / "viewer-app" / "dist"  # React (shadcn) app build
CHANNEL_USERNAME = "smlemay"

OUTPUT_DIR.mkdir(exist_ok=True)
TEXT_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=None)


def _load_json(path: Path, default=None):
    if default is None:
        default = []
    if not path.exists():
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def _load_text(path: Path, default=""):
    if not path.exists():
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return default


def _images_from_disk():
    out = []
    if not IMAGE_DIR.exists():
        return out
    for f in sorted(IMAGE_DIR.iterdir(), key=lambda x: x.name, reverse=True):
        if not f.is_file() or f.name == "images_metadata.json":
            continue
        m = re.match(r"image_(\d+)\.(\w+)", f.name)
        if m:
            msg_id = int(m.group(1))
            out.append({
                "message_id": msg_id,
                "filename": f.name,
                "caption": None,
                "file_size": f.stat().st_size,
                "date": "",
                "link": f"https://t.me/{CHANNEL_USERNAME}/{msg_id}",
            })
    return out


# React app (shadcn) – serve from viewer-app/dist
@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(DIST_DIR / "assets", filename)


@app.route("/vite.svg")
def serve_vite_svg():
    return send_from_directory(DIST_DIR, "vite.svg")


@app.route("/")
def index():
    if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
        return send_from_directory(DIST_DIR, "index.html")
    # Fallback: old Flask template if no build
    return render_template("index.html")


@app.route("/api/summary")
def api_summary():
    if os.environ.get("DATABASE_URL"):
        try:
            from db import get_summary
            text = get_summary() or ""
            return jsonify({"summary": text, "has_data": bool(text.strip())})
        except Exception:
            pass
    text = _load_text(OUTPUT_DIR / "summary.txt")
    return jsonify({"summary": text, "has_data": bool(text.strip())})


def _text_from_folder():
    """Build text_messages list from output/text/*.txt when JSON is empty."""
    out = []
    if not TEXT_DIR.exists():
        return out
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
                    "link": f"https://t.me/{CHANNEL_USERNAME}/{msg_id}",
                    "is_forward": False,
                    "word_count": len(text.split()),
                    "is_caption": False,
                })
        except (ValueError, OSError):
            continue
    return out


@app.route("/api/text_messages")
def api_text_messages():
    if os.environ.get("DATABASE_URL"):
        try:
            from db import get_text_messages
            data = get_text_messages()
            if data is not None:
                return jsonify(data)
        except Exception:
            pass
    data = _load_json(OUTPUT_DIR / "text_messages.json")
    if not data:
        full = _load_json(OUTPUT_DIR / "messages_full.json")
        if full:
            data = [
                {
                    "id": m["id"],
                    "date": m.get("date", ""),
                    "text": m.get("text", ""),
                    "views": m.get("views"),
                    "link": m.get("link", ""),
                    "is_forward": m.get("forward", False),
                    "word_count": len((m.get("text") or "").split()),
                    "is_caption": m.get("type") in ("image", "pdf"),
                }
                for m in full
                if (m.get("text") or "").strip()
            ]
    if not data:
        data = _text_from_folder()
    return jsonify(data or [])


@app.route("/api/pdfs")
def api_pdfs():
    return jsonify(_load_json(PDF_DIR / "pdfs_metadata.json"))


@app.route("/api/images")
def api_images():
    data = _load_json(IMAGE_DIR / "images_metadata.json")
    if not data:
        data = _images_from_disk()
    return jsonify(data or [])


@app.route("/api/full_messages")
def api_full_messages():
    return jsonify(_load_json(OUTPUT_DIR / "messages_full.json"))


@app.route("/files/pdfs/<path:filename>")
def serve_pdf(filename):
    return send_from_directory(PDF_DIR, filename, mimetype="application/pdf")


@app.route("/files/images/<path:filename>")
def serve_image(filename):
    return send_from_directory(IMAGE_DIR, filename)


@app.route("/files/text/<path:filename>")
def serve_text(filename):
    return send_from_directory(TEXT_DIR, filename, mimetype="text/plain; charset=utf-8")


if __name__ == "__main__":
    import socket
    port = 5001
    for p in range(5001, 5011):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", p))
            port = p
            break
        except OSError:
            continue
    print(f"Viewer: http://127.0.0.1:{port}")
    if not (DIST_DIR / "index.html").exists():
        print("(Build shadcn UI: cd viewer-app && npm run build)")
    print("(Run extraction first with: python main.py)")
    app.run(host="127.0.0.1", port=port, debug=False)
