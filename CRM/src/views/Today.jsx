import { C, font, pill } from "../constants";
import { useApp } from "../context";
import MetricCard from "../components/MetricCard";
import { buildPriorityQueue, fmt$, formatDateShort, daysUntil } from "../utils";

function tone(type) {
  if (type === "Request") return { color: C.red, bg: C.redBg };
  if (type === "Follow-up") return { color: C.yellow, bg: C.yellowBg };
  if (type === "Operations") return { color: C.teal, bg: C.blueBg };
  return { color: C.accent, bg: C.accentBg };
}

export default function Today() {
  const { state, navigate } = useApp();
  const queue = buildPriorityQueue(state);
  const top = queue[0];
  const overdue = queue.filter(item => daysUntil(item.dueDate) < 0).length;
  const dueToday = queue.filter(item => daysUntil(item.dueDate) === 0).length;
  const billingDue = (state.billing ?? []).filter(invoice => ["Due", "Overdue"].includes(invoice.status));
  const unpaid = billingDue.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:26 }}>
        <div>
          <div style={{ color:C.accent, fontSize:11, fontWeight:900, letterSpacing:.8, textTransform:"uppercase", marginBottom:6 }}>
            Daily command queue
          </div>
          <div style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>What needs attention first</div>
          <div style={{ color:C.muted, fontSize:14 }}>Requests, follow-ups, operations, and billing ranked into one South African operating queue.</div>
        </div>
        {top && (
          <button type="button" onClick={() => navigate(top.nav)}
            style={{ background:C.accent, border:"none", borderRadius:8, color:"#000",
              cursor:"pointer", fontSize:13, fontWeight:900, padding:"10px 16px" }}>
            Tend first: {top.type}
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(160px,1fr))", gap:14, marginBottom:22 }}>
        <MetricCard label="Priority Queue" value={queue.length} sub="Open work items" color={C.accent} />
        <MetricCard label="Overdue" value={overdue} sub="Needs immediate action" color={overdue ? C.red : C.muted} />
        <MetricCard label="Due Today" value={dueToday} sub="Johannesburg time" color={dueToday ? C.yellow : C.muted} />
        <MetricCard label="Unpaid Billing" value={fmt$(unpaid)} sub={`${billingDue.length} invoices`} color={unpaid ? C.red : C.muted} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(360px,1.3fr) minmax(280px,.7fr)", gap:18, alignItems:"start" }}>
        <section style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
          <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase" }}>Tend first</div>
          </div>
          {queue.length === 0 ? (
            <div style={{ padding:32, color:C.muted, textAlign:"center" }}>No urgent work in the queue.</div>
          ) : queue.slice(0, 12).map((item, index) => {
            const t = tone(item.type);
            const delta = daysUntil(item.dueDate);
            const dueLabel = delta < 0 ? `${Math.abs(delta)}d overdue` : delta === 0 ? "Today" : formatDateShort(item.dueDate);
            return (
              <button key={item.id} type="button" onClick={() => navigate(item.nav)}
                style={{ width:"100%", border:"none", borderBottom:index < Math.min(queue.length, 12) - 1 ? `1px solid ${C.border}` : "none",
                  background:index === 0 ? C.accentBg : C.card, color:C.text, textAlign:"left",
                  display:"grid", gridTemplateColumns:"36px 1fr auto", gap:14, padding:"16px 18px", cursor:"pointer" }}>
                <span style={{ width:28, height:28, borderRadius:6, background:index === 0 ? C.accent : C.subtle,
                  color:index === 0 ? "#000" : C.muted, display:"inline-flex", alignItems:"center",
                  justifyContent:"center", fontFamily:font.mono, fontWeight:900 }}>{index + 1}</span>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:6 }}>
                    <span style={pill(t.color, t.bg)}>{item.type}</span>
                    <span style={pill(delta <= 0 ? C.red : C.muted, C.surface)}>{dueLabel}</span>
                    <span style={pill(C.muted, C.subtle)}>{item.priority}</span>
                  </span>
                  <span style={{ display:"block", fontSize:14, fontWeight:800, lineHeight:1.35 }}>{item.title}</span>
                  <span style={{ display:"block", color:C.muted, fontSize:12, marginTop:3 }}>{item.client} - {item.reason}</span>
                </span>
                <span style={{ color:t.color, fontSize:11, fontWeight:900, textTransform:"uppercase", alignSelf:"center" }}>
                  Open
                </span>
              </button>
            );
          })}
        </section>

        <aside style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <section style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:14 }}>
              Client onboarding progress
            </div>
            {state.serviceRequests.filter(item => item.source === "onboarding" || item.status === "Approved" || item.portalGranted).slice(0, 4).map(request => {
              const steps = ["Approved", "Portal Created", "Assets Received", "Bot Configured", "Testing", "Live"];
              const active = request.status === "Live" ? 6 : request.portalGranted ? 2 : request.status === "Approved" ? 1 : 0;
              return (
                <div key={request.id} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:7 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{request.company ?? request.requester}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{active}/{steps.length}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:`repeat(${steps.length},1fr)`, gap:4 }}>
                    {steps.map((step, i) => (
                      <div key={step} title={step} style={{ height:6, borderRadius:99, background:i < active ? C.accent : C.subtle }} />
                    ))}
                  </div>
                </div>
              );
            })}
            {state.serviceRequests.filter(item => item.source === "onboarding" || item.status === "Approved" || item.portalGranted).length === 0 && (
              <div style={{ color:C.muted, fontSize:13 }}>No onboarding projects yet.</div>
            )}
          </section>

          <section style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:14 }}>
              Recent audit trail
            </div>
            {(state.auditLog ?? []).slice(0, 6).map(item => (
              <div key={item.id} style={{ padding:"0 0 12px", marginBottom:12, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:13, fontWeight:800 }}>{item.action}</div>
                <div style={{ color:C.muted, fontSize:12, lineHeight:1.5 }}>{item.target}</div>
                <div style={{ color:C.muted, fontSize:10, marginTop:3 }}>{item.actor} - {new Date(item.time).toLocaleString("en-ZA")}</div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
