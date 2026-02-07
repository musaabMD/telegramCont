# contentq

Telegram channel extractor and web viewer. When `DATABASE_URL` is set (e.g. Railway Postgres), the viewer reads from the database and the extractor writes to it.

---

## Storing data on Railway using their database

1. **Add PostgreSQL to your Railway project**
   - In the [Railway dashboard](https://railway.app/dashboard), open your project (the one that runs the viewer).
   - Click **+ New** → **Database** → **PostgreSQL**.
   - Railway creates a Postgres service and exposes a connection URL.

2. **Connect the web service to the database**
   - Click your **web service** (the one that runs `gunicorn viewer:app`).
   - Go to **Variables**.
   - Add or confirm **`DATABASE_URL`**:
     - If Railway added it automatically when you linked the database, it may appear as a reference (e.g. `${{Postgres.DATABASE_URL}}`). That’s fine.
     - Otherwise, open the **Postgres** service → **Variables** (or **Connect**), copy the connection URL, and in the web service add:  
       `DATABASE_URL` = that URL (e.g. `postgresql://postgres:xxx@xxx.railway.app:5432/railway`).
   - Redeploy the web service so it picks up `DATABASE_URL`.

3. **Put data into the database**
   The viewer only shows data that’s in Postgres. You can fill it in either way:

   **Option A – Run the extractor locally (easiest)**  
   - In Railway: Postgres service → **Variables** (or **Connect**) → copy the **connection URL**.  
   - Locally, in `telegram-extractor`, create a `.env` (or export in terminal):
     - `DATABASE_URL=<paste the Railway Postgres URL>`
     - Keep your existing `API_ID`, `API_HASH`, `PHONE`, `CHANNEL_USERNAME` for Telegram.
   - Run:
     ```bash
     cd telegram-extractor
     source .venv/bin/activate   # or: .venv\Scripts\activate on Windows
     python extract_text_only.py
     ```
   - When it finishes, the text messages and summary are in Railway’s Postgres. The deployed viewer will then show them.

   **Option B – Run the extractor on Railway (one-off job)**  
   - Add a second service in the same project that runs the extractor (e.g. a script or `python extract_text_only.py`) with the same `DATABASE_URL` and Telegram env vars, run it once (or on a schedule), then the viewer will read from the same database.

4. **Check that it works**
   - Open your Railway viewer URL (e.g. `https://contentq-production.up.railway.app/`).
   - You should see the summary and message list from the database instead of “No summary yet”.
# telegramscfs
