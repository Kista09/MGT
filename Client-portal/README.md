# BotFlow Platform — Setup Guide

## Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite (deployed to Vercel) |
| Backend API | Node.js + Express |
| Database | PostgreSQL 16 |
| Cache / Rate-limit | Redis 7 |
| Auth | JWT (access 15m + refresh 7d, httpOnly cookie) |
| Container | Docker + Docker Compose |
| Deployment | Vercel (frontend) + Railway / Render / Fly.io (API) |

---

## Local Development (Docker)

### 1. Clone and configure
```bash
git clone https://github.com/your-org/botflow
cd botflow
cp .env.example .env
# Edit .env — fill in POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET at minimum
```

### 2. Generate JWT secrets
```bash
# Run these and paste output into .env
openssl rand -base64 64  # → JWT_SECRET
openssl rand -base64 64  # → JWT_REFRESH_SECRET
openssl rand -hex 32     # → POSTGRES_PASSWORD
```

### 3. Start everything
```bash
docker compose up -d

# Watch logs
docker compose logs -f api

# With pgAdmin GUI at http://localhost:5050
docker compose --profile tools up -d
```

### 4. Start frontend dev server
```bash
npm install
npm run dev:frontend
# Open http://localhost:5173
```

### 5. Demo login
| Email | Password | Role |
|---|---|---|
| admin@botflow.io | demo123 | Super Admin |
| ayesha@tapartner.co.za | demo123 | Client Admin (Takealot Partner Store) |
| owen@tapartner.co.za | demo123 | Client Manager (Takealot Partner Store) |

---

## Database

```bash
# Connect to Postgres
docker compose exec postgres psql -U botflow botflow

# Reset schema + seed data
npm run db:reset

# Run only migrations
npm run db:migrate

# Create a new migration manually
psql $DATABASE_URL -f server/db/migrations/002_add_column.sql
```

---

## Deploying to Vercel

### Frontend
```bash
npm i -g vercel
vercel login
vercel link
vercel env add VITE_API_URL production
vercel --prod
```

### Backend API options

**Option A — Railway (recommended)**
```bash
railway login
railway init
railway up
railway variables set DATABASE_URL="..." JWT_SECRET="..." ...
```

**Option B — Render**
1. Create a new Web Service → connect your repo
2. Build command: `npm ci`
3. Start command: `node server/index.js`
4. Add all env vars from `.env.example`

**Option C — Fly.io**
```bash
fly launch
fly secrets set DATABASE_URL="..." JWT_SECRET="..."
fly deploy
```

### Managed Postgres

| Provider | Free tier | Notes |
|---|---|---|
| **Neon** | 512 MB | Serverless, branching, excellent Vercel integration |
| **Supabase** | 500 MB | Includes auth, storage, realtime |
| **Railway** | from R100/month | Simplest, co-located with API |
| **PlanetScale** | — | MySQL only |

For Neon: `DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/botflow?sslmode=require`

---

## Auth Flow

```
1. POST /api/auth/login { email, password }
   ← { accessToken (15m JWT), user }
   ← Set-Cookie: bf_refresh (7d httpOnly)

2. Frontend: store accessToken in memory (NOT localStorage)
   Attach to requests: Authorization: Bearer <accessToken>

3. When access token expires (401 TOKEN_EXPIRED):
   POST /api/auth/refresh  (cookie auto-sent)
   ← { accessToken (new 15m JWT) }
   ← Set-Cookie: bf_refresh (rotated, new 7d)

4. POST /api/auth/logout
   ← Revokes refresh token in DB, clears cookie
```

---

## File Structure

```
botflow/
├── src/                    ← React frontend
│   ├── app-with-auth.jsx   ← Root with login + auth context
│   ├── client-platform-full.jsx  ← Full 15-view platform
│   └── crm.jsx             ← Internal CRM
├── server/
│   ├── index.js            ← Express API server
│   └── db/
│       └── schema.sql      ← PostgreSQL schema + seed
├── docker-compose.yml      ← Full local dev stack
├── Dockerfile              ← Multi-stage container
├── vercel.json             ← Vercel deployment config
├── package.json            ← All dependencies
└── .env.example            ← Environment template
```

---

## Connecting the React app to the real API

In `app-with-auth.jsx`, find the `MOCK_AUTH` block and replace:

```js
// BEFORE (mock)
async login(email, password) {
  const user = DEMO_USERS.find(...)
  ...
}

// AFTER (real API)
async login(email, password) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }
  return res.json(); // { accessToken, user }
}
```

---

## Security Checklist

- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT access tokens short-lived (15 min)
- [x] Refresh tokens rotated on every use
- [x] Refresh token stored in httpOnly cookie (XSS-proof)
- [x] Refresh tokens hashed in DB (SHA-256)
- [x] Rate limiting on login (10 req / 15 min)
- [x] SQL injection protected (parameterised queries)
- [x] CORS restricted to known origins
- [x] Security headers via Helmet
- [x] Role-based access control on all routes
- [x] Audit log for all mutations
- [ ] 2FA / TOTP (add with `otplib`)
- [ ] IP allowlisting for enterprise clients
- [ ] SOC 2 audit logging (add to audit_log)
