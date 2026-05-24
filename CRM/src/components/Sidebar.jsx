import { C, NAV_GROUPS, font } from "../constants";
import { useApp } from "../context";
import { buildPriorityQueue } from "../utils";

export default function Sidebar() {
  const { state, dispatch, navigate } = useApp();
  const { view } = state.nav;
  const privateClientOnly = state.user?.role === "private_client";
  const today = new Date().toISOString().slice(0, 10);
  const openRequests = (state.serviceRequests ?? []).filter(request =>
    !["Resolved", "Closed"].includes(request.status)
  );
  const urgentFollowUps = (state.tasks ?? []).filter(task =>
    task.status !== "Done" && task.dueDate <= today
  );
  const operationsAttention = (state.bots ?? []).filter(bot =>
    ["Warning", "Offline"].includes(bot.status) || (bot.errorRate ?? 0) > 0.1
  );
  const attentionCounts = {
    today: buildPriorityQueue(state).length,
    requests: openRequests.length,
    followups: urgentFollowUps.length,
    bots: operationsAttention.length,
  };
  const tendFirst = [
    { id:"requests", label:"Requests", count:attentionCounts.requests, tone:C.red },
    { id:"followups", label:"Follow-ups", count:attentionCounts.followups, tone:C.yellow },
    { id:"bots", label:"Operations", count:attentionCounts.bots, tone:C.accent },
  ].filter(item => item.count > 0)[0];

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
        {(privateClientOnly
          ? [{ label: "Private", items: [{ id:"private-clients", icon:"P", label:"Private Clients" }] }]
          : NAV_GROUPS
        ).map(group => (
          <div key={group.label} style={{ marginBottom:10 }}>
            <div style={{ padding:"8px 12px 6px", color:"rgba(255,255,255,0.34)",
              fontSize:10, fontWeight:800, letterSpacing:.8, textTransform:"uppercase",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <span>{group.label}</span>
              {!privateClientOnly && group.label === "Consultant" && tendFirst && (
                <button type="button" onClick={() => navigate(tendFirst.id)}
                  style={{ border:"none", borderRadius:99, background:"rgba(255,255,255,0.08)",
                    color:tendFirst.tone, cursor:"pointer", padding:"2px 7px",
                    fontSize:9, fontWeight:900, letterSpacing:.5, textTransform:"uppercase" }}>
                  Tend first
                </button>
              )}
            </div>
            {group.items.map(item => {
              const active = view === item.id || (view === "client-detail" && item.id === "clients");
              const count = attentionCounts[item.id] ?? 0;
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
                  <span style={{ flex:1 }}>{item.label}</span>
                  {count > 0 && (
                    <span style={{ minWidth:20, height:20, borderRadius:99,
                      background: active ? C.accent : "rgba(232,86,26,0.16)",
                      color: active ? "#fff" : C.accent, display:"inline-flex",
                      alignItems:"center", justifyContent:"center", fontSize:10,
                      fontWeight:900, fontFamily:font.mono }}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
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
