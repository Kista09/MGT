import { useState, useMemo, useEffect, useRef } from "react";
import { C, NAV_ITEMS, font } from "../constants";
import { useApp } from "../context";

export default function CommandPalette() {
  const { state, dispatch, navigate } = useApp();
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) {
      return NAV_ITEMS.map(n => ({ type:"nav", label:n.label, sub:"Navigate", nav:n.id }));
    }
    const nav = NAV_ITEMS
      .filter(n => n.label.toLowerCase().includes(lq))
      .map(n => ({ type:"nav", label:n.label, sub:"Navigate to", nav:n.id }));
    const clients = state.clients
      .filter(c => c.name.toLowerCase().includes(lq) || c.contact.toLowerCase().includes(lq) || c.email.toLowerCase().includes(lq))
      .slice(0, 4)
      .map(c => ({ type:"client", label:c.name, sub:c.contact, id:c.id }));
    const bots = state.bots
      .filter(b => b.name.toLowerCase().includes(lq) || b.client.toLowerCase().includes(lq))
      .slice(0, 3)
      .map(b => ({ type:"bot", label:b.name, sub:b.client }));
    const tasks = state.tasks
      .filter(t => t.title.toLowerCase().includes(lq) || (t.notes ?? "").toLowerCase().includes(lq))
      .slice(0, 3)
      .map(t => ({ type:"task", label:t.title, sub:t.status }));
    const requests = (state.serviceRequests ?? [])
      .filter(r => r.subject.toLowerCase().includes(lq) || r.description.toLowerCase().includes(lq) || r.requester.toLowerCase().includes(lq))
      .slice(0, 3)
      .map(r => ({ type:"request", label:r.subject, sub:r.status }));
    return [...nav, ...clients, ...bots, ...tasks, ...requests];
  }, [q, state.clients, state.bots, state.tasks, state.serviceRequests]);

  const [selected, setSelected] = useState(0);

  useEffect(() => { setSelected(0); }, [results.length]);

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) activate(results[selected]);
  };

  const activate = (r) => {
    dispatch({ type: "CLOSE_COMMAND_PALETTE" });
    if (r.type === "nav") navigate(r.nav);
    else if (r.type === "client") navigate("client-detail", r.id);
    else if (r.type === "bot") navigate("bots");
    else if (r.type === "request") navigate("requests");
    else navigate("followups");
  };

  const typeColor = { nav:"#60a5fa", client:C.accent, bot:"#a855f7", task:"#fbbf24", request:C.red };
  const typeLabel = { nav:"PAGE", client:"CLIENT", bot:"BOT", task:"TASK", request:"REQ" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:950,
      display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:100 }}
      onClick={() => dispatch({ type:"CLOSE_COMMAND_PALETTE" })}>

      <div style={{ width:560, background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
        overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px",
          borderBottom:`1px solid ${C.border}` }}>
          <span style={{ color:C.muted, fontSize:16 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey}
            placeholder="Search pages, clients, bots…"
            style={{ flex:1, background:"transparent", border:"none", outline:"none",
              color:C.text, fontSize:15, fontFamily:font.body }} />
          <kbd style={{ background:C.subtle, border:`1px solid ${C.border}`, borderRadius:4,
            padding:"2px 6px", fontSize:11, color:C.muted, fontFamily:font.mono }}>ESC</kbd>
        </div>

        <div style={{ maxHeight:360, overflowY:"auto" }}>
          {results.length === 0 && (
            <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>No results</div>
          )}
          {results.map((r, i) => (
            <button key={i} onMouseEnter={() => setSelected(i)} onClick={() => activate(r)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"12px 20px",
                border:"none", background: selected === i ? C.surface : "transparent",
                cursor:"pointer", textAlign:"left", transition:"background .1s" }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:typeColor[r.type],
                background:`${typeColor[r.type]}22`, padding:"2px 7px", borderRadius:4,
                minWidth:50, textAlign:"center" }}>{typeLabel[r.type]}</span>
              <span style={{ flex:1, fontSize:14, color:C.text, fontWeight:500 }}>{r.label}</span>
              <span style={{ fontSize:12, color:C.muted }}>{r.sub}</span>
            </button>
          ))}
        </div>

        <div style={{ padding:"10px 20px", borderTop:`1px solid ${C.border}`,
          display:"flex", gap:16, fontSize:11, color:C.muted }}>
          <span><kbd style={{ fontFamily:font.mono }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontFamily:font.mono }}>↵</kbd> select</span>
          <span><kbd style={{ fontFamily:font.mono }}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
