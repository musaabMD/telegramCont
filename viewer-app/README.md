# Extracted Channel Content – Viewer (shadcn/ui)

React + Vite + Tailwind + shadcn/ui viewer for the Telegram extractor.

## Run

1. **Start the Flask API** (in the parent folder):
   ```bash
   cd ..
   source .venv/bin/activate
   python viewer.py
   ```
   Leave it running on http://127.0.0.1:5001.

2. **Start the frontend** (in this folder):
   ```bash
   cd viewer-app
   npm run dev
   ```
   Opens at http://localhost:5173 (Vite proxies `/api` and `/files` to the Flask server).

3. Open **http://localhost:5173** in your browser.

## Build for production

```bash
npm run build
```

Then serve the `dist/` folder (e.g. with Flask or any static server) and point API requests to your backend.
