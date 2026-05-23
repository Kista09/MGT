import { useCallback, useEffect, useMemo, useState } from "react";
import { C, font } from "./constants";

const STORAGE_KEY = "mgucatech_crm_access_token";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const ALLOW_LOCAL_STAFF_AUTH = import.meta.env.VITE_ALLOW_LOCAL_STAFF_AUTH !== "false";

const DEV_STAFF = [
  {
    id: "staff-1",
    email: "admin@mgucatech.com",
    password: "admin123",
    name: "MgucaTECH Admin",
    role: "Internal CRM",
    avatar: "M",
  },
];

function isInternalUser(user) {
  return user?.role === "superadmin" || user?.email?.endsWith("@mgucatech.com");
}

async function loginInternal(email, password) {
  let res = null;
  if (API_BASE) {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, audience: "internal_crm" }),
    }).catch(() => null);
    if (res && !res.headers.get("content-type")?.includes("application/json")) res = null;
  }

  if (res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Unable to sign in");
    if (!isInternalUser(data.user)) throw new Error("This workspace is restricted to MgucaTECH staff");
    return data;
  }

  if (!ALLOW_LOCAL_STAFF_AUTH) throw new Error("Sign in service is unavailable");
  await new Promise(resolve => setTimeout(resolve, 300));
  const user = DEV_STAFF.find(item => item.email === email && item.password === password);
  if (!user) throw new Error("Invalid staff credentials");
  const accessToken = btoa(JSON.stringify({ sub: user.id, exp: Date.now() + 86400000 }));
  const { password: _, ...safeUser } = user;
  return { accessToken, user: safeUser };
}

async function getCurrentUser(token) {
  let res = null;
  if (API_BASE) {
    res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res && !res.headers.get("content-type")?.includes("application/json")) res = null;
  }

  if (res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Session expired");
    if (!isInternalUser(data)) throw new Error("This workspace is restricted to MgucaTECH staff");
    return data;
  }

  if (!ALLOW_LOCAL_STAFF_AUTH) throw new Error("Session service is unavailable");
  const decoded = JSON.parse(atob(token));
  if (decoded.exp < Date.now()) throw new Error("Session expired");
  const user = DEV_STAFF.find(item => item.id === decoded.sub);
  if (!user) throw new Error("User not found");
  const { password: _, ...safeUser } = user;
  return safeUser;
}

function normalizeUser(user) {
  const name = user.name ?? user.email ?? "MgucaTECH";
  return {
    name,
    email: user.email,
    role: user.role === "superadmin" ? "MgucaTECH Admin" : (user.role ?? "Internal CRM"),
    avatar: user.avatar ?? name.slice(0, 1).toUpperCase(),
  };
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await loginInternal(email.trim().toLowerCase(), password);
      localStorage.setItem(STORAGE_KEY, session.accessToken);
      onLogin(normalizeUser(session.user));
    } catch (err) {
      setError(err.message ?? "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: C.bg,
      color: C.text,
      fontFamily: font.body,
      padding: 24,
    }}>
      <form onSubmit={submit} style={{
        width: "min(420px, 100%)",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 28,
        boxShadow: "0 18px 48px rgba(0,0,0,.28)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, #f3d98b)`,
            color: "#0b0f15",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontFamily: font.mono,
          }}>M</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>MgucaTECH CRM</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Internal workspace</div>
          </div>
        </div>

        <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          Staff email
        </label>
        <input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="email"
          required
          placeholder="you@mgucatech.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.card,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 16,
            fontFamily: font.body,
          }}
        />

        <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.card,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 18,
            fontFamily: font.body,
          }}
        />

        {error && (
          <div style={{
            color: C.red,
            background: C.redBg,
            border: `1px solid ${C.red}`,
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 13,
            marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 6,
            background: loading ? C.accentDim : C.accent,
            color: "#0b0f15",
            cursor: loading ? "wait" : "pointer",
            fontFamily: font.body,
            fontWeight: 800,
            padding: "12px 14px",
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function InternalAuthGate({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    getCurrentUser(token)
      .then(nextUser => {
        setUser(normalizeUser(nextUser));
        setStatus("authenticated");
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setStatus("unauthenticated");
      });
  }, []);

  const logout = useCallback(async () => {
    if (API_BASE) {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => ({ user, logout }), [user, logout]);

  if (status === "loading") {
    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: C.bg,
        color: C.muted,
        fontFamily: font.body,
      }}>
        Loading secure workspace...
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <LoginScreen onLogin={nextUser => { setUser(nextUser); setStatus("authenticated"); }} />;
  }

  return children(value);
}
