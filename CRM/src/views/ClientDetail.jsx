import { useState } from "react";
import { C, font, statusPill, pill, PLAN_COLORS, TYPE_COLORS, PLANS, STATUSES, INDUSTRIES, TASK_PRIORITIES } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import { clientHealthScore, healthColor, fmt$, formatJoined, tenureMonths, daysUntil, formatDateShort, todayISO } from "../utils";

function validate(f) {
  const e = {};
  if (!f.name.trim())      e.name    = "Required";
  if (!f.contact.trim())   e.contact = "Required";
  if (!f.email.includes("@")) e.email = "Valid email required";
  return e;
}

export default function ClientDetail({ clientId }) {
  const { state, dispatch, navigate, toast } = useApp();
  const client = state.clients.find(c => c.id === clientId);

  const [editOpen,   setEditOpen]   = useState(false);
  const [form,       setForm]       = useState({});
  const [errors,     setErrors]     = useState({});
  const [noteText,   setNoteText]   = useState("");
  const [delOpen,    setDelOpen]    = useState(false);
  const [taskOpen,   setTaskOpen]   = useState(false);
  const [taskForm,   setTaskForm]   = useState({ title:"", dueDate:todayISO(), priority:"Medium", notes:"" });

  if (!client) return (
    <div style={{ padding:40, textAlign:"center", color:C.muted }}>
      Client not found.
      <button onClick={() => navigate("clients")} style={{ display:"block", margin:"16px auto 0",
        background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"8px 16px",
        fontSize:13, fontWeight:700, cursor:"pointer" }}>Back to Clients</button>
    </div>
  );

  const clientBots = state.bots.filter(b => b.client === client.name);
  const clientTasks = state.tasks
    .filter(task => task.clientId === client.id && task.status !== "Done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const health     = clientHealthScore(client, state.bots);
  const tenure     = tenureMonths(client.joined);
  const pc         = PLAN_COLORS[client.plan];

  const openEdit = () => { setForm({ ...client, mrr: String(client.mrr) }); setErrors({}); setEditOpen(true); };

  const saveEdit = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({ type:"UPDATE_CLIENT", client: { ...client, ...form, mrr: Number(form.mrr) || 0 } });
    toast("Client updated", "✏️");
    setEditOpen(false);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    dispatch({
      type: "ADD_CLIENT_NOTE",
      clientId: client.id,
      note: { text: noteText.trim(), author: state.user.name, createdAt: new Date().toISOString() },
    });
    setNoteText("");
    toast("Note added", "📝");
  };

  const deleteNote = (noteId) => {
    dispatch({ type:"DELETE_CLIENT_NOTE", clientId: client.id, noteId });
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_CLIENT", id: client.id });
    toast(`${client.name} removed`, "🗑️", "warning");
    navigate("clients");
  };

  const saveTask = () => {
    if (!taskForm.title.trim()) return;
    dispatch({
      type:"ADD_TASK",
      task: {
        clientId: client.id,
        title: taskForm.title.trim(),
        owner: state.user.name,
        dueDate: taskForm.dueDate,
        priority: taskForm.priority,
        status: "Open",
        notes: taskForm.notes.trim(),
      },
    });
    toast("Follow-up added", "!");
    setTaskForm({ title:"", dueDate:todayISO(), priority:"Medium", notes:"" });
    setTaskOpen(false);
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      {/* breadcrumb + actions */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => navigate("clients")}
            style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted,
              borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:500 }}>← Clients</button>
          <span style={{ color:C.muted, fontSize:14 }}>/ {client.name}</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={openEdit}
            style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text,
              borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Edit</button>
          <button onClick={() => setDelOpen(true)}
            style={{ background:C.redBg, border:`1px solid ${C.red}`, color:C.red,
              borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Delete</button>
        </div>
      </div>

      {/* profile header */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
        padding:"24px 28px", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{ width:48, height:48, borderRadius:12,
                background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, fontWeight:700, color:"#000" }}>
                {client.name[0]}
              </div>
              <div>
                <div style={{ fontSize:22, fontWeight:700 }}>{client.name}</div>
                <div style={{ color:C.muted, fontSize:13 }}>Joined {formatJoined(client.joined)} · {tenure} months</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={statusPill(client.status)}>{client.status}</span>
              <span style={{ ...pill(pc.color, pc.bg) }}>{client.plan}</span>
              <span style={{ ...pill(C.muted, C.subtle) }}>{client.tag}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {[
              { label:"MRR", value:fmt$(client.mrr), color: client.mrr > 0 ? C.accent : C.muted },
              { label:"Bots", value:clientBots.length, color:C.blue },
              { label:"Health", value:health, color:healthColor(health) },
            ].map(m => (
              <div key={m.label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:font.mono, fontSize:24, fontWeight:700, color:m.color }}>{m.value}</div>
                <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:.5 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
        {/* left col */}
        <div style={{ flex:2, minWidth:300, display:"flex", flexDirection:"column", gap:20 }}>

          {/* contact info */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px" }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.6, textTransform:"uppercase", marginBottom:16 }}>Contact Info</div>
            {[
              { label:"Primary Contact", value:client.contact },
              { label:"Email",           value:client.email },
              { label:"Phone",           value:client.phone || "—" },
              { label:"Website",         value:client.website || "—" },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.muted }}>{row.label}</span>
                <span style={{ fontSize:13, color:C.text, fontWeight:500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* deployed bots */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px" }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.6, textTransform:"uppercase", marginBottom:16 }}>
              Deployed Bots ({clientBots.length})
            </div>
            {clientBots.length === 0 ? (
              <div style={{ color:C.muted, fontSize:13 }}>No bots deployed.</div>
            ) : clientBots.map(b => {
              const tc = TYPE_COLORS[b.type] || C.muted;
              const uc = b.uptime >= 99.5 ? C.accent : b.uptime >= 98 ? C.yellow : C.red;
              return (
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0",
                  borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{b.name}</div>
                    <div style={{ display:"flex", gap:6, marginTop:4 }}>
                      <span style={{ ...pill(tc, `${tc}22`), fontSize:10 }}>{b.type}</span>
                      <span style={{ ...pill(C.muted, C.subtle), fontSize:10 }}>{b.lang}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:font.mono, fontSize:12, color:uc }}>{b.uptime}%</div>
                    <div style={{ fontSize:10, color:C.muted }}>{b.msgs.toLocaleString()} msgs</div>
                  </div>
                  <span style={{ ...statusPill(b.status), fontSize:10 }}>{b.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* right col: notes */}
        <div style={{ flex:1.2, minWidth:260, display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.6, textTransform:"uppercase" }}>
                Follow-ups
              </div>
              <button type="button" onClick={() => setTaskOpen(true)}
                style={{ background:"transparent", border:"none", color:C.accent, cursor:"pointer",
                  fontSize:12, fontWeight:700, padding:0 }}>+ Add</button>
            </div>
            {clientTasks.length === 0 ? (
              <div style={{ color:C.muted, fontSize:12, textAlign:"center", padding:12 }}>No active follow-ups.</div>
            ) : clientTasks.slice(0, 4).map(task => {
              const delta = daysUntil(task.dueDate);
              const dueColor = delta < 0 ? C.red : delta === 0 ? C.yellow : C.muted;
              return (
                <div key={task.id} style={{ background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:8, padding:"12px 14px", marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                    <div style={{ fontSize:13, color:C.text, fontWeight:600, lineHeight:1.35 }}>{task.title}</div>
                    <button type="button" onClick={() => dispatch({ type:"COMPLETE_TASK", id: task.id })}
                      style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`, color:C.accent,
                        borderRadius:6, padding:"3px 7px", fontSize:10, fontWeight:700, cursor:"pointer", height:24 }}>
                      Done
                    </button>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                    <span style={{ color:dueColor }}>{delta === 0 ? "Due today" : formatDateShort(task.dueDate)}</span>
                    <span style={{ color:C.muted }}>{task.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px" }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.6, textTransform:"uppercase", marginBottom:16 }}>Notes</div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note…"
                style={{ ...inputStyle, resize:"vertical", minHeight:64, flex:1 }}/>
            </div>
            <button onClick={addNote} disabled={!noteText.trim()}
              style={{ width:"100%", background: noteText.trim() ? C.accentBg : C.subtle,
                border:`1px solid ${noteText.trim() ? C.accent : C.border}`,
                color: noteText.trim() ? C.accent : C.muted,
                borderRadius:8, padding:"8px", fontSize:13, fontWeight:600, cursor: noteText.trim() ? "pointer" : "default" }}>
              + Add Note
            </button>
            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:12 }}>
              {client.notes.length === 0 && (
                <div style={{ color:C.muted, fontSize:12, textAlign:"center", padding:12 }}>No notes yet.</div>
              )}
              {[...client.notes].reverse().map(n => (
                <div key={n.id} style={{ background:C.surface, borderRadius:8, padding:"12px 14px",
                  border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, color:C.text, lineHeight:1.5, marginBottom:6 }}>{n.text}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:10, color:C.muted }}>{n.author} · {new Date(n.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => deleteNote(n.id)}
                      style={{ background:"transparent", border:"none", cursor:"pointer",
                        fontSize:11, color:C.muted, padding:0 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <Modal title={`Edit — ${client.name}`} onClose={() => setEditOpen(false)} onSave={saveEdit}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <FormRow label="Company Name" error={errors.name}>
                <input value={form.name} onChange={set("name")} style={inputStyle} />
              </FormRow>
            </div>
            <FormRow label="Contact Name" error={errors.contact}>
              <input value={form.contact} onChange={set("contact")} style={inputStyle} />
            </FormRow>
            <FormRow label="Email" error={errors.email}>
              <input value={form.email} onChange={set("email")} style={inputStyle} />
            </FormRow>
            <FormRow label="Phone">
              <input value={form.phone} onChange={set("phone")} style={inputStyle} />
            </FormRow>
            <FormRow label="Website">
              <input value={form.website} onChange={set("website")} style={inputStyle} />
            </FormRow>
            <FormRow label="Plan">
              <select value={form.plan} onChange={set("plan")} style={selectStyle}>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormRow>
            <FormRow label="Status">
              <select value={form.status} onChange={set("status")} style={selectStyle}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormRow>
            <FormRow label="MRR (R/month)">
              <input value={form.mrr} onChange={set("mrr")} style={inputStyle} type="number" min="0" />
            </FormRow>
            <FormRow label="Industry">
              <select value={form.tag} onChange={set("tag")} style={selectStyle}>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </FormRow>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {delOpen && (
        <Modal title="Delete Client" onClose={() => setDelOpen(false)} onSave={confirmDelete} saveLabel="Delete" danger>
          <p style={{ color:C.text, margin:0 }}>
            Permanently delete <strong>{client.name}</strong> and all associated data? This cannot be undone.
          </p>
        </Modal>
      )}

      {taskOpen && (
        <Modal title="New Follow-up" onClose={() => setTaskOpen(false)} onSave={saveTask} saveLabel="Add Follow-up">
          <FormRow label="Follow-up">
            <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title:e.target.value }))}
              style={inputStyle} placeholder="Book renewal call" />
          </FormRow>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            <FormRow label="Due Date">
              <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate:e.target.value }))}
                style={inputStyle} />
            </FormRow>
            <FormRow label="Priority">
              <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority:e.target.value }))}
                style={selectStyle}>
                {TASK_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
              </select>
            </FormRow>
          </div>
          <FormRow label="Notes">
            <textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes:e.target.value }))}
              style={{ ...inputStyle, minHeight:80, resize:"vertical" }} placeholder="Context or next step..." />
          </FormRow>
        </Modal>
      )}
    </div>
  );
}
