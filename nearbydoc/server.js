import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Load .env from project root
try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* no .env file — that's fine */ }

const PORT                  = Number(process.env.NEARBYDOC_API_PORT || 8787);
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const hasGooglePlacesKey = Boolean(
  GOOGLE_PLACES_API_KEY
    && GOOGLE_PLACES_API_KEY !== "your_key_here"
    && !GOOGLE_PLACES_API_KEY.includes("PASTE")
);
const GEMINI_CLI_PACKAGE = process.env.GEMINI_CLI_PACKAGE || "@google/gemini-cli";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BIN = process.env.GEMINI_BIN
  || (process.platform === "win32" ? join(process.env.USERPROFILE || "", "npm-global", "gemini.cmd") : "gemini");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";
const POLLINATIONS_URL = process.env.POLLINATIONS_URL || "https://text.pollinations.ai/openai";
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "openai";
const PROVIDER_ORDER = (process.env.PROVIDER_ORDER || "pollinations,ollama,openrouter,gemini")
  .split(",")
  .map(item => item.trim().toLowerCase())
  .filter(Boolean);

function extractArray(text) {
  try {
    const value = JSON.parse(text.trim());
    if (Array.isArray(value)) return value;
  } catch {}

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      const value = JSON.parse(fence[1].trim());
      if (Array.isArray(value)) return value;
    } catch {}
  }

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const value = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(value)) return value;
    } catch {}
  }

  return null;
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy(new Error("Request body too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

/* ── Google Places (New) ─────────────────────────────────────────────────── */

const SPECIALTY_QUERIES = {
  "Any Doctor":           "doctors and medical practices",
  "GP":                   "GP doctors and family practice",
  "General Practitioner": "general practitioners and family doctors",
  "Cardiologist":         "cardiologists",
  "Dermatologist":        "dermatologists",
  "Neurologist":          "neurologists",
  "Orthopedic":           "orthopedic doctors",
  "Pediatrician":         "pediatricians",
  "Psychiatrist":         "psychiatrists",
  "Dentist":              "dentists",
  "Eye Doctor":           "eye doctors and ophthalmologists",
};

function toRad(deg) { return deg * Math.PI / 180; }

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchGoogle(lat, lng, radiusMeters, specialty) {
  if (!hasGooglePlacesKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is missing. Create a Google API key for Places API (New), then paste it into .env.");
  }

  const query = SPECIALTY_QUERIES[specialty] || "doctors";
  const fieldMask = [
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.regularOpeningHours",
    "places.rating",
    "places.types",
    "places.location",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: `${query} near Cape Town, South Africa`,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50_000),
        },
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google Places error (HTTP ${res.status})`);
  }

  const data = await res.json();
  const dayIdx = (new Date().getDay() + 6) % 7; // 0 = Monday

  return (data.places || []).map(p => {
    const dist = haversine(lat, lng, p.location?.latitude, p.location?.longitude);
    const todayDesc = p.regularOpeningHours?.weekdayDescriptions?.[dayIdx];
    const hours = todayDesc ? todayDesc.replace(/^[^:]+:\s*/, "") : null;
    const typeLabel = p.types?.find(t => t !== "point_of_interest" && t !== "establishment" && t !== "health") || "doctor";
    return {
      name:      p.displayName?.text || "Unknown",
      specialty: typeLabel.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      address:   p.formattedAddress || null,
      phone:     p.nationalPhoneNumber || null,
      rating:    p.rating != null ? String(p.rating.toFixed(1)) : null,
      hours,
      distance:  `${Math.round(dist)} m away`,
      notes:     null,
      source:    "google",
    };
  }).sort((a, b) => parseInt(a.distance, 10) - parseInt(b.distance, 10));
}

/* ── LLM prompt ─────────────────────────────────────────────────────────── */

function buildPrompt({ location, cityName, specialty, radius }) {
  let where;
  if (location?.lat) {
    where = `coordinates ${Number(location.lat).toFixed(4)},${Number(location.lng).toFixed(4)} (near ${cityName || "the user"})`;
  } else if (cityName) {
    where = cityName;
  } else if (location?.suburb) {
    where = [location.street, location.suburb, location.city].filter(Boolean).join(", ");
  } else {
    where = location?.city || "the user";
  }
  const spec = specialty === "Any Doctor" ? "doctors or medical clinics" : `${specialty}s`;

  return `Return a JSON array of up to 5 likely ${spec} near ${where} within ${radius || 5} km.

Return ONLY a raw JSON array - no markdown, no explanation, nothing else.

Schema:
[
  {
    "name": "Doctor or clinic name",
    "specialty": "Specialty",
    "address": "Full street address",
    "phone": "phone number or null",
    "rating": "4.2 or null",
    "hours": "Mon-Fri 9am-5pm or null",
    "notes": "any useful note or null"
  }
]

If exact phone/hours/rating are unknown, use null. If nothing found, return [].`;
}

function runGemini(prompt) {
  return new Promise((resolve, reject) => {
    const hasGeminiBin = GEMINI_BIN && (process.platform !== "win32" || existsSync(GEMINI_BIN));
    const command = process.platform === "win32"
      ? "powershell.exe"
      : (hasGeminiBin ? GEMINI_BIN : "npx");
    const args = process.platform === "win32"
      ? ["-NoProfile", "-Command", hasGeminiBin
          ? `& '${GEMINI_BIN}' -m '${GEMINI_MODEL}' -p ''`
          : `npx ${GEMINI_CLI_PACKAGE} -m '${GEMINI_MODEL}' -p ''`]
      : (hasGeminiBin
          ? ["-m", GEMINI_MODEL, "-p", ""]
          : [GEMINI_CLI_PACKAGE, "-m", GEMINI_MODEL, "-p", ""]);
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.end(prompt);

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI timed out."));
    }, 120_000);

    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      const doctors = extractArray(stdout);
      if (doctors) {
        resolve({ doctors, output: stdout });
        return;
      }
      reject(new Error(stderr || stdout || `Gemini CLI exited with code ${code}`));
    });
  });
}

async function runOpenRouter(prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://127.0.0.1:5173",
      "X-Title": "NearbyDoc",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON. No markdown. No commentary.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter error (HTTP ${res.status})`);
  }

  const output = data?.choices?.[0]?.message?.content ?? "";
  const doctors = extractArray(output);
  if (!doctors) throw new Error("OpenRouter returned a response that was not a JSON array.");
  return { doctors, output, provider: "openrouter", model: OPENROUTER_MODEL };
}

