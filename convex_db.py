"""
Convex storage backend.
When CONVEX_URL is set, viewer and extractor use Convex instead of files/Postgres.
"""
import os

CONVEX_URL = os.environ.get("CONVEX_URL")

_client = None


def get_client():
    """Lazy-init singleton ConvexClient."""
    global _client
    if _client is None and CONVEX_URL:
        from convex import ConvexClient
        _client = ConvexClient(CONVEX_URL)
    return _client


# ── Queries (used by viewer.py) ───────────────────────────────

def get_text_messages(channel: str):
    client = get_client()
    if not client:
        return None
    rows = client.query("messages:getTextMessages", {"channel": channel})
    return [
        {
            "id": r["message_id"],
            "date": r["date"],
            "text": r["text"],
            "views": r.get("views"),
            "link": r["link"],
            "is_forward": r["is_forward"],
            "word_count": r["word_count"],
            "is_caption": r["is_caption"],
        }
        for r in (rows or [])
    ]


def get_summary(channel: str):
    client = get_client()
    if not client:
        return None
    return client.query("messages:getSummary", {"channel": channel})


def get_pdfs(channel: str):
    client = get_client()
    if not client:
        return None
    rows = client.query("messages:getPdfs", {"channel": channel})
    return [
        {
            "message_id": r["message_id"],
            "filename": r["filename"],
            "original_name": r.get("original_name"),
            "file_size": r.get("file_size"),
            "date": r.get("date"),
            "link": r.get("link"),
        }
        for r in (rows or [])
    ]


def get_images(channel: str):
    client = get_client()
    if not client:
        return None
    rows = client.query("messages:getImages", {"channel": channel})
    return [
        {
            "message_id": r["message_id"],
            "filename": r["filename"],
            "caption": r.get("caption"),
            "file_size": r.get("file_size"),
            "date": r.get("date"),
            "link": r.get("link"),
        }
        for r in (rows or [])
    ]


def get_counts(channel: str):
    client = get_client()
    if not client:
        return None
    return client.query("messages:getCounts", {"channel": channel})


def get_counts_multi(channels: list):
    client = get_client()
    if not client:
        return None
    return client.query("messages:getCountsMulti", {"channels": channels})


# ── Mutations (used by extract_text_only.py) ──────────────────

BATCH_SIZE = 100  # Convex transaction limit safety


def save_text_messages(channel: str, entries: list):
    client = get_client()
    if not client:
        return
    for i in range(0, len(entries), BATCH_SIZE):
        batch = entries[i : i + BATCH_SIZE]
        client.mutation(
            "mutations:saveTextMessages",
            {
                "channel": channel,
                "messages": [
                    {
                        "message_id": e["id"],
                        "date": e.get("date", ""),
                        "text": e.get("text", ""),
                        "views": e.get("views"),
                        "link": e.get("link", ""),
                        "is_forward": e.get("is_forward", False),
                        "word_count": e.get("word_count", 0),
                        "is_caption": e.get("is_caption", False),
                    }
                    for e in batch
                ],
            },
        )


def save_summary(channel: str, content: str):
    client = get_client()
    if not client:
        return
    client.mutation("mutations:saveSummary", {"channel": channel, "content": content})


def save_pdfs_metadata(channel: str, pdfs: list):
    client = get_client()
    if not client:
        return
    for i in range(0, len(pdfs), BATCH_SIZE):
        batch = pdfs[i : i + BATCH_SIZE]
        client.mutation(
            "mutations:savePdfsMetadata",
            {"channel": channel, "pdfs": batch},
        )


def save_images_metadata(channel: str, images: list):
    client = get_client()
    if not client:
        return
    for i in range(0, len(images), BATCH_SIZE):
        batch = images[i : i + BATCH_SIZE]
        client.mutation(
            "mutations:saveImagesMetadata",
            {"channel": channel, "images": batch},
        )
