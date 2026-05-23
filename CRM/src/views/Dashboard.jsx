import { C, font, STAGE_CONFIG } from "../constants";
import { useApp } from "../context";
import MetricCard from "../components/MetricCard";
import CustomTooltip from "../components/CustomTooltip";
import { clientHealthScore, healthColor, fmt$, daysUntil, formatDateShort } from "../utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";

const panelStyle = {
  background: `linear-gradient(180deg, ${C.card}, ${C.surface})`,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
};

export default function Dashboard() {
  const { state, navigate } = useApp();
  const { clients, bots, pipeline, mrrData, msgData, activity, tasks } = state;

  const active = clients.filter(c => c.status === "Active");
  const totalMrr = active.reduce((a, c) => a + c.mrr, 0);
  const prevMrr = mrrData[mrrData.length - 2]?.mrr ?? totalMrr;
  const mrrDelta = prevMrr > 0 ? (((totalMrr - prevMrr) / prevMrr) * 100).toFixed(1) : "0";
  const allDeals = Object.values(pipeline).flat();
  const pipeValue = allDeals.reduce((a, d) => a + d.value, 0);
  const weightedValue = allDeals.reduce((a, d) => a + d.value * (d.probability / 100), 0);
  const enterpriseClients = active.filter(c => c.plan === "Enterprise").length;
  const mandateWinRate = allDeals.length ? Math.round(((pipeline["Closed Won"] ?? []).length / allDeals.length) * 100) : 0;
  const openTasks = tasks.filter(task => task.status !== "Done");
  const urgentTasks = [...openTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);

  const atRisk = clients
    .filter(c => c.status === "Active")
    .map(c => ({ ...c, health: clientHealthScore(c, bots) }))
    .filter(c => c.health < 65)
    .sort((a, b) => a.health - b.health)
    .slice(0, 3);

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, gap:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Executive Command Center</div>
          <div style={{ color:C.muted, fontSize:14 }}>Friday, 22 May 2026 - investment operations, relationships, and mandate flow</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" onClick={() => navigate("clients")}
            style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`, color:C.accent,
              borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ New Relationship</button>
          <button type="button" onClick={() => navigate("pipeline")}
            style={{ background:C.blueBg, border:`1px solid ${C.blue}`, color:C.blue,
              borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Add Mandate</button>
        </div>
      </div>

      <section style={{ ...panelStyle, padding:24, marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:22, flexWrap:"wrap", alignItems:"flex-start" }}>
          <div style={{ flex:"1 1 360px" }}>
            <div style={{ color:C.accent, fontSize:11, fontWeight:800, letterSpacing:.8, textTransform:"uppercase", marginBottom:10 }}>
              Investment committee brief
            </div>
            <div style={{ fontSize:28, lineHeight:1.15, fontWeight:800, maxWidth:760 }}>
              Relationship coverage is healthy, with mandate-weighted revenue at {fmt$(Math.round(weightedValue))}/mo.
            </div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.6, marginTop:12, maxWidth:760 }}>
              Prioritize high-value enterprise relationships, close proposal-stage mandates, and resolve open follow-ups before the weekly partner review.
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(130px,1fr))", gap:12, flex:"0 1 360px" }}>
            {[
              { label:"Enterprise relationships", value:enterpriseClients },
              { label:"Mandate win rate", value:`${mandateWinRate}%` },
              { label:"Weighted mandate flow", value:fmt$(Math.round(weightedValue)) },
              { label:"Open partner actions", value:openTasks.length },
            ].map(item => (
              <div key={item.label} style={{ background:C.slate, border:`1px solid ${C.border}`, borderRadius:6, padding:"12px 14px" }}>
                <div style={{ color:C.muted, fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", marginBottom:6 }}>{item.label}</div>
                <div style={{ color:C.text, fontFamily:font.mono, fontSize:18, fontWeight:800 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display:"flex", gap:16, marginBottom:28, flexWrap:"wrap" }}>
        <MetricCard label="Recurring Advisory Revenue" value={fmt$(totalMrr)} sub={`${mrrDelta}% vs last month`} color={C.accent} trend="up" />
        <MetricCard label="Annualized Revenue" value={`$${(totalMrr * 12 / 1000).toFixed(0)}k`} sub={`${active.length} active relationships`} color={C.blue} />
        <MetricCard label="Operations Coverage" value={bots.length} sub={`${bots.filter(b => b.status === "Online").length} online - ${bots.filter(b => b.status === "Warning").length} warnings`} />
        <MetricCard label="Mandate Pipeline" value={fmt$(pipeValue)} sub={`${allDeals.length} active mandates`} color={C.yellow} />
        <MetricCard label="Partner Follow-ups" value={openTasks.length} sub={`${openTasks.filter(t => daysUntil(t.dueDate) <= 0).length} due now`} color={C.purple} />
      </div>

      <div style={{ display:"flex", gap:20, marginBottom:28, flexWrap:"wrap" }}>
        <div style={{ ...panelStyle, padding:"20px 24px", flex:2, minWidth:300 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:20 }}>Revenue Growth</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="mrrG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={.25}/>
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip prefix="$" />}/>
              <Area type="monotone" dataKey="mrr" stroke={C.accent} strokeWidth={2.5} fill="url(#mrrG)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...panelStyle, padding:"20px 24px", flex:1, minWidth:240 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:20 }}>Operational Volume / Day</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={msgData} barSize={18}>
              <XAxis dataKey="d" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="msgs" fill={C.accentDim} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:28 }}>
        <div style={{ ...panelStyle, padding:"20px 24px", flex:1, minWidth:260 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:16 }}>Mandate Snapshot</div>
          {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => {
            const deals = pipeline[stage] ?? [];
            const val = deals.reduce((a, d) => a + d.value, 0);
            const pct = pipeValue > 0 ? (val / pipeValue) * 100 : 0;
            return (
              <div key={stage} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:cfg.color, fontWeight:700 }}>{stage}</span>
                  <span style={{ fontSize:11, color:C.muted, fontFamily:font.mono }}>{deals.length} mandates - {fmt$(val)}</span>
                </div>
                <div style={{ background:C.surface, borderRadius:99, height:5 }}>
                  <div style={{ width:`${pct}%`, background:cfg.color, borderRadius:99, height:"100%", transition:"width .8s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...panelStyle, padding:"20px 24px", flex:1.5, minWidth:280 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:16 }}>Partner Activity</div>
          {activity.slice(0, 6).map((a, i) => (
            <div key={a.id ?? i} style={{ display:"flex", gap:12, marginBottom:14,
              paddingBottom:14, borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width:24, height:24, borderRadius:6, background:C.slate, color:C.accent,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>{a.text}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
        <div style={{ ...panelStyle, padding:"20px 24px", flex:1, minWidth:260 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:16 }}>Top Operational Workloads</div>
          {[...bots].sort((a,b) => b.msgs - a.msgs).slice(0, 6).map((b, i) => (
            <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12,
              marginBottom:12, paddingBottom:12, borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width:24, height:24, borderRadius:6, background:C.accentBg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:800, color:C.accent, fontFamily:font.mono, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, overflow:"hidden" }}>
                <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap",
                  overflow:"hidden", textOverflow:"ellipsis" }}>{b.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>{b.client}</div>
              </div>
              <div style={{ fontFamily:font.mono, fontSize:12, color:C.accent, fontWeight:800 }}>{b.msgs.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ ...panelStyle, padding:"20px 24px", flex:1, minWidth:260 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
            textTransform:"uppercase", marginBottom:16 }}>Relationship Risk</div>
          {atRisk.length === 0 ? (
            <div style={{ padding:16, textAlign:"center", color:C.accent, fontSize:13 }}>
              No material relationship risk
            </div>
          ) : atRisk.map((client, index) => (
            <div key={client.id} onClick={() => navigate("client-detail", client.id)}
              style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, cursor:"pointer",
                paddingBottom:14, borderBottom:index < atRisk.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{client.name}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{client.tag} - {client.plan}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:font.mono, fontSize:14, fontWeight:800, color:healthColor(client.health) }}>{client.health}</div>
                <div style={{ fontSize:10, color:C.muted }}>health</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...panelStyle, padding:"20px 24px", flex:1, minWidth:260 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.7,
              textTransform:"uppercase" }}>Next Partner Actions</div>
            <button type="button" onClick={() => navigate("followups")}
              style={{ background:"transparent", border:"none", color:C.accent, fontSize:11,
                fontWeight:800, cursor:"pointer", padding:0 }}>View all</button>
          </div>
          {urgentTasks.length === 0 ? (
            <div style={{ padding:16, textAlign:"center", color:C.accent, fontSize:13 }}>No actions due</div>
          ) : urgentTasks.map((task, index) => {
            const client = clients.find(c => c.id === task.clientId);
            const delta = daysUntil(task.dueDate);
            const dueColor = delta < 0 ? C.red : delta === 0 ? C.yellow : C.muted;
            return (
              <div key={task.id} onClick={() => navigate("followups")}
                style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, cursor:"pointer",
                  paddingBottom:14, borderBottom:index < urgentTasks.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{task.title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{client?.name ?? "Unknown relationship"}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, color:dueColor, fontWeight:800 }}>
                    {delta === 0 ? "Today" : formatDateShort(task.dueDate)}
                  </div>
                  <div style={{ fontSize:10, color:C.muted }}>{task.priority}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