async function runOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Ollama error (HTTP ${res.status})`);
  }

  const output = data?.response ?? "";
  const doctors = extractArray(output);
  if (!doctors) throw new Error("Ollama returned a response that was not a JSON array.");
  return { doctors, output, provider: "ollama", model: OLLAMA_MODEL };
}

async function runPollinations(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: ctrl.signal,
    body: JSON.stringify({
      model: POLLINATIONS_MODEL,
      messages: [
        {
          role: "system",
          content: "Return only a valid raw JSON array. No markdown. No explanation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  }).finally(() => clearTimeout(timer));

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Pollinations error (HTTP ${res.status})`);
  }

  const output = data?.choices?.[0]?.message?.content ?? "";
  const doctors = extractArray(output);
  if (!doctors) throw new Error("Pollinations returned a response that was not a JSON array.");
  return { doctors, output, provider: "pollinations", model: data?.model || POLLINATIONS_MODEL };
}

async function runBestProvider(prompt) {
  const errors = [];

  for (const provider of PROVIDER_ORDER) {
    try {
      if (provider === "pollinations") return await runPollinations(prompt);
      if (provider === "ollama") return await runOllama(prompt);
      if (provider === "openrouter" && OPENROUTER_API_KEY) return await runOpenRouter(prompt);
      if (provider === "openrouter" && !OPENROUTER_API_KEY) {
        errors.push("OpenRouter skipped: OPENROUTER_API_KEY is empty.");
        continue;
      }
      if (provider === "gemini") return await runGemini(prompt);
    } catch (error) {
      errors.push(`${provider}: ${cleanProviderError(error.message || String(error))}`);
    }
  }

  throw new Error(errors.join("\n"));
}

function cleanGeminiError(message) {
  if (/MODEL_CAPACITY_EXHAUSTED|No capacity available/i.test(message)) {
    return "Gemini CLI is signed in, but Gemini has no capacity for the selected model right now. Try again shortly or set GEMINI_MODEL to another model.";
  }
  if (/RESOURCE_EXHAUSTED|quota|rateLimitExceeded|429/i.test(message)) {
    return "Gemini CLI is signed in, but the request is currently rate-limited. Try again shortly.";
  }
  if (/Code Assist login required|authentication|oauth/i.test(message)) {
    return "Gemini CLI needs login. Run `npx @google/gemini-cli` once and finish the browser sign-in.";
  }
  return message.split("\n").slice(0, 6).join("\n");
}

function cleanProviderError(message) {
  if (/fetch failed|ECONNREFUSED|Unable to connect/i.test(message)) {
    return "not running or unreachable.";
  }
  return cleanGeminiError(message);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 404, { error: "Not found" });

  try {
    const body = await readJson(req);

    if (req.url === "/api/places") {
      const { lat, lng, radius, specialty } = body;
      if (!lat || !lng) return json(res, 400, { error: "lat and lng are required." });
      const doctors = await searchGoogle(lat, lng, (Number(radius) || 5) * 1000, specialty || "Any Doctor");
      return json(res, 200, { doctors, provider: "google" });
    }

    if (req.url === "/api/doctors") {
      if (!body.location) return json(res, 400, { error: "Location is required." });
      const prompt = buildPrompt(body);
      const result = await runBestProvider(prompt);
      return json(res, 200, result);
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 500, { error: cleanProviderError(error.message || "No provider worked.") });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`NearbyDoc API: http://127.0.0.1:${PORT}`);
  console.log(`Google Places: ${hasGooglePlacesKey ? "configured" : "missing - add GOOGLE_PLACES_API_KEY to .env"}`);
});
