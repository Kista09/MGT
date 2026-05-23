import { C, NAV_ITEMS, font } from "../constants";
import { useApp } from "../context";

export default function Sidebar() {
  const { state, dispatch, navigate } = useApp();
  const { view } = state.nav;

  return (
    <aside style={{ width:240, background:C.dark, borderRight:`1px solid rgba(255,255,255,0.08)`,
      display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh" }}>

      <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:8, background:C.accent,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
            fontWeight:800, color:"#fff", fontFamily:font.mono }}>M</div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, fontFamily:font.display, color:"#fff", lineHeight:1 }}>MgucaTECH</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)", letterSpacing:.8, textTransform:"uppercase" }}>Internal CRM</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 12px 0" }}>
        <button type="button" onClick={() => dispatch({ type:"TOGGLE_COMMAND_PALETTE" })}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
            padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`,
            background:"rgba(255,255,255,0.04)", cursor:"pointer", color:"rgba(255,255,255,0.62)", fontSize:12,
            transition:"all .15s", justifyContent:"space-between" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
          <span>Search workspace</span>
          <kbd style={{ fontFamily:font.mono, fontSize:10, background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.12)", borderRadius:4, padding:"1px 5px" }}>Ctrl K</kbd>
        </button>
      </div>

      <nav style={{ padding:"10px 12px", flex:1 }}>
        {NAV_ITEMS.map(item => {
          const active = view === item.id || (view === "client-detail" && item.id === "clients");
          return (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer",
                background: active ? "rgba(232,86,26,0.13)" : "transparent",
                color: active ? C.accent : "rgba(255,255,255,0.58)",
                fontSize:14, fontWeight: active ? 700 : 500,
                marginBottom:3, textAlign:"left", transition:"all .12s",
                fontFamily:font.body }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.card; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width:22, height:22, borderRadius:6, background: active ? C.accent : "rgba(255,255,255,0.07)",
                color: active ? "#fff" : "rgba(255,255,255,0.45)", display:"inline-flex", alignItems:"center",
                justifyContent:"center", fontSize:11, fontWeight:800, fontFamily:font.mono }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:"14px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)", letterSpacing:.5, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>
          Signed in
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:99, flexShrink:0,
            background:C.teal,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:800, color:"#fff" }}>{state.user.avatar}</div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{state.user.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)" }}>{state.user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
