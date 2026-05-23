/**
 * BotFlow API Server
 * Node.js + Express + PostgreSQL + JWT
 *
 * Install:  npm install
 * Dev:      npm run dev
 * Prod:     npm start
 */

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const { Pool }     = require("pg");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const crypto       = require("crypto");
require("dotenv").config();

/* ─── database ─────────────────────────────────────────────── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on("error", (err) => console.error("PG pool error:", err));

const db = {
  query: (text, params) => pool.query(text, params),
  /** Get a client for transactions */
  getClient: () => pool.connect(),
};

/* ─── jwt helpers ──────────────────────────────────────────── */
const ACCESS_TTL  = "15m";
const REFRESH_TTL = "7d";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* ─── middleware ───────────────────────────────────────────── */
function requireAuth(roles = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice(7);
    try {
      const decoded = verifyAccessToken(token);
      // Attach user to request
      const { rows } = await db.query(
        `SELECT u.id, u.email, u.name, u.role, u.client_id,
                c.name AS client_name, c.plan, c.status AS client_status
         FROM users u
         LEFT JOIN clients c ON c.id = u.client_id
         WHERE u.id = $1 AND u.is_active = true`,
        [decoded.sub]
      );
      if (!rows.length) return res.status(401).json({ error: "User not found" });
      req.user = rows[0];
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

function requireClientAccess(req, res, next) {
  const clientId = req.params.clientId || req.body.clientId;
  if (req.user.role === "superadmin") return next();
  if (req.user.client_id !== clientId) {
    return res.status(403).json({ error: "Access denied to this client" });
  }
  next();
}

/* ─── rate limiters ────────────────────────────────────────── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Rate limit exceeded" },
});

/* ─── app setup ────────────────────────────────────────────── */
const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", apiLimiter);

/* ══════════════════════════════════════════════════════════════
   AUTH ROUTES  /api/auth
   ══════════════════════════════════════════════════════════════ */
const authRouter = express.Router();

/** POST /api/auth/login */
authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password, audience } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.*, c.name AS client_name, c.plan, c.slug AS client_slug
       FROM users u
       LEFT JOIN clients c ON c.id = u.client_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (audience === "client_portal") {
      const clientPortalRoles = ["client_admin", "client_manager", "client_viewer"];
      if (!user.client_id || !clientPortalRoles.includes(user.role)) {
        return res.status(403).json({ error: "This account is not enabled for the client portal" });
      }
    }

    if (audience === "internal_crm") {
      const isMgucaTechStaff = user.email.endsWith("@mgucatech.com");
      if (user.role !== "superadmin" && !isMgucaTechStaff) {
        return res.status(403).json({ error: "This account is not enabled for the internal CRM" });
      }
    }

    // Issue tokens
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });
    const tokenHash = hashToken(refreshToken);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [user.id, tokenHash, req.ip, req.headers["user-agent"]]
    );

    await db.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // httpOnly cookie for refresh token
    res.cookie("bf_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TTL_MS,
      path: "/api/auth",
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ accessToken, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/auth/refresh */
authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies.bf_refresh;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const { rows } = await db.query(
      `SELECT rt.*, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (!rows.length) {
      res.clearCookie("bf_refresh", { path: "/api/auth" });
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const existing = rows[0];

    // Rotate: revoke old, issue new
    await db.query(
      `UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
      [existing.id]
    );

    const newAccessToken  = signAccessToken({ sub: decoded.sub, role: existing.role });
    const newRefreshToken = signRefreshToken({ sub: decoded.sub });
    const newHash         = hashToken(newRefreshToken);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [decoded.sub, newHash, req.ip, req.headers["user-agent"]]
    );

    res.cookie("bf_refresh", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TTL_MS,
      path: "/api/auth",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.clearCookie("bf_refresh", { path: "/api/auth" });
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

/** POST /api/auth/logout */
authRouter.post("/logout", async (req, res) => {
  const token = req.cookies.bf_refresh;
  if (token) {
    const hash = hashToken(token);
    await db.query(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [hash]
    ).catch(() => {});
    res.clearCookie("bf_refresh", { path: "/api/auth" });
  }
  res.json({ ok: true });
});

/** GET /api/auth/me */
authRouter.get("/me", requireAuth(), (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  res.json(safeUser);
});

/** POST /api/auth/forgot-password */
authRouter.post("/forgot-password", loginLimiter, async (req, res) => {
  const { email } = req.body;
  // Always return 200 to prevent email enumeration
  if (!email) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000); // 1 hour

  await db.query(
    `UPDATE users
     SET password_reset_token = $1, password_reset_expires = $2
     WHERE email = $3 AND is_active = true`,
    [hashToken(token), expires, email.toLowerCase()]
  ).catch(() => {});

  // TODO: Send email with reset link: /reset-password?token=<token>
  console.log(`[RESET TOKEN] ${email}: ${token}`);
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);

/* ══════════════════════════════════════════════════════════════
   CLIENTS  /api/clients
   ══════════════════════════════════════════════════════════════ */
const clientsRouter = express.Router();
clientsRouter.use(requireAuth());

clientsRouter.get("/", async (req, res) => {
  const isSuperAdmin = req.user.role === "superadmin";
  const { rows } = await db.query(
    isSuperAdmin
      ? `SELECT * FROM clients ORDER BY created_at DESC`
      : `SELECT * FROM clients WHERE id = $1`,
    isSuperAdmin ? [] : [req.user.client_id]
  );
  res.json(rows);
});

app.use("/api/clients", clientsRouter);

/* ══════════════════════════════════════════════════════════════
   QA RESPONSES  /api/clients/:clientId/qa
   ══════════════════════════════════════════════════════════════ */
const qaRouter = express.Router({ mergeParams: true });
qaRouter.use(requireAuth(), requireClientAccess);

qaRouter.get("/",    async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM qa_responses WHERE client_id = $1 ORDER BY category, created_at`,
    [req.params.clientId]
  );
  res.json(rows);
});

qaRouter.post("/",   async (req, res) => {
  const { category, question, answer, is_active = true } = req.body;
  const { rows } = await db.query(
    `INSERT INTO qa_responses (client_id, category, question, answer, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.clientId, category, question, answer, is_active, req.user.id]
  );
  await db.query(
    `INSERT INTO audit_log (user_id, client_id, action, entity_type, entity_id)
     VALUES ($1,$2,'qa.create','qa_response',$3)`,
    [req.user.id, req.params.clientId, rows[0].id]
  );
  res.status(201).json(rows[0]);
});

