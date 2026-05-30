/**
 * BotFlow — Full App with Authentication
 * ─────────────────────────────────────────
 * Drop this file in alongside client-platform-full.jsx
 * Replace the demo MOCK_AUTH section with real API calls
 * when you have the backend running.
 */

import { useState, useEffect, useContext, createContext, useCallback } from "react";
import FullPlatform from "./client-platform-full.jsx";

/* ─── fonts ───────────────────────────────────────────────── */
const _fl = document.createElement("link");
_fl.rel  = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";
document.head.appendChild(_fl);

/* ─── tokens ──────────────────────────────────────────────── */
const T = {
  bg:"#F8F4EF", surface:"#FFFFFF", card:"#FFFFFF",
  border:"#E8E2DA", borderDark:"#D7CCBE",
  accent:"#E8561A", accentLt:"#F07A46", accentBg:"#FDF0EB", accentBdr:"#F6C6B4",
  red:"#B42318", redBg:"#FFF1F0", redBdr:"#FDA29B",
  yellow:"#A16207", yellowBg:"#FEF3C7", yellowBdr:"#FDE68A",
  text:"#1A1A1A", muted:"#6F6258", subtle:"#F3ECE3",
  dark:"#1A1A1A", darkSurface:"#0C4A4A", darkBorder:"rgba(255,255,255,.13)",
  shadow:"0 1px 4px rgba(26,26,26,.06),0 10px 28px rgba(26,26,26,.07)",
  shadowMd:"0 18px 48px rgba(26,26,26,.16)",
};
const font  = "'DM Sans', sans-serif";
const serif = "'Cormorant Garamond', Georgia, serif";

/* ═══════════════════════════════════════════════════════════
   AUTH CONTEXT
   ═══════════════════════════════════════════════════════════ */

const AuthCtx = createContext(null);

/**
 * MOCK_AUTH — replace these functions with real fetch() calls
 * to your backend API (see api-server.js).
 *
 * Real login:
 *   const res = await fetch("/api/auth/login", {
 *     method: "POST", credentials: "include",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ email, password })
 *   });
 *   const { accessToken, user } = await res.json();
 */
const STORAGE_KEY = "mgucatech_client_access_token";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://mgucatech.com";
const ALLOW_LOCAL_CLIENT_AUTH = import.meta.env.VITE_ALLOW_LOCAL_CLIENT_AUTH !== "false";
const CLIENT_ROLES = new Set(["admin", "client_admin", "client_manager", "client_viewer"]);

const DEV_USERS = [
  { id:"u1", email:"ayesha@tapartner.co.za", password:"demo123", name:"Ayesha Jacobs", role:"client_admin", clientId:"takealot-partner-store", clientName:"Takealot Partner Store", plan:"Enterprise" },
  { id:"u2", email:"owen@tapartner.co.za",   password:"demo123", name:"Owen Petersen", role:"client_manager",clientId:"takealot-partner-store", clientName:"Takealot Partner Store", plan:"Enterprise" },
  { id:"u4", email:"naledi@tapartner.co.za", password:"demo123", name:"Naledi Dlamini",role:"client_admin", clientId:"mzansi-fresh-market",   clientName:"Mzansi Fresh Market",   plan:"Growth" },
];

const AUTH = {
  async login(email, password) {
    let res = null;
    let remoteError = null;
    if (API_BASE) {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, audience: "client_portal" }),
      }).catch(() => null);
      if (res && !res.headers.get("content-type")?.includes("application/json")) res = null;
    }

    if (res) {
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (!data.user?.client_id && !data.user?.clientId) throw new Error("This account is not assigned to a client workspace");
        if (!CLIENT_ROLES.has(data.user.role)) throw new Error("This account is not enabled for the client portal");
        return data;
      }
      remoteError = data.error ?? "Unable to sign in";
    }

    if (!ALLOW_LOCAL_CLIENT_AUTH) throw new Error(remoteError ?? "Sign in service is unavailable");
    await new Promise(r => setTimeout(r, 350));
    const user = DEV_USERS.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid email or password");
    const { password: _, ...safeUser } = user;
    const fakeToken = btoa(JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      clientName: user.clientName,
      plan: user.plan,
      exp: Date.now() + 86400000,
    }));
    return { accessToken: fakeToken, user: safeUser };
  },
  async me(token) {
    let res = null;
    let remoteError = null;
    if (API_BASE) {
      res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (res && !res.headers.get("content-type")?.includes("application/json")) res = null;
    }

    if (res) {
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (!CLIENT_ROLES.has(data.role) || (!data.client_id && !data.clientId)) {
          throw new Error("This account is not enabled for the client portal");
        }
        return data;
      }
      remoteError = data.error ?? "Session expired";
    }

    if (!ALLOW_LOCAL_CLIENT_AUTH) throw new Error(remoteError ?? "Session service is unavailable");
    await new Promise(r => setTimeout(r, 200));
    if (!token) throw new Error("No token");
    const decoded = JSON.parse(atob(token));
    if (decoded.exp < Date.now()) throw new Error("Token expired");
    const user = DEV_USERS.find(u => u.id === decoded.sub);
    if (!user) throw new Error("User not found");
    const { password: _, ...safeUser } = user;
    return safeUser;
  },
  async logout() {
    if (API_BASE) {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  },
};

