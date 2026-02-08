#!/usr/bin/env python3
"""
Extract ONLY text from all exam channels (no PDF/image download).
Channels are pulled from Convex exams automatically.
Tracks last scrape date+time per channel to avoid re-scraping.

Implements SCRAPER_RULES.md:
  - FloodWaitError handling on every API call
  - Configurable rate limiting with random jitter
  - Progress bars (channels + messages)
  - File-based logging + console output
  - Resume support via scrape_state.json
  - Deduplication (per-channel + cross-channel text hash)
  - Auto-pause on excessive flood waits
  - Graceful shutdown (Ctrl+C saves state)

Run: python extract_text_only.py
"""
import asyncio
import hashlib
import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import (
    ChannelInvalidError,
    ChannelPrivateError,
    ChatAdminRequiredError,
    FloodWaitError,
    UsernameNotOccupiedError,
)

load_dotenv()
API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]

# ── Directories ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
TEXT_DIR = OUTPUT_DIR / "text"
TEXT_DIR.mkdir(parents=True, exist_ok=True)

# ── Rate Limit Config (from .env, with safe defaults) ────────
DELAY_API = float(os.environ.get("DELAY_BETWEEN_API_CALLS", "1.2"))
DELAY_CH_MIN = float(os.environ.get("DELAY_BETWEEN_CHANNELS_MIN", "5"))
DELAY_CH_MAX = float(os.environ.get("DELAY_BETWEEN_CHANNELS_MAX", "10"))
FLOOD_BUFFER = float(os.environ.get("FLOOD_WAIT_BUFFER", "5"))
MAX_FLOODS_PER_HOUR = int(os.environ.get("MAX_FLOOD_WAITS_PER_HOUR", "5"))
PAUSE_EVERY_N = int(os.environ.get("PAUSE_AFTER_N_CHANNELS", "25"))
PAUSE_MIN = float(os.environ.get("PAUSE_DURATION_MIN", "120"))
PAUSE_MAX = float(os.environ.get("PAUSE_DURATION_MAX", "300"))
SKIP_RECENT_H = float(os.environ.get("SKIP_RECENTLY_SCRAPED_HOURS", "24"))

# ── Logging ──────────────────────────────────────────────────
LOG_FILE = OUTPUT_DIR / "scrape.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

log = logging.getLogger("scraper")
log.setLevel(logging.DEBUG)
# File handler
fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
fh.setLevel(logging.DEBUG)
fh.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)-5s %(message)s", "%Y-%m-%d %H:%M:%S"))
log.addHandler(fh)
# Console handler (INFO only, progress bar handles detail)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
ch.setFormatter(logging.Formatter("%(message)s"))
log.addHandler(ch)

# ── State File (resume support) ──────────────────────────────
STATE_FILE = OUTPUT_DIR / "scrape_state.json"

# ── Global State ─────────────────────────────────────────────
flood_times: list[float] = []       # timestamps of recent FloodWaitErrors
delay_multiplier = 1.0
shutdown_requested = False
session_stats = {
    "total_messages": 0,
    "total_duplicates": 0,
    "total_text_messages": 0,
    "channels_completed": 0,
    "channels_failed": {},
    "channels_skipped": 0,
    "flood_waits_count": 0,
    "flood_waits_total_seconds": 0,
}
# Cross-channel text dedup: set of sha256 hashes
seen_text_hashes: set[str] = set()


def _signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    global shutdown_requested
    shutdown_requested = True
    log.warning("Shutdown requested (Ctrl+C). Finishing current channel...")


signal.signal(signal.SIGINT, _signal_handler)


# ── Helpers ──────────────────────────────────────────────────

def _clean_channel(raw: str) -> str:
    """Extract username from various formats:
    'https://t.me/s/smlemay' → 'smlemay'
    'https://t.me/smlemay'   → 'smlemay'
    '@smlemay'               → 'smlemay'
    'smlemay'                → 'smlemay'
    """
    raw = raw.strip()
    # Handle t.me URLs
    for prefix in ("https://t.me/s/", "http://t.me/s/", "https://t.me/", "http://t.me/"):
        if raw.lower().startswith(prefix):
            raw = raw[len(prefix):]
            break
    # Strip @ and trailing slashes
    return raw.lstrip("@").rstrip("/").strip()