qaRouter.put("/:id", async (req, res) => {
  const { category, question, answer, is_active } = req.body;
  const { rows } = await db.query(
    `UPDATE qa_responses
     SET category=$1, question=$2, answer=$3, is_active=$4
     WHERE id=$5 AND client_id=$6 RETURNING *`,
    [category, question, answer, is_active, req.params.id, req.params.clientId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

qaRouter.delete("/:id", async (req, res) => {
  await db.query(
    `DELETE FROM qa_responses WHERE id=$1 AND client_id=$2`,
    [req.params.id, req.params.clientId]
  );
  res.json({ ok: true });
});

app.use("/api/clients/:clientId/qa", qaRouter);

/* ══════════════════════════════════════════════════════════════
   TEMPLATES  /api/clients/:clientId/templates
   ══════════════════════════════════════════════════════════════ */
const templatesRouter = express.Router({ mergeParams: true });
templatesRouter.use(requireAuth(), requireClientAccess);

templatesRouter.get("/", async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM templates WHERE client_id=$1 ORDER BY created_at DESC`,
    [req.params.clientId]
  );
  res.json(rows);
});

templatesRouter.post("/", async (req, res) => {
  const { name, category, language, body, variables = [] } = req.body;
  const { rows } = await db.query(
    `INSERT INTO templates (client_id,name,category,language,body,variables,submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
    [req.params.clientId, name, category, language, body, variables]
  );
  res.status(201).json(rows[0]);
});

app.use("/api/clients/:clientId/templates", templatesRouter);

/* ══════════════════════════════════════════════════════════════
   CONTACTS  /api/clients/:clientId/contacts
   ══════════════════════════════════════════════════════════════ */
const contactsRouter = express.Router({ mergeParams: true });
contactsRouter.use(requireAuth(), requireClientAccess);

contactsRouter.get("/", async (req, res) => {
  const { search, optIn, limit = 100, offset = 0 } = req.query;
  let query = `SELECT * FROM contacts WHERE client_id=$1`;
  const params = [req.params.clientId];
  if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`; }
  if (optIn !== undefined) { params.push(optIn === "true"); query += ` AND opt_in=$${params.length}`; }
  params.push(parseInt(limit), parseInt(offset));
  query += ` ORDER BY last_seen_at DESC NULLS LAST LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await db.query(query, params);
  res.json(rows);
});

app.use("/api/clients/:clientId/contacts", contactsRouter);

/* ══════════════════════════════════════════════════════════════
   BROADCASTS  /api/clients/:clientId/broadcasts
   ══════════════════════════════════════════════════════════════ */
const broadcastsRouter = express.Router({ mergeParams: true });
broadcastsRouter.use(requireAuth(), requireClientAccess);

broadcastsRouter.get("/", async (req, res) => {
  const { rows } = await db.query(
    `SELECT b.*, t.name AS template_name
     FROM broadcasts b
     JOIN templates t ON t.id = b.template_id
     WHERE b.client_id=$1 ORDER BY b.created_at DESC`,
    [req.params.clientId]
  );
  res.json(rows);
});

broadcastsRouter.post("/", async (req, res) => {
  const { template_id, name, segment, scheduled_at } = req.body;
  const { rows } = await db.query(
    `INSERT INTO broadcasts (client_id,template_id,name,segment,status,scheduled_at,created_by)
     VALUES ($1,$2,$3,$4,'scheduled',$5,$6) RETURNING *`,
    [req.params.clientId, template_id, name, segment, scheduled_at, req.user.id]
  );
  res.status(201).json(rows[0]);
});

app.use("/api/clients/:clientId/broadcasts", broadcastsRouter);

/* ══════════════════════════════════════════════════════════════
   CONVERSATIONS / INBOX  /api/clients/:clientId/conversations
   ══════════════════════════════════════════════════════════════ */
const convsRouter = express.Router({ mergeParams: true });
convsRouter.use(requireAuth(), requireClientAccess);

convsRouter.get("/", async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT cv.*, ct.name AS contact_name, ct.phone,
           u.name AS agent_name
    FROM conversations cv
    JOIN contacts ct ON ct.id = cv.contact_id
    LEFT JOIN users u ON u.id = cv.assigned_agent
    WHERE cv.client_id=$1`;
  const params = [req.params.clientId];
  if (status) { params.push(status); query += ` AND cv.status=$${params.length}`; }
  query += ` ORDER BY cv.last_message_at DESC NULLS LAST LIMIT 100`;
  const { rows } = await db.query(query, params);
  res.json(rows);
});

convsRouter.get("/:id/messages", async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.*, u.name AS sender_name
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id=$1
     ORDER BY m.sent_at ASC`,
    [req.params.id]
  );
  res.json(rows);
});

convsRouter.post("/:id/messages", requireAuth(["superadmin","client_admin","client_manager"]), async (req, res) => {
  const { content } = req.body;
  const { rows } = await db.query(
    `INSERT INTO messages (conversation_id,sender_type,sender_id,content)
     VALUES ($1,'agent',$2,$3) RETURNING *`,
    [req.params.id, req.user.id, content]
  );
  await db.query(
    `UPDATE conversations SET last_message_at=NOW(), status='escalated' WHERE id=$1`,
    [req.params.id]
  );
  res.status(201).json(rows[0]);
});

convsRouter.patch("/:id", async (req, res) => {
  const { status, assigned_agent } = req.body;
  const { rows } = await db.query(
    `UPDATE conversations SET status=COALESCE($1,status), assigned_agent=COALESCE($2,assigned_agent),
     resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END
     WHERE id=$3 AND client_id=$4 RETURNING *`,
    [status, assigned_agent, req.params.id, req.params.clientId]
  );
  res.json(rows[0]);
});

app.use("/api/clients/:clientId/conversations", convsRouter);

/* ══════════════════════════════════════════════════════════════
   HEALTH + ROOT
   ══════════════════════════════════════════════════════════════ */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BotFlow API running on :${PORT}`));

module.exports = app;
