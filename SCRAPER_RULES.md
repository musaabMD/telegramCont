# Telegram Scraper Rules & Operating Procedures

> **Purpose:** This document defines the rules, rate limits, and operational procedures
> that ALL scraping code in this project MUST follow. Any code change must be reviewed
> against these rules before merging. We are scraping **hundreds of public channels**
> using a Telethon **user client (MTProto)** — we have time, so we never rush.

---

## 1. Golden Rules

1. **Never rush.** We have time. A slow scraper that runs forever beats a fast one that gets banned.
2. **FloodWaitError is the law.** If Telegram says wait, we wait exactly that long + buffer.
3. **No parallel history fetching.** One `get_history`/`iter_messages` stream at a time.
4. **Deduplicate everything.** Messages forwarded across channels must not be stored twice.
5. **Log everything.** Every action, every error, every wait — timestamped to a log file.
6. **Progress must be visible.** Progress bars, ETAs, and live stats at all times.
7. **Graceful shutdown.** Ctrl+C saves state immediately; next run resumes where we left off.

---

## 2. Telegram Rate Limits (MTProto/Telethon)

Telegram does **not** publish fixed rate limits for MTProto. Instead, it enforces
**dynamic flood limits** via `FloodWaitError(X seconds)`.

### 2.1 What We Know

