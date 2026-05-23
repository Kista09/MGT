import { useState, useMemo } from "react";
import { C, font, statusPill, pill, TYPE_COLORS, BOT_TYPES, BOT_STATUSES, LANGUAGES } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";

const BLANK = { name:"", client:"", type:"Support", lang:"English", status:"Online" };
const RUNBOOKS = [
  { title:"Bot offline", match:b => b.status === "Offline", steps:["Confirm provider status page", "Check WhatsApp webhook delivery", "Restart bot worker", "Notify client with ETA"] },
  { title:"High error rate", match:b => (b.errorRate ?? 0) > 0.1, steps:["Open failed conversation samples", "Check recent flow changes", "Patch failing intent or API call", "Retest top 5 client journeys"] },
  { title:"Latency spike", match:b => b.avgResponseMs > 500 || b.uptime < 98.5, steps:["Check response-time trend", "Review upstream API latency", "Escalate hosting issue", "Send incident summary"] },
  { title:"Client cannot log in", match:b => b.type === "Support", steps:["Verify portal account", "Reset temporary password", "Confirm CORS/session cookie", "Ask client to retry"] },
];

function validate(f) {
  const e = {};
  if (!f.name.trim())   e.name   = "Required";
  if (!f.client.trim()) e.client = "Required";
  return e;
}

