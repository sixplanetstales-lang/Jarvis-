# NEXUS AI Assistant

A static, mobile-first AI study assistant page for NEXUS. It uses the user's own Google Gemini API key directly in the browser and stores chats/settings only in `localStorage`. No backend, paid service, or fake fallback responses are included.

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Connect Gemini

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and sign in.
2. Select **Create API key**.
3. In NEXUS, open Settings, choose Google Gemini, paste the key, and save it.

The key is kept in this browser's localStorage and sent directly to Google's Gemini API. For a public deployment, consider using a separate restricted key and understand that browser-side keys can be inspected by users. NEXUS turns quota errors into a plain-language message.

## Optional on-device provider

The Settings panel includes a WebGPU availability check and model-download UI. This repository intentionally does not ship a fake local inference implementation or pretend that a script is an AI model. To productionize the optional provider, load a pinned WebLLM bundle and connect its engine's streaming `chat.completions` method in `app.js`'s provider abstraction.

## Deploy free with GitHub Pages

1. Push these files to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then **Save**.
5. Wait for the Pages URL to appear. No build step is required.

All app state is browser-local. Clearing site data clears chat history, notes, and the saved key.