| Action | Observed Safe Rate | Source |
|--------|-------------------|--------|
| `get_history` / `iter_messages` | ~1 request/sec total | [Telethon docs](https://docs.telethon.dev/en/stable/quick-references/faq.html) |
| `get_entity` (resolve username) | ~1 every 2-3 sec | Community observation |
| Joining channels | ~5-10 per hour | Community observation |
| Account channel membership | ~500 channels max | Varies by account age |

### 2.2 FloodWaitError Handling (MANDATORY)

```python
from telethon.errors import FloodWaitError
import asyncio

try:
    # any Telegram API call
    result = await client.some_method()
except FloodWaitError as e:
    wait_time = e.seconds + 5  # always add 5s buffer
    log.warning("FloodWait: sleeping %d seconds (requested %d)", wait_time, e.seconds)
    await asyncio.sleep(wait_time)
    result = await client.some_method()  # retry once
```

**Every single Telegram API call** must be wrapped in FloodWaitError handling. No exceptions.

---

## 3. Rate Limit Configuration

### 3.1 Per-Request Delays (Conservative Defaults)

| Setting | Value | Description |
|---------|-------|-------------|
| `DELAY_BETWEEN_MESSAGES` | `0.0s` | Delay within `iter_messages` pagination (Telethon handles internally) |
| `DELAY_BETWEEN_API_CALLS` | `1.2s` | Delay between explicit API calls (get_entity, get_history batches) |
| `DELAY_BETWEEN_CHANNELS` | `5-10s` | Random delay before starting next channel (uniform random) |
| `DELAY_AFTER_FLOOD_WAIT` | `FloodWait + 5s` | Always add 5s buffer to Telegram's requested wait |
| `DELAY_ON_ERROR` | `30s` | Wait before retrying after non-flood errors |

### 3.2 Per-Time-Window Limits

| Window | Max API Calls | Max Channels | Max Messages |
|--------|--------------|--------------|--------------|
| **Per second** | 1 | — | ~100 (via iter_messages pagination) |
| **Per minute** | 50 | 5-6 | ~5,000 |
| **Per hour** | 2,500 | 200 | ~250,000 |
| **Per day (24h)** | 50,000 | All | No hard cap |
| **Per channel** | No limit | — | All messages (with proper pacing) |

### 3.3 Backoff Strategy

If we receive a `FloodWaitError`, increase delays globally:

| Flood Waits in Last Hour | Action |
|--------------------------|--------|
| 0 | Use default delays |
| 1-2 | Multiply all delays by 1.5x |
| 3-5 | Multiply all delays by 2.5x |
| 6+ | **Stop scraping for 1 hour**, then resume at 3x delays |

---

## 4. Channel Processing Order

### 4.1 Round-Robin (NOT Sequential Bulk)

**Wrong:** Scrape all 10,000 messages from Channel A, then all from Channel B.
**Right:** Scrape a batch from A, sleep, batch from B, sleep, batch from C, ... cycle back to A.

```
Round 1: Channel A (batch) → sleep → Channel B (batch) → sleep → Channel C (batch)
Round 2: Channel A (batch) → sleep → Channel B (batch) → sleep → Channel C (batch)
...until all channels are fully scraped
```

However, for **initial backfill** of hundreds of channels, sequential-per-channel is acceptable
with proper inter-channel delays, since each channel needs its full history once.

### 4.2 Batch Size Per Channel

- **Backfill mode** (first scrape): Use `iter_messages` with no limit, but let Telethon
  handle pagination naturally. Add `1.0s` delay every 500 messages processed.
- **Update mode** (subsequent scrapes): Fetch only messages newer than `last_message_date`.
  This is inherently fast and low-volume.

### 4.3 Channel Prioritization

1. Channels never scraped before (no scrape_log entry)
2. Channels with oldest `last_scrape_date`
3. Channels recently scraped (lowest priority)

---

## 5. Deduplication

Since we scrape hundreds of channels, the same message may appear in multiple channels
(forwarded messages). We must deduplicate.

### 5.1 Message Identity

A message is uniquely identified by: `(channel_username, message_id)`

### 5.2 Cross-Channel Deduplication

For forwarded messages, also track:
- `forward_from_channel` + `forward_message_id` (if available)
- Text hash (SHA-256 of normalized text) for detecting copy-pasted content

### 5.3 Skip Logic

Before storing a message:
1. Check if `(channel, message_id)` already exists → skip
2. If forwarded, check if original `(forward_channel, forward_id)` already stored → store but mark as `is_duplicate: true`
3. Compute text hash → if identical text already stored from another channel within 24h → mark as `is_duplicate: true`

---

## 6. Logging & Progress Tracking

### 6.1 Log File

All scraping activity must be logged to `output/scrape.log` with rotation:

```
[2026-02-07 14:32:01] INFO  Starting scrape session. 147 channels queued.
[2026-02-07 14:32:03] INFO  [1/147] @channel_name: Resolving entity...
[2026-02-07 14:32:04] INFO  [1/147] @channel_name: Fetching messages (last scrape: 2026-02-05 10:00:00)
[2026-02-07 14:32:15] INFO  [1/147] @channel_name: 342 new messages fetched, 12 duplicates skipped
[2026-02-07 14:32:16] INFO  [1/147] @channel_name: Saved to Convex. Took 12.4s
[2026-02-07 14:32:21] WARN  FloodWaitError: 17s requested, sleeping 22s
[2026-02-07 14:35:00] INFO  Session stats: 5 channels done, 142 remaining, ~3h 20m ETA
```

### 6.2 Progress Bar

Display a live progress bar showing:
```
Channels: [████████░░░░░░░░░░░░] 42/147 (28.6%)  ETA: 2h 15m
Current:  @exam_channel_xyz  [██████████████░░░░░░] 1,847/~3,200 msgs
Speed:    ~95 msgs/sec | 4.2 channels/hour
Flood:    0 waits this session | Delay multiplier: 1.0x
Session:  Running 1h 23m | 38,421 messages total | 1,203 duplicates
```

### 6.3 State File (Resume Support)

Maintain `output/scrape_state.json`:
```json
{
  "session_id": "2026-02-07T14:32:01",
  "started_at": "2026-02-07T14:32:01",
  "channels_total": 147,
  "channels_completed": 42,
  "channels_remaining": ["channel_x", "channel_y", ...],
  "channels_failed": {"channel_z": "ChannelPrivateError"},
  "total_messages_scraped": 38421,
  "total_duplicates": 1203,
  "flood_waits_count": 2,
  "flood_waits_total_seconds": 39,
  "current_delay_multiplier": 1.0,
  "last_updated": "2026-02-07T15:55:12"
}
```

On startup, if `scrape_state.json` exists and `channels_remaining` is non-empty,
**ask the user** whether to resume or start fresh.

---

## 7. Work Plan & Scheduling

### 7.1 Session Planning

Before scraping, the script must:
1. Load all channels from Convex
2. Check scrape_log for each channel's last scrape date
3. Sort by priority (see 4.3)
4. Estimate total work (channels * estimated messages)
5. Print a summary and ask for confirmation:

```
=== Scrape Plan ===
Total channels: 147
  - Never scraped: 23
  - Needs update (>24h old): 89
  - Recently scraped (<24h): 35 (will skip)
Estimated messages to fetch: ~450,000
Estimated time at safe rate: ~4.5 hours
Delay settings: 1.2s/call, 5-10s/channel

Proceed? [Y/n]
```

### 7.2 Auto-Pause Rules

The scraper must automatically pause when:
- 6+ FloodWaitErrors in the last hour → pause 1 hour
- Any single FloodWait > 300 seconds → pause for that duration + 10 minutes
- Network error (connection lost) → retry 3 times with exponential backoff, then pause 5 min
- Telegram returns "AUTH_KEY_UNREGISTERED" → stop immediately, session is dead

### 7.3 Daily Schedule (Optional)

For long-running deployments, configure operating hours:
```
SCRAPE_HOURS_START=06:00    # Start scraping at 6 AM (server time)
SCRAPE_HOURS_END=23:00      # Stop at 11 PM
SCRAPE_DAYS=mon,tue,wed,thu,fri,sat,sun
```

---

## 8. Anti-Suspicious-Activity Measures

### 8.1 Behavioral Patterns

- **Randomize delays:** Never use fixed sleep times. Always `base_delay + random(0, base_delay * 0.5)`
- **Vary batch sizes:** Don't always fetch exactly the same number of messages
- **Natural pacing:** Occasional longer pauses (every 20-30 channels, take a 2-5 minute break)
- **Single session:** Never run multiple scraper instances on the same account simultaneously
- **Don't resolve entities aggressively:** Cache entity resolution results; re-resolve only every 24h

### 8.2 Account Safety

- Use `system_version="4.16.30"` (current code already does this — good)
- Don't change the `device_model`, `app_version` between sessions
- Keep the `exams_session` file safe — it IS your login
- Don't join/leave channels rapidly. If you need to join channels, max 5-10 per hour with random delays
- Don't perform other Telegram actions (sending messages, changing profile) while scraping

### 8.3 What NOT to Do

- Never fetch messages from 100+ channels simultaneously (parallel)
- Never use multiple accounts to scrape the same channels
- Never scrape private channels you don't have legitimate access to
- Never exceed 100,000 API calls in a single day from one account
- Never ignore FloodWaitError by reconnecting with a new session

---

## 9. Error Handling Matrix

| Error | Action | Retry? |
|-------|--------|--------|
| `FloodWaitError(X)` | Sleep X+5 seconds, increment flood counter | Yes, once |
| `ChannelPrivateError` | Log, mark channel as inaccessible, skip | No |
| `ChannelInvalidError` | Log, mark channel as invalid, skip | No |
| `UsernameNotOccupiedError` | Log, mark channel as not found, skip | No |
| `ChatAdminRequiredError` | Log, mark as restricted, skip | No |
| `ConnectionError` | Exponential backoff (5s, 10s, 20s), max 3 retries | Yes, 3x |
| `TimeoutError` | Wait 10s, retry | Yes, 3x |
| `AuthKeyUnregisteredError` | **STOP immediately.** Session expired. | No |
| `UserDeactivatedBanError` | **STOP immediately.** Account banned. | No |
| Any unknown error | Log full traceback, wait 30s, continue to next channel | Skip channel |

---

## 10. Current Code Violations

> **These must be fixed before running at scale.**

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `extract_text_only.py` | 115 | `asyncio.sleep(0.03)` — 30ms is dangerously fast. Remove or increase to 0s (let Telethon handle) | **CRITICAL** |
| `extract_text_only.py` | 67 | `iter_messages` has no FloodWaitError handling | **CRITICAL** |
| `extract_text_only.py` | 56 | `get_entity` has no FloodWaitError handling | **HIGH** |
| `extract_text_only.py` | 193-194 | No delay between channels in the loop | **HIGH** |
| `extract_text_only.py` | — | No progress bar or ETA | **MEDIUM** |
| `extract_text_only.py` | — | No deduplication for forwarded messages | **MEDIUM** |
| `extract_text_only.py` | — | No resume support if interrupted mid-run | **MEDIUM** |
| `extract_text_only.py` | — | No file-based logging (only print statements) | **LOW** |
| `test_connection.py` | 103 | `asyncio.sleep(0.5)` — should be 2-3s between entity resolutions | **HIGH** |
| `test_connection.py` | 66-73 | No FloodWaitError handling | **HIGH** |

---

## 11. Configuration (.env)

Add these to `.env` for tunable rate limiting:

```bash
# ── Rate Limiting ──
DELAY_BETWEEN_API_CALLS=1.2       # Seconds between Telegram API calls
DELAY_BETWEEN_CHANNELS_MIN=5      # Min seconds between channels
DELAY_BETWEEN_CHANNELS_MAX=10     # Max seconds between channels
FLOOD_WAIT_BUFFER=5               # Extra seconds added to FloodWait
MAX_FLOOD_WAITS_PER_HOUR=5        # Auto-pause threshold
PAUSE_AFTER_N_CHANNELS=25         # Take a break every N channels
PAUSE_DURATION_MIN=120            # Min break duration (seconds)
PAUSE_DURATION_MAX=300            # Max break duration (seconds)

# ── Behavior ──
SKIP_RECENTLY_SCRAPED_HOURS=24    # Skip channels scraped within N hours
MAX_CHANNELS_PER_SESSION=0        # 0 = unlimited
DRY_RUN=false                     # If true, plan but don't scrape
```

---

## 12. Pre-Flight Checklist

Before every scrape run:

- [ ] `.env` has valid `API_ID`, `API_HASH`, `PHONE`
- [ ] `exams_session` file exists (or will be created on first run)
- [ ] No other scraper instance is running on this account
- [ ] Check `scrape_state.json` for incomplete previous run
- [ ] Review the scrape plan output before confirming
- [ ] Ensure disk space is available for output files
- [ ] Verify network connection is stable

---

## 13. Metrics to Track Per Session

| Metric | Where |
|--------|-------|
| Total channels attempted | scrape_state.json + log |
| Channels completed / failed / skipped | scrape_state.json |
| Total messages scraped | scrape_state.json |
| Total duplicates detected | scrape_state.json |
| FloodWait count + total seconds | scrape_state.json |
| Errors by type | scrape.log |
| Average messages per channel | Computed at end |
| Total session duration | scrape_state.json |
| Messages per minute (throughput) | Live display |

---

*Last updated: 2026-02-07*
*Review this document whenever Telethon is upgraded or Telegram changes its API behavior.*
