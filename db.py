"""
PostgreSQL storage for extracted text (Railway or any DATABASE_URL).
When DATABASE_URL is set, viewer and extractor use the database instead of files.
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_conn():
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL)


def init_tables(conn=None):
    """Create tables if they don't exist."""
    if not DATABASE_URL:
        return
    close = conn is None
    if close:
        conn = get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS text_messages (
                    message_id BIGINT PRIMARY KEY,
                    date TEXT,
                    text TEXT NOT NULL,
                    views INTEGER,
                    link TEXT,
                    is_forward BOOLEAN DEFAULT FALSE,
                    word_count INTEGER,
                    is_caption BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS summary (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    content TEXT,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("INSERT INTO summary (id, content) VALUES (1, '') ON CONFLICT (id) DO NOTHING")
        conn.commit()
    finally:
        if close:
            conn.close()


def save_text_messages(entries: list, summary_text: str = ""):
    """Replace all text_messages and set summary."""
    if not DATABASE_URL or not entries:
        return
    conn = get_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM text_messages")
            for e in entries:
                cur.execute(
                    """INSERT INTO text_messages
                       (message_id, date, text, views, link, is_forward, word_count, is_caption)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (message_id) DO UPDATE SET
                       date=EXCLUDED.date, text=EXCLUDED.text, views=EXCLUDED.views,
                       link=EXCLUDED.link, is_forward=EXCLUDED.is_forward,
                       word_count=EXCLUDED.word_count, is_caption=EXCLUDED.is_caption""",
                    (
                        e.get("id"),
                        e.get("date") or "",
                        e.get("text") or "",
                        e.get("views"),
                        e.get("link") or "",
                        e.get("is_forward") or False,
                        e.get("word_count"),
                        e.get("is_caption") or False,
                    ),
                )
            cur.execute(
                "UPDATE summary SET content = %s, updated_at = NOW() WHERE id = 1",
                (summary_text or f"Text messages: {len(entries)}",),
            )
        conn.commit()
    finally:
        conn.close()


def get_text_messages():
    """Return list of text message dicts for API."""
    if not DATABASE_URL:
        return None
    conn = get_conn()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT message_id AS id, date, text, views, link,
                          is_forward, word_count, is_caption
                   FROM text_messages ORDER BY message_id DESC"""
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_summary():
    """Return summary content string."""
    if not DATABASE_URL:
        return None
    conn = get_conn()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT content FROM summary WHERE id = 1")
            row = cur.fetchone()
        return row[0] if row else ""
    finally:
        conn.close()
