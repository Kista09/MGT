import { useState } from "react";
import { C, font, STAGE_CONFIG } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import { fmt$ } from "../utils";

const DEFAULT_STAGE = Object.keys(STAGE_CONFIG)[0];
const BLANK_DEAL = { company:"", contact:"", value:"", closeDate:"", notes:"", probability:STAGE_CONFIG[DEFAULT_STAGE].probability };

function validate(f) {
  const e = {};
  if (!f.company.trim()) e.company = "Required";
  if (!f.contact.trim()) e.contact = "Required";
  if (!f.value || isNaN(Number(f.value)) || Number(f.value) <= 0) e.value = "Valid amount required";
  if (!f.closeDate) e.closeDate = "Required";
  return e;
}

function DealForm({ form, setForm, errors, stage, setStage }) {
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        <div style={{ gridColumn:"1/-1" }}>
          <FormRow label="Company" error={errors.company}>
            <input value={form.company} onChange={set("company")} style={{ ...inputStyle, borderColor: errors.company ? C.red : C.border }} placeholder="Acme Corp" />
          </FormRow>
        </div>
        <FormRow label="Contact Name" error={errors.contact}>
          <input value={form.contact} onChange={set("contact")} style={{ ...inputStyle, borderColor: errors.contact ? C.red : C.border }} placeholder="Jane Doe" />
        </FormRow>
        <FormRow label="Value (R/month)" error={errors.value}>
          <input value={form.value} onChange={set("value")} style={{ ...inputStyle, borderColor: errors.value ? C.red : C.border }} type="number" min="0" placeholder="5000" />
        </FormRow>
        <FormRow label="Stage">
          <select value={stage} onChange={e => setStage(e.target.value)} style={selectStyle}>
            {Object.keys(STAGE_CONFIG).map(s => <option key={s}>{s}</option>)}
          </select>
        </FormRow>
        <FormRow label="Target Close Date" error={errors.closeDate}>
          <input value={form.closeDate} onChange={set("closeDate")} style={{ ...inputStyle, borderColor: errors.closeDate ? C.red : C.border }} type="date" />
        </FormRow>
      </div>
      <FormRow label="Notes">
        <textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, resize:"vertical", minHeight:72 }} placeholder="Any relevant context…" />
      </FormRow>
    </div>
  );
}