def _jitter(base: float) -> float:
    """Add random jitter: base + random(0, base*0.5)."""
    return base + random.uniform(0, base * 0.5)


def _text_hash(text: str) -> str:
    """SHA-256 of normalized text for deduplication."""
    normalized = " ".join(text.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


async def _safe_sleep(seconds: float, label: str = ""):
    """Sleep with logging for long waits."""
    if seconds > 10:
        log.info("  Sleeping %.0fs%s", seconds, (" (%s)" % label) if label else "")
    await asyncio.sleep(seconds)


def _count_recent_floods() -> int:
    """Count flood waits in the last hour."""
    cutoff = time.time() - 3600
    return sum(1 for t in flood_times if t > cutoff)


def _update_delay_multiplier():
    """Adjust delay multiplier based on recent flood waits."""
    global delay_multiplier
    recent = _count_recent_floods()
    if recent == 0:
        delay_multiplier = 1.0
    elif recent <= 2:
        delay_multiplier = 1.5
    elif recent <= 5:
        delay_multiplier = 2.5
    else:
        delay_multiplier = 3.0
    log.debug("Delay multiplier now %.1fx (floods in last hour: %d)", delay_multiplier, recent)


async def _handle_flood(e: FloodWaitError):
    """Handle a FloodWaitError: log, sleep, update stats."""
    wait = e.seconds + FLOOD_BUFFER
    flood_times.append(time.time())
    session_stats["flood_waits_count"] += 1
    session_stats["flood_waits_total_seconds"] += e.seconds
    _update_delay_multiplier()
    log.warning("FloodWaitError: Telegram says wait %ds, sleeping %ds (buffer +%ds)",
                e.seconds, wait, FLOOD_BUFFER)

    # Auto-pause if too many floods
    if _count_recent_floods() >= MAX_FLOODS_PER_HOUR:
        pause = 3600
        log.warning("Too many flood waits (%d in last hour). Auto-pausing for %ds.",
                    _count_recent_floods(), pause)
        await _safe_sleep(pause, "auto-pause: too many floods")
        flood_times.clear()
        return

    # Extra long pause for very long flood waits
    if e.seconds > 300:
        wait += 600  # extra 10 min
        log.warning("Long flood wait (>300s). Adding 10min extra buffer.")

    await _safe_sleep(wait, "flood wait")


async def safe_get_entity(client, username: str):
    """Resolve a channel username with FloodWaitError handling."""
    try:
        await _safe_sleep(_jitter(DELAY_API * delay_multiplier), "pre-resolve")
        return await client.get_entity(username)
    except FloodWaitError as e:
        await _handle_flood(e)
        return await client.get_entity(username)


def _progress_bar(current: int, total: int, width: int = 30, label: str = "") -> str:
    """Render a text progress bar."""
    if total <= 0:
        pct = 0
    else:
        pct = min(current / total, 1.0)
    filled = int(width * pct)
    bar = "█" * filled + "░" * (width - filled)
    pct_str = "%.1f%%" % (pct * 100)
    if label:
        return "%s [%s] %d/%d (%s)" % (label, bar, current, total, pct_str)
    return "[%s] %d/%d (%s)" % (bar, current, total, pct_str)


def _format_duration(seconds: float) -> str:
    """Format seconds into human-readable duration."""
    if seconds < 60:
        return "%ds" % seconds
    if seconds < 3600:
        return "%dm %ds" % (seconds // 60, seconds % 60)
    return "%dh %dm" % (seconds // 3600, (seconds % 3600) // 60)


def _save_state(channels_remaining: list, channels_total: int, started_at: str):
    """Save scrape state for resume support."""
    state = {
        "session_id": started_at,
        "started_at": started_at,
        "channels_total": channels_total,
        "channels_completed": session_stats["channels_completed"],
        "channels_remaining": channels_remaining,
        "channels_failed": session_stats["channels_failed"],
        "channels_skipped": session_stats["channels_skipped"],
        "total_messages_scraped": session_stats["total_messages"],
        "total_text_messages": session_stats["total_text_messages"],
        "total_duplicates": session_stats["total_duplicates"],
        "flood_waits_count": session_stats["flood_waits_count"],
        "flood_waits_total_seconds": session_stats["flood_waits_total_seconds"],
        "current_delay_multiplier": delay_multiplier,
        "last_updated": datetime.now().isoformat(),
    }
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ── Scrape Logic ─────────────────────────────────────────────

SKIP_ERRORS = (
    ChannelPrivateError,
    ChannelInvalidError,
    UsernameNotOccupiedError,
    ChatAdminRequiredError,
)


async def scrape_channel(client, channel_username: str, use_convex: bool, ch_index: int, ch_total: int):
    """Scrape a single channel with full rule compliance."""
    prefix = "[%d/%d] @%s" % (ch_index, ch_total, channel_username)
    log.info("")
    log.info("── %s ──", prefix)

    # ── Check last scrape timestamp ──
    last_message_dt = None
    if use_convex:
        from convex_db import get_last_scrape
        scrape_log = get_last_scrape(channel_username)
        if scrape_log and scrape_log.get("last_message_date"):
            last_msg_str = scrape_log["last_message_date"]
            try:
                last_message_dt = datetime.strptime(last_msg_str, "%Y-%m-%d %H:%M:%S")
                # Check if recently scraped
                hours_ago = (datetime.now() - last_message_dt).total_seconds() / 3600
                if hours_ago < SKIP_RECENT_H:
                    log.info("  %s: Scraped %.1fh ago (< %dh). Skipping.", prefix, hours_ago, SKIP_RECENT_H)
                    session_stats["channels_skipped"] += 1
                    return
                log.info("  Last scrape: %s → fetching newer only.", last_msg_str)
            except ValueError:
                log.warning("  Could not parse last_message_date: %s, scraping all.", last_msg_str)
    else:
        log_path = OUTPUT_DIR / "scrape_log.json"
        if log_path.exists():
            try:
                log_data = json.loads(log_path.read_text())
                ch_log = log_data.get(channel_username)
                if ch_log and ch_log.get("last_message_date"):
                    last_message_dt = datetime.strptime(ch_log["last_message_date"], "%Y-%m-%d %H:%M:%S")
                    log.info("  Last scrape: %s → fetching newer only.", ch_log["last_message_date"])
            except (json.JSONDecodeError, ValueError):
                pass

    # ── Resolve entity (with flood handling) ──
    try:
        entity = await safe_get_entity(client, channel_username)
    except SKIP_ERRORS as e:
        log.error("  %s: Cannot access — %s: %s", prefix, type(e).__name__, e)
        session_stats["channels_failed"][channel_username] = type(e).__name__
        return
    except FloodWaitError as e:
        await _handle_flood(e)
        try:
            entity = await client.get_entity(channel_username)
        except Exception as e2:
            log.error("  %s: Failed after flood retry — %s", prefix, e2)
            session_stats["channels_failed"][channel_username] = str(e2)
            return
    except Exception as e:
        log.error("  %s: Unexpected error — %s: %s", prefix, type(e).__name__, e)
        session_stats["channels_failed"][channel_username] = str(e)
        await _safe_sleep(30, "error cooldown")
        return

    # ── Fetch messages ──
    text_entries = []
    messages_full = []
    count = 0
    skipped = 0
    duplicates = 0
    newest_date_str = ""
    ch_start = time.time()

    try:
        async for msg in client.iter_messages(entity):
            if shutdown_requested:
                log.warning("  Shutdown requested. Saving progress for @%s...", channel_username)
                break

            # Skip already-scraped messages
            if last_message_dt and msg.date:
                msg_naive = msg.date.replace(tzinfo=None)
                if msg_naive <= last_message_dt:
                    skipped += 1
                    if skipped == 1:
                        log.info("  Reached already-scraped messages, stopping.")
                    break  # Messages are newest-first, so we can break

            count += 1
            msg_id = msg.id
            msg_date = msg.date.strftime("%Y-%m-%d %H:%M:%S") if msg.date else ""
            link = "https://t.me/%s/%s" % (channel_username, msg_id)
            text_content = (msg.text or "").strip()

            if msg_date and msg_date > newest_date_str:
                newest_date_str = msg_date

            # Check for forwarded message info
            is_forward = getattr(msg, "forward", None) is not None

            full_record = {
                "id": msg_id,
                "date": msg_date,
                "link": link,
                "views": getattr(msg, "views", None),
                "forward": is_forward,
                "type": "text" if not msg.media else ("image" if hasattr(msg.media, "photo") else "document"),
            }

            if text_content:
                # Deduplication: check text hash
                th = _text_hash(text_content)
                is_dup = th in seen_text_hashes
                if is_dup:
                    duplicates += 1
                    session_stats["total_duplicates"] += 1
                seen_text_hashes.add(th)

                full_record["text"] = text_content
                full_record["word_count"] = len(text_content.split())
                text_entries.append({
                    "id": msg_id,
                    "date": msg_date,
                    "text": text_content,
                    "views": full_record["views"],
                    "link": link,
                    "is_forward": is_forward,
                    "word_count": full_record["word_count"],
                    "is_caption": bool(msg.media),
                    "is_duplicate": is_dup,
                    "text_hash": th[:16],
                })
                # Save individual text file
                try:
                    ch_dir = TEXT_DIR / channel_username
                    ch_dir.mkdir(parents=True, exist_ok=True)
                    (ch_dir / f"{msg_id}.txt").write_text(text_content, encoding="utf-8")
                except OSError:
                    pass

            messages_full.append(full_record)
            session_stats["total_messages"] += 1

            # Progress every 200 messages
            if count % 200 == 0:
                elapsed = time.time() - ch_start
                rate = count / elapsed if elapsed > 0 else 0
                log.info("  %s: %d messages (%.0f msg/s) %d duplicates",
                         prefix, count, rate, duplicates)

            # Brief pause every 500 messages to be safe (SCRAPER_RULES.md §4.2)
            if count % 500 == 0:
                await _safe_sleep(_jitter(1.0 * delay_multiplier), "500-msg pause")

    except FloodWaitError as e:
        await _handle_flood(e)
        log.warning("  %s: FloodWait during iter_messages after %d msgs. Saving what we have.", prefix, count)
    except Exception as e:
        log.error("  %s: Error during message fetch after %d msgs — %s: %s",
                  prefix, count, type(e).__name__, e)

    # ── Save results ──
    ch_elapsed = time.time() - ch_start
    session_stats["total_text_messages"] += len(text_entries)

    if count == 0 and skipped == 0:
        log.info("  %s: No messages found.", prefix)
        session_stats["channels_completed"] += 1
        return

    if count == 0:
        log.info("  %s: Already up to date (%d skipped).", prefix, skipped)
        session_stats["channels_completed"] += 1
        return

    if not newest_date_str:
        newest_date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    summary_text = (
        "Extraction Summary (text only)\n"
        "Channel: %s\n"
        "New text messages: %d\n"
        "Duplicates: %d\n"
        "Skipped (already scraped): %d\n"
        "Full records: %d\n"
        "Duration: %s"
    ) % (channel_username, len(text_entries), duplicates, skipped, len(messages_full),
         _format_duration(ch_elapsed))

    if use_convex:
        from convex_db import (
            save_text_messages as convex_save,
            save_summary as convex_save_summary,
            update_scrape_log,
        )
        convex_save(channel_username, text_entries)
        convex_save_summary(channel_username, summary_text)
        update_scrape_log(channel_username, newest_date_str, count)
        log.info("  %s: %d texts | %d dupes | %d skipped → Convex (took %s)",
                 prefix, len(text_entries), duplicates, skipped, _format_duration(ch_elapsed))
    elif os.environ.get("DATABASE_URL"):
        from db import init_tables, save_text_messages
        init_tables()
        save_text_messages(text_entries, summary_text)
        _save_local_scrape_log(channel_username, newest_date_str, count)
        log.info("  %s: %d texts | %d dupes | %d skipped → Database (took %s)",
                 prefix, len(text_entries), duplicates, skipped, _format_duration(ch_elapsed))
    else:
        ch_out = OUTPUT_DIR / channel_username
        ch_out.mkdir(parents=True, exist_ok=True)
        with open(ch_out / "text_messages.json", "w", encoding="utf-8") as f:
            json.dump(text_entries, f, ensure_ascii=False, indent=2)
        with open(ch_out / "messages_full.json", "w", encoding="utf-8") as f:
            json.dump(messages_full, f, ensure_ascii=False, indent=2)
        _save_local_scrape_log(channel_username, newest_date_str, count)
        log.info("  %s: %d texts | %d dupes | %d skipped → output/%s/ (took %s)",
                 prefix, len(text_entries), duplicates, skipped, channel_username,
                 _format_duration(ch_elapsed))

    session_stats["channels_completed"] += 1


# ── Main ─────────────────────────────────────────────────────

async def run():
    phone = os.environ.get("PHONE", "").strip()
    if not phone:
        phone = input("Enter your Telegram phone (e.g. +966...): ").strip()
    if not phone:
        print("PHONE required.")
        return

    use_convex = bool(os.environ.get("CONVEX_URL"))

    # ── Gather channels ──
    channels = set()
    if use_convex:
        from convex_db import get_exam_channels
        exams = get_exam_channels() or []
        for exam in exams:
            for c in exam.get("channels", []):
                channels.add(_clean_channel(c))
    else:
        c = os.environ.get("CHANNEL_USERNAME", "").strip().lstrip("@")
        if c:
            channels.add(_clean_channel(c))
    channels.discard("")

    if not channels:
        log.error("No channels found. Add channels in the UI, or set CHANNEL_USERNAME in .env.")
        return

    channels = sorted(channels)

    # ── Check for resume ──
    channels_remaining = list(channels)
    resumed = False
    if STATE_FILE.exists():
        try:
            prev = json.loads(STATE_FILE.read_text())
            if prev.get("channels_remaining"):
                print("\n=== Previous Session Found ===")
                print("  Started:    %s" % prev["started_at"])
                print("  Completed:  %d/%d channels" % (prev["channels_completed"], prev["channels_total"]))
                print("  Messages:   %d scraped" % prev["total_messages_scraped"])
                print("  Remaining:  %d channels" % len(prev["channels_remaining"]))
                print("")
                choice = input("Resume previous session? [Y/n]: ").strip().lower()
                if choice != "n":
                    channels_remaining = prev["channels_remaining"]
                    session_stats["total_messages"] = prev.get("total_messages_scraped", 0)
                    session_stats["total_text_messages"] = prev.get("total_text_messages", 0)
                    session_stats["total_duplicates"] = prev.get("total_duplicates", 0)
                    session_stats["channels_completed"] = prev.get("channels_completed", 0)
                    session_stats["channels_failed"] = prev.get("channels_failed", {})
                    session_stats["flood_waits_count"] = prev.get("flood_waits_count", 0)
                    session_stats["flood_waits_total_seconds"] = prev.get("flood_waits_total_seconds", 0)
                    resumed = True
                    log.info("Resumed session from %s (%d channels remaining).",
                             prev["started_at"], len(channels_remaining))
        except (json.JSONDecodeError, KeyError):
            pass

    total_channels = len(channels)
    started_at = datetime.now().isoformat()

    # ── Scrape Plan ──
    print("")
    print("=" * 50)
    print("  SCRAPE PLAN")
    print("=" * 50)
    print("  Total channels:       %d" % total_channels)
    print("  To scrape this run:   %d%s" % (len(channels_remaining), " (resumed)" if resumed else ""))
    print("  Delay/API call:       %.1fs (x%.1f multiplier)" % (DELAY_API, delay_multiplier))
    print("  Delay/channel:        %.0f-%.0fs" % (DELAY_CH_MIN, DELAY_CH_MAX))
    print("  Break every:          %d channels (%.0f-%.0fs)" % (PAUSE_EVERY_N, PAUSE_MIN, PAUSE_MAX))
    print("  Skip if scraped <     %dh ago" % SKIP_RECENT_H)
    print("  Flood wait buffer:    +%.0fs" % FLOOD_BUFFER)
    print("  Max floods/hour:      %d (then auto-pause 1h)" % MAX_FLOODS_PER_HOUR)
    print("  Log file:             %s" % LOG_FILE)
    print("  State file:           %s" % STATE_FILE)
    print("=" * 50)
    print("")

    confirm = input("Proceed? [Y/n]: ").strip().lower()
    if confirm == "n":
        print("Aborted.")
        return

    # ── Connect ──
    log.info("Connecting to Telegram...")
    client = TelegramClient("exams_session", API_ID, API_HASH, system_version="4.16.30")
    await client.start(phone=phone)
    log.info("Connected to Telegram.")

    session_start = time.time()

    # ── Scrape loop ──
    for i, ch_name in enumerate(list(channels_remaining), 1):
        if shutdown_requested:
            log.warning("Shutdown requested. Saving state and exiting.")
            break

        # Channel progress bar
        print("")
        print(_progress_bar(
            session_stats["channels_completed"], total_channels,
            label="Channels"))
        print("  Next: @%s (%d of %d remaining)" % (ch_name, len(channels_remaining), total_channels))
        elapsed = time.time() - session_start
        if session_stats["channels_completed"] > 0:
            avg_per_ch = elapsed / session_stats["channels_completed"]
            eta = avg_per_ch * len(channels_remaining)
            print("  Speed: %.1f ch/hour | ETA: %s | Floods: %d (x%.1f delay)" % (
                3600 / avg_per_ch if avg_per_ch > 0 else 0,
                _format_duration(eta),
                session_stats["flood_waits_count"],
                delay_multiplier,
            ))
        print("  Session: %s | %d msgs total | %d duplicates" % (
            _format_duration(elapsed),
            session_stats["total_messages"],
            session_stats["total_duplicates"],
        ))

        await scrape_channel(client, ch_name, use_convex,
                             session_stats["channels_completed"] + 1, total_channels)

        # Remove from remaining
        if ch_name in channels_remaining:
            channels_remaining.remove(ch_name)

        # Save state after each channel
        _save_state(channels_remaining, total_channels, started_at)

        # Inter-channel delay (with jitter)
        if channels_remaining and not shutdown_requested:
            delay = random.uniform(DELAY_CH_MIN, DELAY_CH_MAX) * delay_multiplier
            log.debug("  Inter-channel delay: %.1fs", delay)
            await _safe_sleep(delay, "between channels")

        # Periodic break (SCRAPER_RULES.md §8.1)
        if (session_stats["channels_completed"] % PAUSE_EVERY_N == 0
                and session_stats["channels_completed"] > 0
                and channels_remaining
                and not shutdown_requested):
            pause = random.uniform(PAUSE_MIN, PAUSE_MAX)
            log.info("Periodic break after %d channels. Pausing %s...",
                     session_stats["channels_completed"], _format_duration(pause))
            await _safe_sleep(pause, "periodic break")

    # ── Disconnect ──
    await client.disconnect()

    # ── Final Summary ──
    total_time = time.time() - session_start
    print("")
    print("=" * 50)
    print("  SCRAPE COMPLETE")
    print("=" * 50)
    print("  Duration:          %s" % _format_duration(total_time))
    print("  Channels done:     %d / %d" % (session_stats["channels_completed"], total_channels))
    print("  Channels failed:   %d" % len(session_stats["channels_failed"]))
    print("  Channels skipped:  %d (recently scraped)" % session_stats["channels_skipped"])
    print("  Messages scraped:  %d" % session_stats["total_messages"])
    print("  Text messages:     %d" % session_stats["total_text_messages"])
    print("  Duplicates:        %d" % session_stats["total_duplicates"])
    print("  Flood waits:       %d (total %ds)" % (
        session_stats["flood_waits_count"], session_stats["flood_waits_total_seconds"]))
    print("  Delay multiplier:  %.1fx" % delay_multiplier)
    if session_stats["channels_failed"]:
        print("  Failed channels:")
        for ch_name, err in session_stats["channels_failed"].items():
            print("    @%s: %s" % (ch_name, err))
    print("=" * 50)
    print("  Log: %s" % LOG_FILE)
    print("  State: %s" % STATE_FILE)
    print("=" * 50)

    log.info("Session complete. %d channels, %d messages, %d duplicates in %s.",
             session_stats["channels_completed"], session_stats["total_messages"],
             session_stats["total_duplicates"], _format_duration(total_time))

    # Clear state file if all done
    if not channels_remaining:
        STATE_FILE.unlink(missing_ok=True)
        log.info("All channels scraped. State file cleared.")


def _save_local_scrape_log(channel: str, newest_date_str: str, messages_scraped: int):
    """Save scrape log to local JSON file for non-Convex modes."""
    log_path = OUTPUT_DIR / "scrape_log.json"
    log_data = {}
    if log_path.exists():
        try:
            log_data = json.loads(log_path.read_text())
        except json.JSONDecodeError:
            pass
    log_data[channel] = {
        "last_scrape_date": datetime.now().isoformat(),
        "last_message_date": newest_date_str,
        "messages_scraped": messages_scraped,
    }
    log_path.write_text(json.dumps(log_data, indent=2))


if __name__ == "__main__":
    asyncio.run(run())