function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [status, setStatus]   = useState("loading"); // loading | authenticated | unauthenticated
  const [error, setError]     = useState(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) { setStatus("unauthenticated"); return; }
    AUTH.me(token)
      .then(u => { setUser(u); setStatus("authenticated"); })
      .catch(() => { localStorage.removeItem(STORAGE_KEY); setStatus("unauthenticated"); });
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const { accessToken, user: u } = await AUTH.login(email, password);
    localStorage.setItem(STORAGE_KEY, accessToken);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await AUTH.logout();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthCtx.Provider value={{ user, status, error, setError, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

const useAuth = () => useContext(AuthCtx);

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */

function LoginPage() {
  const { login, error, setError } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try { await login(email, password); }
    catch(err) { setError(err.message); }
    finally   { setLoading(false); }
  };

  const features = [
    { icon:"💬", text:"Manage Q&A responses and conversation flows" },
    { icon:"📥", text:"Handle agent inbox and customer escalations" },
    { icon:"📣", text:"Run WhatsApp broadcast campaigns" },
    { icon:"📊", text:"Real-time bot analytics and reporting" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:font }}>
      <style>{`
        *{box-sizing:border-box;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── left panel ── */}
      <div style={{ flex:"0 0 46%", background:T.dark,
        display:"flex", flexDirection:"column", padding:"48px 52px",
        position:"relative", overflow:"hidden" }}>

        {/* logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:72 }}>
          <div style={{ width:44, height:44, borderRadius:8, background:T.accent,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💬</div>
          <div>
            <div style={{ color:"#fff", fontSize:22, fontFamily:serif, lineHeight:1.05, fontWeight:700 }}>MgucaTECH</div>
            <div style={{ color:"rgba(255,255,255,.42)", fontSize:11, letterSpacing:1, textTransform:"uppercase" }}>Client Portal</div>
          </div>
        </div>

        {/* headline */}
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:serif, fontSize:38, color:"#fff", lineHeight:1.15, marginBottom:16,
            animation:"fadeIn .6s ease" }}>
            Your WhatsApp bot,<br/><span style={{ color:T.accentLt, fontStyle:"italic" }}>fully in your hands.</span>
          </div>
          <p style={{ color:`rgba(255,255,255,.55)`, fontSize:15, lineHeight:1.7, marginBottom:48,
            maxWidth:320, animation:"fadeIn .6s .1s ease both" }}>
            Manage responses, monitor conversations, run campaigns — all from one place.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeIn .6s .2s ease both" }}>
            {features.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:`${T.accent}22`,
                  border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:16, flexShrink:0 }}>{f.icon}</div>
                <span style={{ fontSize:14, color:`rgba(255,255,255,.65)` }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* uptime badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:48,
          background:`${T.accent}22`, border:`1px solid ${T.accent}44`,
          borderRadius:8, padding:"8px 16px", width:"fit-content" }}>
          <div style={{ width:8, height:8, borderRadius:99, background:T.accentLt,
            animation:"pulse 2s infinite" }}/>
          <span style={{ fontSize:12, color:`${T.accentLt}cc`, fontWeight:600 }}>
            99.97% uptime — All systems operational
          </span>
        </div>
      </div>

      {/* ── right panel ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        background:T.bg, padding:"48px 40px" }}>
        <div style={{ width:"100%", maxWidth:420, animation:"fadeIn .5s .1s ease both" }}>

          <div style={{ marginBottom:36 }}>
            <div style={{ fontFamily:serif, fontSize:30, color:T.text, marginBottom:8 }}>
              Welcome back
            </div>
            <p style={{ color:T.muted, fontSize:15, margin:0 }}>
              Sign in to manage your WhatsApp bot
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {/* email */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:T.muted, letterSpacing:.5,
                textTransform:"uppercase", display:"block", marginBottom:8 }}>Email</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="email" required
                style={{ width:"100%", fontFamily:font, fontSize:15, color:T.text,
                  background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:12,
                  padding:"12px 16px", outline:"none", transition:"border .15s",
                  boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor=T.accent}
                onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>

            {/* password */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <label style={{ fontSize:12, fontWeight:700, color:T.muted, letterSpacing:.5,
                  textTransform:"uppercase" }}>Password</label>
                <span style={{ fontSize:12, color:T.accent, cursor:"pointer", fontWeight:600 }}>
                  Forgot password?
                </span>
              </div>
              <div style={{ position:"relative" }}>
                <input
                  type={showPw?"text":"password"} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={{ width:"100%", fontFamily:font, fontSize:15, color:T.text,
                    background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:12,
                    padding:"12px 48px 12px 16px", outline:"none", transition:"border .15s",
                    boxSizing:"border-box" }}
                  onFocus={e=>e.target.style.borderColor=T.accent}
                  onBlur={e=>e.target.style.borderColor=T.border}/>
                <button type="button" onClick={()=>setShowPw(p=>!p)}
                  style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16,
                    color:T.muted, padding:0, display:"flex", alignItems:"center" }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* remember me */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div onClick={()=>setRemember(r=>!r)}
                style={{ width:20, height:20, borderRadius:6, border:`2px solid ${remember?T.accent:T.border}`,
                  background:remember?T.accent:"transparent", cursor:"pointer", transition:"all .15s",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {remember && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
              </div>
              <span style={{ fontSize:14, color:T.muted, cursor:"pointer" }}
                onClick={()=>setRemember(r=>!r)}>Keep me signed in</span>
            </div>

            {/* error */}
            {error && (
              <div style={{ background:T.redBg, border:`1.5px solid ${T.redBdr}`,
                borderRadius:10, padding:"10px 14px", fontSize:13, color:T.red,
                fontWeight:600, display:"flex", gap:8, alignItems:"center" }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* submit */}
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
                background: loading ? T.accentBdr : T.accent, color:"#fff",
                fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily:font, transition:"all .15s", display:"flex",
                alignItems:"center", justifyContent:"center", gap:10 }}
              onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background=T.accentLt; }}
              onMouseLeave={e=>e.currentTarget.style.background=loading?T.accentBdr:T.accent}>
              {loading ? (
                <>
                  <div style={{ width:18, height:18, border:`2px solid rgba(255,255,255,.3)`,
                    borderTopColor:"#fff", borderRadius:99, animation:"spin .7s linear infinite" }}/>
                  Signing in…
                </>
              ) : "Sign in →"}
            </button>
          </form>

          <p style={{ textAlign:"center", color:T.muted, fontSize:13, marginTop:32 }}>
            Having trouble? Contact{" "}
            <a href="mailto:support@mgucatech.com"
              style={{ color:T.accent, fontWeight:600, textDecoration:"none" }}>
              support@mgucatech.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLATFORM SHELL — import the real platform here
   For demo purposes, this renders a placeholder.
   Replace <PlatformApp> with your actual import.
   ═══════════════════════════════════════════════════════════ */

function PlatformApp({ user, onLogout }) {
  return <FullPlatform user={user} onLogout={onLogout} />;
}

/* ═══════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════ */

function AppContent() {
  const { user, status, logout } = useAuth();

  if (status === "loading") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", background:T.dark, fontFamily:font }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:T.accent,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💬</div>
          <div style={{ width:32, height:32, border:`3px solid ${T.darkBorder}`,
            borderTopColor:T.accent, borderRadius:99, animation:"spin .7s linear infinite" }}/>
          <div style={{ color:`rgba(255,255,255,.4)`, fontSize:14 }}>Loading…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return <LoginPage />;
  return <PlatformApp user={user} onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