export default function Pipeline() {
  const { state, dispatch, toast } = useApp();
  const { pipeline } = state;

  const [dragging,  setDragging]  = useState(null);
  const [dragOver,  setDragOver]  = useState(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [addStage,  setAddStage]  = useState(DEFAULT_STAGE);
  const [editDeal,  setEditDeal]  = useState(null);
  const [editStage, setEditStage] = useState(DEFAULT_STAGE);
  const [delDeal,   setDelDeal]   = useState(null);
  const [form,      setForm]      = useState(BLANK_DEAL);
  const [errors,    setErrors]    = useState({});

  const stageEntries = Object.entries(STAGE_CONFIG);
  const phaseSummary = stageEntries.reduce((acc, [stage, cfg]) => {
    const deals = pipeline[stage] ?? [];
    const current = acc[cfg.phase] ?? { count: 0, weighted: 0 };
    acc[cfg.phase] = {
      count: current.count + deals.length,
      weighted: current.weighted + deals.reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0),
    };
    return acc;
  }, {});
  const allDeals   = stageEntries.flatMap(([stage]) => pipeline[stage] ?? []);
  const totalValue = allDeals.reduce((a, d) => a + d.value, 0);
  const weightedValue = allDeals.reduce((a, d) => a + d.value * (d.probability / 100), 0);

  const moveCard = (deal, fromStage, toStage) => {
    dispatch({ type:"MOVE_DEAL", deal, fromStage, toStage });
  };

  const openAdd = (stage = DEFAULT_STAGE) => {
    setForm(BLANK_DEAL); setErrors({}); setAddStage(stage); setAddOpen(true);
  };

  const openEdit = (deal, stage) => {
    setForm({ ...deal, value: String(deal.value) }); setErrors({}); setEditDeal(deal); setEditStage(stage);
  };

  const saveAdd = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({
      type: "ADD_DEAL", stage: addStage,
      deal: { ...form, value: Number(form.value), age: 0, probability: STAGE_CONFIG[addStage].probability },
    });
    toast(`Deal added — ${form.company}`, "💼");
    setAddOpen(false);
  };

  const saveEdit = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    if (editStage !== findDealStage(editDeal.id)) {
      dispatch({ type:"MOVE_DEAL", deal: editDeal, fromStage: findDealStage(editDeal.id), toStage: editStage });
    }
    dispatch({ type:"UPDATE_DEAL", deal: { ...editDeal, ...form, value: Number(form.value), probability: STAGE_CONFIG[editStage].probability } });
    toast(`Deal updated — ${form.company}`, "✏️");
    setEditDeal(null);
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_DEAL", id: delDeal.id });
    toast(`Deal removed`, "🗑️", "warning");
    setDelDeal(null);
  };

  const findDealStage = (id) => {
    for (const [stage, deals] of Object.entries(pipeline)) {
      if (deals.find(d => d.id === id)) return stage;
    }
    return DEFAULT_STAGE;
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Mandate Pipeline</div>
          <div style={{ color:C.muted, fontSize:14 }}>
            {allDeals.length} deals · Pipeline:{" "}
            <span style={{ color:C.accent, fontFamily:font.mono }}>{fmt$(totalValue)}/mo</span>
            {" "}· Weighted:{" "}
            <span style={{ color:C.blue, fontFamily:font.mono }}>{fmt$(Math.round(weightedValue))}/mo</span>
          </div>
        </div>
        <button onClick={() => openAdd()}
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
            padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Add Mandate</button>
      </div>

      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:12, marginBottom:8 }}>
        {Object.entries(phaseSummary).map(([phase, summary]) => (
          <div key={phase} style={{ flex:"0 0 auto", background:C.card, border:`1px solid ${C.border}`,
            borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:14 }}>
            <div>
              <div style={{ color:C.text, fontSize:12, fontWeight:800 }}>{phase}</div>
              <div style={{ color:C.muted, fontSize:10 }}>{summary.count} mandates</div>
            </div>
            <div style={{ fontFamily:font.mono, fontSize:12, color:C.accent, fontWeight:800 }}>
              {fmt$(Math.round(summary.weighted))} wtd
            </div>
          </div>
        ))}
      </div>

      {/* kanban */}
      <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:8, minHeight:500 }}>
        {stageEntries.map(([stage, cfg]) => {
          const deals = pipeline[stage] ?? [];
          const stageVal = deals.reduce((a, d) => a + d.value, 0);
          const wVal     = deals.reduce((a, d) => a + d.value * (d.probability / 100), 0);
          return (
            <div key={stage}
              style={{ flex:"0 0 260px", background:C.card, border:`1px solid ${C.border}`,
                borderRadius:12, overflow:"hidden",
                outline: dragOver === stage ? `2px solid ${cfg.color}` : "none",
                transition:"outline .1s" }}
              onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); setDragOver(null); if (dragging) moveCard(dragging.card, dragging.from, stage); setDragging(null); }}>

              {/* column header */}
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:99, background:cfg.color }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{stage}</span>
              <span style={{ background:C.subtle, borderRadius:99, padding:"1px 8px", fontSize:11, color:C.muted }}>{deals.length}</span>
              <span style={{ background:cfg.bg, borderRadius:99, padding:"1px 7px", fontSize:10, color:cfg.color }}>{cfg.probability}%</span>
                  </div>
                  <button onClick={() => openAdd(stage)}
                    style={{ background:"transparent", border:"none", cursor:"pointer",
                      color:C.muted, fontSize:18, lineHeight:1, padding:"0 2px" }}>+</button>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <span style={{ fontFamily:font.mono, fontSize:11, color:C.muted }}>{fmt$(stageVal)}</span>
                  <span style={{ fontFamily:font.mono, fontSize:11, color:cfg.color }}>~{fmt$(Math.round(wVal))} wtd</span>
                </div>
              </div>

              {/* cards */}
              <div style={{ padding:12, display:"flex", flexDirection:"column", gap:10 }}>
                {deals.map(deal => (
                  <div key={deal.id} draggable
                    onDragStart={() => setDragging({ card: deal, from: stage })}
                    onDragEnd={() => setDragging(null)}
                    style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
                      padding:14, cursor:"grab", transition:"transform .1s, box-shadow .1s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px #00000060"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{deal.company}</div>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>{deal.contact}</div>

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontFamily:font.mono, fontSize:13, color:cfg.color, fontWeight:700 }}>{fmt$(deal.value)}/mo</span>
                      {deal.age > 0 && <span style={{ fontSize:10, color:C.muted, background:C.subtle, borderRadius:6, padding:"2px 7px" }}>{deal.age}d</span>}
                    </div>

                    {/* probability bar */}
                    <div style={{ background:C.card, borderRadius:99, height:3, marginBottom:8 }}>
                      <div style={{ width:`${deal.probability}%`, background:cfg.color, borderRadius:99, height:"100%" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:10, color:C.muted }}>{deal.probability}% probability</span>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={() => openEdit(deal, stage)}
                          style={{ background:C.subtle, border:"none", borderRadius:5, padding:"3px 8px",
                            fontSize:10, cursor:"pointer", color:C.muted }}>Edit</button>
                        <button onClick={() => setDelDeal(deal)}
                          style={{ background:C.redBg, border:"none", borderRadius:5, padding:"3px 8px",
                            fontSize:10, cursor:"pointer", color:C.red }}>Del</button>
                      </div>
                    </div>
                    {deal.closeDate && (
                      <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>Close: {deal.closeDate}</div>
                    )}
                  </div>
                ))}
                {deals.length === 0 && (
                  <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:12,
                    border:`1px dashed ${C.border}`, borderRadius:10, cursor:"pointer" }}
                    onClick={() => openAdd(stage)}>Drop here or + add</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal title="New Mandate" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Add Mandate">
          <DealForm form={form} setForm={setForm} errors={errors} stage={addStage} setStage={setAddStage} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editDeal && (
        <Modal title={`Edit — ${editDeal.company}`} onClose={() => setEditDeal(null)} onSave={saveEdit}>
          <DealForm form={form} setForm={setForm} errors={errors} stage={editStage} setStage={setEditStage} />
        </Modal>
      )}

      {/* Delete Confirm */}
      {delDeal && (
        <Modal title="Delete Mandate" onClose={() => setDelDeal(null)} onSave={confirmDelete} saveLabel="Delete" danger>
          <p style={{ color:C.text, margin:0 }}>Delete mandate with <strong>{delDeal.company}</strong>?</p>
        </Modal>
      )}
    </div>
  );
}
