# NearbyDoc

Find doctors near you.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Provider order in .env
PROVIDER_ORDER=pollinations,ollama,openrouter,gemini
POLLINATIONS_URL=https://text.pollinations.ai/openai
POLLINATIONS_MODEL=openai
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:0.5b

# Optional: add a free OpenRouter API key
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free

# 3. Start dev server
npm run dev
```

Then open http://localhost:5173

## Free LLM Options

Recommended:
- Pollinations AI: keyless text API, enabled by default for immediate local use.
- Ollama: local, no API key. Install from https://ollama.com and run `ollama pull qwen2.5:0.5b`.
- OpenRouter: create a key at https://openrouter.ai/keys and use `OPENROUTER_MODEL=openrouter/free`.

## Real Nearby Places

For accurate doctors, clinics, phone numbers, ratings, and opening hours, use Google Places API (New).

1. Open https://console.cloud.google.com/apis/credentials?project=kista-aa6ae
2. Enable `Places API (New)` if Google asks.
3. Click `Create Credentials` -> `API key`.
4. Paste it into `.env`:

```env
GOOGLE_PLACES_API_KEY=your_real_google_key_here
```

Restart the app after saving `.env`.

Fallback:
- Gemini CLI: run `npx @google/gemini-cli` once and sign in. NearbyDoc will use Gemini CLI if `OPENROUTER_API_KEY` is empty.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add your environment variable:
- Key: `OPENROUTER_API_KEY`
- Value: your OpenRouter API key

## Build for production

```bash
npm run build
```

Output is in the `dist/` folder.
