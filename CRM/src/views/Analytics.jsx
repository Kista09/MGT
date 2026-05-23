import { useMemo, useState } from "react";
import { C, font, PLAN_COLORS, STAGE_CONFIG } from "../constants";
import { useApp } from "../context";
import MetricCard from "../components/MetricCard";
import CustomTooltip from "../components/CustomTooltip";
import SegmentTabs from "../components/SegmentTabs";
import { clientHealthScore, fmt$ } from "../utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.08) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11}>{(percent*100).toFixed(0)}%</text>;
};

function SectionTitle({ children }) {
  return <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.6, textTransform:"uppercase", marginBottom:16 }}>{children}</div>;
}

export default function Analytics() {
  const { state } = useApp();
  const { clients, bots, pipeline, mrrData } = state;
  const [reportMode, setReportMode] = useState("Overview");

  const active = clients.filter(c => c.status === "Active");
  const totalMrr = active.reduce((a, c) => a + c.mrr, 0);
  const arr      = totalMrr * 12;
  const churnRate = clients.length > 0 ? ((clients.filter(c => c.status === "Churned").length / clients.length) * 100).toFixed(1) : 0;
  const avgMrr    = active.length > 0 ? Math.round(totalMrr / active.length) : 0;

  const mrrPrev   = mrrData[mrrData.length - 2]?.mrr ?? totalMrr;
  const mrrGrowth = mrrPrev > 0 ? (((totalMrr - mrrPrev) / mrrPrev) * 100).toFixed(1) : "0";

  // Revenue by plan
  const byPlan = useMemo(() => {
    const map = {};
    active.forEach(c => { map[c.plan] = (map[c.plan] || 0) + c.mrr; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [active]);

  // Pipeline value by stage
  const byStage = useMemo(() =>
    Object.entries(STAGE_CONFIG).map(([stage, cfg]) => ({
      stage,
      value: (pipeline[stage] ?? []).reduce((a, d) => a + d.value, 0),
      weighted: (pipeline[stage] ?? []).reduce((a, d) => a + d.value * (d.probability / 100), 0),
      color: cfg.color,
    }))
  , [pipeline]);

  // Top bots by messages
  const topBots = useMemo(() => [...bots].sort((a, b) => b.msgs - a.msgs).slice(0, 8), [bots]);

  // Revenue by client (top 8)
  const topClients = useMemo(() => [...active].sort((a, b) => b.mrr - a.mrr).slice(0, 8), [active]);

  // Health distribution
  const healthBuckets = useMemo(() => {
    const healthy  = active.filter(c => clientHealthScore(c, bots) >= 80).length;
    const neutral  = active.filter(c => { const h = clientHealthScore(c, bots); return h >= 55 && h < 80; }).length;
    const atRisk   = active.filter(c => clientHealthScore(c, bots) < 55).length;
    return [
      { name:"Healthy",  value:healthy, color:C.accent  },
      { name:"Neutral",  value:neutral, color:C.yellow  },
      { name:"At Risk",  value:atRisk,  color:C.red     },
    ].filter(b => b.value > 0);
  }, [active, bots]);

  const planColors = { Enterprise:"#7c3aed", Scale:"#2563eb", Growth:"#1a9948" };
  const analyticsTabs = [
    { id:"Overview", label:"Overview", count:clients.length },
    { id:"Revenue", label:"Revenue", count:active.length },
    { id:"Mandates", label:"Mandates", count:Object.values(pipeline).flat().length },
    { id:"Risk", label:"Risk", count:healthBuckets.find(b => b.name === "At Risk")?.value ?? 0 },
    { id:"Operations", label:"Operations", count:bots.length },
  ];
  const reportCopy = {
    Overview: "Board-level view across revenue, mandate flow, risk, and operations.",
    Revenue: "Revenue concentration, recurring fee quality, and client contribution.",
    Mandates: "Pipeline stage value and weighted mandate progression.",
    Risk: "Relationship health, churn exposure, and client concentration risk.",
    Operations: "Bot workload, uptime exposure, and operational performance.",
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Analytics</div>
        <div style={{ color:C.muted, fontSize:14 }}>{reportCopy[reportMode]}</div>
      </div>

      <SegmentTabs tabs={analyticsTabs} value={reportMode} onChange={setReportMode} />

      {/* KPI row */}
      <div style={{ display:"flex", gap:16, marginBottom:28, flexWrap:"wrap" }}>
        <MetricCard label="Annual Run Rate"      value={`$${(arr/1000).toFixed(0)}k`} sub={`+${mrrGrowth}% MoM`} color={C.accent} trend="up" />
        <MetricCard label="Avg MRR / Client"     value={fmt$(avgMrr)} sub={`${active.length} active clients`} />
        <MetricCard label="Churn Rate"           value={`${churnRate}%`} sub={`${clients.filter(c => c.status === "Churned").length} churned`} color={parseFloat(churnRate) > 10 ? C.red : C.yellow} trend={parseFloat(churnRate) > 10 ? "down" : undefined} />
        <MetricCard label="Bot Fleet Messages"   value={bots.reduce((a, b) => a + b.msgs, 0).toLocaleString()} sub="Total across all bots" color={C.blue} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display:"flex", gap:20, marginBottom:24, flexWrap:"wrap" }}>
        {/* MRR trend */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:2, minWidth:320 }}>
          <SectionTitle>MRR Growth Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="mrrGA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={.3}/>
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip prefix="$" />}/>
              <Area type="monotone" dataKey="mrr" stroke={C.accent} strokeWidth={2.5} fill="url(#mrrGA)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by plan */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:1, minWidth:240 }}>
          <SectionTitle>Revenue by Plan</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byPlan} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={3}
                labelLine={false} label={renderCustomLabel}>
                {byPlan.map(entry => (
                  <Cell key={entry.name} fill={planColors[entry.name] || C.muted} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, "MRR"]}
                contentStyle={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8 }}
                labelStyle={{ color:C.muted }} itemStyle={{ color:C.accent }} />
              <Legend formatter={(v) => <span style={{ color:C.muted, fontSize:11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:"flex", gap:20, marginBottom:24, flexWrap:"wrap" }}>
        {/* Pipeline by stage */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:1, minWidth:280 }}>
          <SectionTitle>Pipeline by Stage</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byStage} barSize={28}>
              <XAxis dataKey="stage" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip prefix="$" />}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {byStage.map(entry => <Cell key={entry.stage} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Client health distribution */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:1, minWidth:240 }}>
          <SectionTitle>Client Health Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={healthBuckets} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={70} paddingAngle={3} labelLine={false} label={renderCustomLabel}>
                {healthBuckets.map(b => <Cell key={b.name} fill={b.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8 }}
                labelStyle={{ color:C.muted }} itemStyle={{ color:C.text }} />
              <Legend formatter={(v) => <span style={{ color:C.muted, fontSize:11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top clients + top bots tables */}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
        {/* Top clients by MRR */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:1, minWidth:260 }}>
          <SectionTitle>Top Clients by MRR</SectionTitle>
          {topClients.map((c, i) => {
            const pct = totalMrr > 0 ? (c.mrr / totalMrr) * 100 : 0;
            return (
              <div key={c.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:font.mono, fontSize:11, color:C.muted, width:16 }}>{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:500 }}>{c.name}</span>
                  </div>
                  <span style={{ fontFamily:font.mono, fontSize:12, color:C.accent }}>{fmt$(c.mrr)}</span>
                </div>
                <div style={{ background:C.surface, borderRadius:99, height:4 }}>
                  <div style={{ width:`${pct}%`, background:C.accent, borderRadius:99, height:"100%", transition:"width .8s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top bots by volume */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"20px 24px", flex:1, minWidth:260 }}>
          <SectionTitle>Top Bots by Message Volume</SectionTitle>
          {topBots.map((b, i) => {
            const maxMsgs = topBots[0]?.msgs ?? 1;
            const pct = (b.msgs / maxMsgs) * 100;
            const uc = b.uptime >= 99.5 ? C.accent : b.uptime >= 98 ? C.yellow : C.red;
            return (
              <div key={b.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:font.mono, fontSize:11, color:C.muted, width:16 }}>{i+1}</span>
                    <div>
                      <span style={{ fontSize:13, fontWeight:500 }}>{b.name}</span>
                      <span style={{ fontSize:10, color:C.muted, marginLeft:6 }}>{b.client}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily:font.mono, fontSize:12, color:uc }}>{b.msgs.toLocaleString()}</span>
                </div>
                <div style={{ background:C.surface, borderRadius:99, height:4 }}>
                  <div style={{ width:`${pct}%`, background:uc, borderRadius:99, height:"100%", transition:"width .8s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