function BotForm({ form, setForm, errors, clientNames }) {
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Bot Name" error={errors.name}>
          <input value={form.name} onChange={set("name")} style={{ ...inputStyle, borderColor: errors.name ? C.red : C.border }} placeholder="Customer Support Bot" />
        </FormRow>
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Client" error={errors.client}>
          <select value={form.client} onChange={set("client")} style={{ ...selectStyle, borderColor: errors.client ? C.red : C.border }}>
            <option value="">Select client…</option>
            {clientNames.map(n => <option key={n}>{n}</option>)}
          </select>
        </FormRow>
      </div>
      <FormRow label="Type">
        <select value={form.type} onChange={set("type")} style={selectStyle}>
          {BOT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </FormRow>
      <FormRow label="Language">
        <select value={form.lang} onChange={set("lang")} style={selectStyle}>
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
      </FormRow>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Status">
          <select value={form.status} onChange={set("status")} style={selectStyle}>
            {BOT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormRow>
      </div>
    </div>
  );
}

export default function Bots() {
  const { state, dispatch, toast } = useApp();
  const { bots, clients } = state;

  const [search,     setSearch]     = useState("");
  const [opsSegment, setOpsSegment] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [addOpen,    setAddOpen]    = useState(false);
  const [editBot,    setEditBot]    = useState(null);
  const [delBot,     setDelBot]     = useState(null);
  const [form,       setForm]       = useState(BLANK);
  const [errors,     setErrors]     = useState({});

  const types = ["All", ...BOT_TYPES];
  const clientNames = clients.filter(c => c.status !== "Churned").map(c => c.name);

  const filtered = useMemo(() => bots.filter(b =>
    (opsSegment === "All" ||
     b.status === opsSegment ||
     b.type === opsSegment ||
     (opsSegment === "High Volume" && b.msgs >= 10000) ||
     (opsSegment === "Latency Risk" && ((b.errorRate ?? 0) > 0.1 || b.uptime < 98.5))) &&
    (typeFilter === "All" || b.type === typeFilter) &&
    (b.name.toLowerCase().includes(search.toLowerCase()) ||
     b.client.toLowerCase().includes(search.toLowerCase()))
  ), [bots, opsSegment, search, typeFilter]);

  const opsTabs = useMemo(() => {
    const count = (predicate) => bots.filter(predicate).length;
    return [
      { id:"All", label:"All", count:bots.length },
      { id:"Online", label:"Online", count:count(b => b.status === "Online") },
      { id:"Warning", label:"Warnings", count:count(b => b.status === "Warning") },
      { id:"Trial", label:"Trial", count:count(b => b.status === "Trial") },
      { id:"High Volume", label:"High Volume", count:count(b => b.msgs >= 10000) },
      { id:"Latency Risk", label:"Latency Risk", count:count(b => ((b.errorRate ?? 0) > 0.1 || b.uptime < 98.5)) },
      ...BOT_TYPES.map(type => ({ id:type, label:type, count:count(b => b.type === type) })),
    ];
  }, [bots]);

  const activeIncidents = bots.filter(bot =>
    ["Warning", "Offline"].includes(bot.status) || (bot.errorRate ?? 0) > 0.1 || bot.avgResponseMs > 500 || bot.uptime < 98.5
  );

  const openAdd  = () => { setForm(BLANK); setErrors({}); setAddOpen(true); };
  const openEdit = (b) => { setForm({ name:b.name, client:b.client, type:b.type, lang:b.lang, status:b.status }); setErrors({}); setEditBot(b); };

  const saveAdd = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({ type:"ADD_BOT", bot: form });
    toast(`${form.name} deployed`, "🤖");
    setAddOpen(false);
  };

  const saveEdit = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({ type:"UPDATE_BOT", bot: { ...editBot, ...form } });
    toast(`${form.name} updated`, "✏️");
    setEditBot(null);
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_BOT", id: delBot.id });
    toast(`${delBot.name} removed`, "🗑️", "warning");
    setDelBot(null);
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Bot Fleet</div>
          <div style={{ color:C.muted, fontSize:14 }}>
            {bots.length} bots · {bots.filter(b => b.status === "Online").length} online ·{" "}
            {bots.filter(b => b.status === "Warning").length} warnings
          </div>
        </div>
        <button onClick={openAdd}
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
            padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Deploy Bot</button>
      </div>

      <SegmentTabs tabs={opsTabs} value={opsSegment} onChange={setOpsSegment} />

      <div style={{ display:"grid", gridTemplateColumns:"minmax(280px,1fr) minmax(280px,1fr)", gap:14, margin:"10px 0 22px" }}>
        <section style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:12 }}>
            Operations runbook
          </div>
          {RUNBOOKS.map(runbook => {
            const count = bots.filter(runbook.match).length;
            return (
              <div key={runbook.title} style={{ display:"grid", gridTemplateColumns:"120px 1fr auto", gap:12,
                padding:"10px 0", borderBottom:`1px solid ${C.border}`, alignItems:"start" }}>
                <div style={{ color:count ? C.red : C.text, fontSize:13, fontWeight:800 }}>{runbook.title}</div>
                <div style={{ color:C.muted, fontSize:12, lineHeight:1.55 }}>{runbook.steps.join(" -> ")}</div>
                <div style={{ color:count ? C.red : C.muted, fontFamily:font.mono, fontWeight:900 }}>{count}</div>
              </div>
            );
          })}
        </section>
        <section style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:12 }}>
            Incidents to tend first
          </div>
          {activeIncidents.length === 0 ? (
            <div style={{ color:C.muted, fontSize:13 }}>No active operations incidents.</div>
          ) : activeIncidents.slice(0, 4).map(bot => (
            <div key={bot.id} style={{ display:"flex", justifyContent:"space-between", gap:12,
              padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800 }}>{bot.client} - {bot.name}</div>
                <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>
                  {bot.status} - {bot.avgResponseMs}ms avg - {bot.errorRate ?? 0}% errors
                </div>
              </div>
              <span style={{ color:bot.status === "Offline" ? C.red : C.yellow, fontSize:11, fontWeight:900 }}>{bot.status}</span>
            </div>
          ))}
        </section>
      </div>

      {/* filters */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <input placeholder="Search bots or clients…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, padding:"8px 14px", fontSize:13, outline:"none",
            flex:"1 1 200px", maxWidth:280 }}/>
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{ background: typeFilter === t ? C.accentBg : C.card,
              border:`1px solid ${typeFilter === t ? C.accent : C.border}`,
              color: typeFilter === t ? C.accent : C.muted,
              borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight:500 }}>{t}</button>
        ))}
      </div>

      {/* grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
        {filtered.map(bot => {
          const tc = TYPE_COLORS[bot.type] || C.muted;
          const uc = bot.uptime >= 99.5 ? C.accent : bot.uptime >= 98 ? C.yellow : C.red;
          return (
            <div key={bot.id}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
                padding:20, transition:"transform .15s, box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px #00000080"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>

              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{bot.name}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{bot.client}</div>
                </div>
                <span style={statusPill(bot.status)}>{bot.status}</span>
              </div>

              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                <span style={{ ...pill(tc, `${tc}22`) }}>{bot.type}</span>
                <span style={{ ...pill(C.muted, C.subtle) }}>{bot.lang}</span>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
                {[
                  { label:"Messages", value:bot.msgs.toLocaleString(), color:C.text },
                  { label:"Uptime",   value:`${bot.uptime}%`,          color:uc },
                  { label:"Errors",   value:`${bot.errorRate ?? 0}%`,  color: (bot.errorRate ?? 0) > 0.1 ? C.red : C.muted },
                ].map(m => (
                  <div key={m.label} style={{ background:C.surface, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ fontFamily:font.mono, fontSize:13, fontWeight:700, color:m.color }}>{m.value}</div>
                    <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:.4, marginTop:2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* uptime bar */}
              <div style={{ background:C.surface, borderRadius:99, height:4, marginBottom:12 }}>
                <div style={{ width:`${bot.uptime}%`, background:uc, borderRadius:99, height:"100%", transition:"width 1s ease" }}/>
              </div>

              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => openEdit(bot)}
                  style={{ background:C.subtle, border:"none", borderRadius:6, padding:"5px 12px",
                    fontSize:11, cursor:"pointer", color:C.muted, fontWeight:600 }}>Edit</button>
                <button onClick={() => setDelBot(bot)}
                  style={{ background:C.redBg, border:"none", borderRadius:6, padding:"5px 12px",
                    fontSize:11, cursor:"pointer", color:C.red, fontWeight:600 }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding:48, textAlign:"center", color:C.muted, fontSize:14 }}>No bots match your filters.</div>
      )}

      {addOpen && (
        <Modal title="Deploy New Bot" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Deploy">
          <BotForm form={form} setForm={setForm} errors={errors} clientNames={clientNames} />
        </Modal>
      )}

      {editBot && (
        <Modal title={`Edit — ${editBot.name}`} onClose={() => setEditBot(null)} onSave={saveEdit}>
          <BotForm form={form} setForm={setForm} errors={errors} clientNames={clientNames} />
        </Modal>
      )}

      {delBot && (
        <Modal title="Remove Bot" onClose={() => setDelBot(null)} onSave={confirmDelete} saveLabel="Remove" danger>
          <p style={{ color:C.text, margin:0 }}>Remove <strong>{delBot.name}</strong> ({delBot.client})?</p>
        </Modal>
      )}
    </div>
  );
}
