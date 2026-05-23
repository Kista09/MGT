import { useState, useMemo } from "react";
import { C, font, pill, statusPill, PLAN_COLORS, PLANS, STATUSES, INDUSTRIES } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { clientHealthScore, healthColor, exportCSV, fmt$, formatJoined } from "../utils";

const JURISDICTIONS = ["South Africa", "Western Cape", "Gauteng", "KwaZulu-Natal", "Eastern Cape", "Free State", "Mpumalanga", "Limpopo", "North West", "Northern Cape", "Other"];
const RELATIONSHIP_TIERS = ["Strategic", "Institutional", "Priority", "Emerging"];
const MANDATE_TYPES = ["Discretionary", "Advisory", "Execution-only", "Capital Raise", "Strategic Advisory"];
const RISK_RATINGS = ["Low", "Medium", "High", "Restricted"];
const COMPLIANCE_STATUSES = ["KYC Pending", "KYC Approved", "EDD Required", "Rejected"];
const ACCREDITATION_STATUSES = ["Verified", "Pending", "Not Required"];
const SOURCE_OF_FUNDS = ["Operating Business", "Investment Proceeds", "Family Office", "Asset Sale", "Inheritance", "Other"];

const BLANK = {
  name:"",
  legalName:"",
  registrationNumber:"",
  jurisdiction:"South Africa",
  contact:"",
  title:"",
  email:"",
  phone:"",
  website:"",
  plan:"Growth",
  status:"Active",
  mrr:"",
  tag:"Fintech",
  relationshipOwner:"Admin",
  relationshipTier:"Institutional",
  mandateType:"Advisory",
  estimatedAum:"",
  expectedAnnualFee:"",
  riskRating:"Medium",
  complianceStatus:"KYC Pending",
  accreditationStatus:"Pending",
  sourceOfFunds:"Operating Business",
  nextReviewDate:"",
  onboardingNotes:"",
};

function SectionTitle({ children }) {
  return (
    <div style={{ gridColumn:"1/-1", margin:"8px 0 14px", paddingBottom:8,
      borderBottom:`1px solid ${C.border}`, color:C.accent, fontSize:11,
      fontWeight:800, letterSpacing:.8, textTransform:"uppercase" }}>
      {children}
    </div>
  );
}

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Required";
  if (!f.legalName.trim()) e.legalName = "Required for onboarding";
  if (!f.registrationNumber.trim()) e.registrationNumber = "Required";
  if (!f.contact.trim()) e.contact = "Required";
  if (!f.title.trim()) e.title = "Required";
  if (!f.email.includes("@")) e.email = "Valid email required";
  if (f.status === "Active" && (!f.mrr || isNaN(Number(f.mrr)))) e.mrr = "Required for active clients";
  if (!f.estimatedAum || isNaN(Number(f.estimatedAum)) || Number(f.estimatedAum) < 0) e.estimatedAum = "Valid AUM required";
  if (!f.expectedAnnualFee || isNaN(Number(f.expectedAnnualFee)) || Number(f.expectedAnnualFee) < 0) e.expectedAnnualFee = "Valid annual fee required";
  if (!f.nextReviewDate) e.nextReviewDate = "Required";
  if (f.riskRating === "High" && f.complianceStatus !== "EDD Required") e.complianceStatus = "High risk requires EDD";
  return e;
}

function ClientForm({ form, setForm, errors }) {
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <SectionTitle>Entity & Relationship</SectionTitle>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Relationship Name" error={errors.name}>
          <input value={form.name ?? ""} onChange={set("name")} style={{ ...inputStyle, borderColor: errors.name ? C.red : C.border }} placeholder="Acme Family Office" />
        </FormRow>
      </div>
      <FormRow label="Legal Entity Name" error={errors.legalName}>
        <input value={form.legalName ?? ""} onChange={set("legalName")} style={{ ...inputStyle, borderColor: errors.legalName ? C.red : C.border }} placeholder="Acme Holdings (Pty) Ltd" />
      </FormRow>
      <FormRow label="Registration / Tax ID" error={errors.registrationNumber}>
        <input value={form.registrationNumber ?? ""} onChange={set("registrationNumber")} style={{ ...inputStyle, borderColor: errors.registrationNumber ? C.red : C.border }} placeholder="2024/000000/07" />
      </FormRow>
      <FormRow label="Jurisdiction">
        <select value={form.jurisdiction ?? "South Africa"} onChange={set("jurisdiction")} style={selectStyle}>
          {JURISDICTIONS.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Relationship Tier">
        <select value={form.relationshipTier ?? "Institutional"} onChange={set("relationshipTier")} style={selectStyle}>
          {RELATIONSHIP_TIERS.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>

      <SectionTitle>Authorized Contact</SectionTitle>
      <FormRow label="Contact Name" error={errors.contact}>
        <input value={form.contact ?? ""} onChange={set("contact")} style={{ ...inputStyle, borderColor: errors.contact ? C.red : C.border }} placeholder="Jane Doe" />
      </FormRow>
      <FormRow label="Title / Authority" error={errors.title}>
        <input value={form.title ?? ""} onChange={set("title")} style={{ ...inputStyle, borderColor: errors.title ? C.red : C.border }} placeholder="CFO / Trustee / CIO" />
      </FormRow>
      <FormRow label="Email" error={errors.email}>
        <input value={form.email ?? ""} onChange={set("email")} style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }} placeholder="jane@company.com" />
      </FormRow>
      <FormRow label="Phone">
        <input value={form.phone ?? ""} onChange={set("phone")} style={inputStyle} placeholder="+27 82 000 0000" />
      </FormRow>
      <FormRow label="Website">
        <input value={form.website ?? ""} onChange={set("website")} style={inputStyle} placeholder="company.com" />
      </FormRow>
      <FormRow label="Relationship Owner">
        <input value={form.relationshipOwner ?? ""} onChange={set("relationshipOwner")} style={inputStyle} placeholder="Managing Partner" />
      </FormRow>

      <SectionTitle>Commercial Mandate</SectionTitle>
      <FormRow label="Service Plan">
        <select value={form.plan ?? "Growth"} onChange={set("plan")} style={selectStyle}>
          {PLANS.map(p => <option key={p}>{p}</option>)}
        </select>
      </FormRow>
      <FormRow label="Status">
        <select value={form.status ?? "Active"} onChange={set("status")} style={selectStyle}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </FormRow>
      <FormRow label="Mandate Type">
        <select value={form.mandateType ?? "Advisory"} onChange={set("mandateType")} style={selectStyle}>
          {MANDATE_TYPES.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Industry / Sector">
        <select value={form.tag ?? "Fintech"} onChange={set("tag")} style={selectStyle}>
          {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
        </select>
      </FormRow>
      <FormRow label="MRR (R/month)" error={errors.mrr}>
        <input value={form.mrr ?? ""} onChange={set("mrr")} style={{ ...inputStyle, borderColor: errors.mrr ? C.red : C.border }} placeholder="0" type="number" min="0" />
      </FormRow>
      <FormRow label="Expected Annual Fee (R)" error={errors.expectedAnnualFee}>
        <input value={form.expectedAnnualFee ?? ""} onChange={set("expectedAnnualFee")} style={{ ...inputStyle, borderColor: errors.expectedAnnualFee ? C.red : C.border }} placeholder="250000" type="number" min="0" />
      </FormRow>
      <FormRow label="Estimated AUM / Exposure (R)" error={errors.estimatedAum}>
        <input value={form.estimatedAum ?? ""} onChange={set("estimatedAum")} style={{ ...inputStyle, borderColor: errors.estimatedAum ? C.red : C.border }} placeholder="5000000" type="number" min="0" />
      </FormRow>
      <FormRow label="Next Review Date" error={errors.nextReviewDate}>
        <input value={form.nextReviewDate ?? ""} onChange={set("nextReviewDate")} style={{ ...inputStyle, borderColor: errors.nextReviewDate ? C.red : C.border }} type="date" />
      </FormRow>

      <SectionTitle>Compliance & Suitability</SectionTitle>
      <FormRow label="Risk Rating">
        <select value={form.riskRating ?? "Medium"} onChange={set("riskRating")} style={selectStyle}>
          {RISK_RATINGS.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="KYC / AML Status" error={errors.complianceStatus}>
        <select value={form.complianceStatus ?? "KYC Pending"} onChange={set("complianceStatus")} style={{ ...selectStyle, borderColor: errors.complianceStatus ? C.red : C.border }}>
          {COMPLIANCE_STATUSES.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Accreditation">
        <select value={form.accreditationStatus ?? "Pending"} onChange={set("accreditationStatus")} style={selectStyle}>
          {ACCREDITATION_STATUSES.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Source of Funds">
        <select value={form.sourceOfFunds ?? "Operating Business"} onChange={set("sourceOfFunds")} style={selectStyle}>
          {SOURCE_OF_FUNDS.map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Onboarding Notes">
          <textarea value={form.onboardingNotes ?? ""} onChange={set("onboardingNotes")} style={{ ...inputStyle, minHeight:88, resize:"vertical" }} placeholder="Investment objectives, restrictions, beneficial ownership notes, documents still required..." />
        </FormRow>
      </div>
    </div>
  );
}

export default function Clients() {
  const { state, dispatch, navigate, toast } = useApp();
  const { clients, bots } = state;

  const [search, setSearch]     = useState("");
  const [segment, setSegment]   = useState("All");
  const [filter, setFilter]     = useState("All");
  const [sortKey, setSortKey]   = useState("name");
  const [sortAsc, setSortAsc]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [delClient, setDelClient]   = useState(null);
  const [form, setForm]   = useState(BLANK);
  const [errors, setErrors] = useState({});

  const filtered = useMemo(() => {
    let list = clients.filter(c =>
      (filter === "All" || c.status === filter) &&
      (segment === "All" ||
       c.relationshipTier === segment ||
       c.complianceStatus === segment ||
       c.riskRating === segment) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
       c.contact.toLowerCase().includes(search.toLowerCase()) ||
       c.email.toLowerCase().includes(search.toLowerCase()))
    );
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [clients, search, segment, filter, sortKey, sortAsc]);

  const relationshipTabs = useMemo(() => {
    const count = (predicate) => clients.filter(predicate).length;
    return [
      { id:"All", label:"All", count:clients.length },
      { id:"Strategic", label:"Strategic", count:count(c => c.relationshipTier === "Strategic") },
      { id:"Institutional", label:"Institutional", count:count(c => c.relationshipTier === "Institutional" || !c.relationshipTier) },
      { id:"Priority", label:"Priority", count:count(c => c.relationshipTier === "Priority") },
      { id:"Emerging", label:"Emerging", count:count(c => c.relationshipTier === "Emerging") },
      { id:"KYC Pending", label:"KYC Pending", count:count(c => c.complianceStatus === "KYC Pending" || !c.complianceStatus) },
      { id:"EDD Required", label:"EDD", count:count(c => c.complianceStatus === "EDD Required") },
      { id:"High", label:"High Risk", count:count(c => c.riskRating === "High") },
    ];
  }, [clients]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortIcon = (key) => sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  const normalizeClientForm = (f) => ({
    ...f,
    mrr: Number(f.mrr) || 0,
    estimatedAum: Number(f.estimatedAum) || 0,
    expectedAnnualFee: Number(f.expectedAnnualFee) || 0,
    joined: f.joined ?? new Date().toISOString().slice(0, 7),
  });

  const openAdd  = () => { setForm({ ...BLANK, relationshipOwner: state.user.name }); setErrors({}); setAddOpen(true); };
  const openEdit = (c) => {
    setForm({
      ...BLANK,
      ...c,
      mrr: String(c.mrr ?? ""),
      estimatedAum: String(c.estimatedAum ?? ""),
      expectedAnnualFee: String(c.expectedAnnualFee ?? ""),
    });
    setErrors({});
    setEditClient(c);
  };

  const saveAdd = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({ type:"ADD_CLIENT", client: normalizeClientForm(form) });
    toast(`${form.name} added`, "👤");
    setAddOpen(false);
  };

  const saveEdit = () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({ type:"UPDATE_CLIENT", client: { ...editClient, ...normalizeClientForm(form) } });
    toast(`${form.name} updated`, "✏️");
    setEditClient(null);
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_CLIENT", id: delClient.id });
    toast(`${delClient.name} removed`, "🗑️", "warning");
    setDelClient(null);
  };

  const handleExport = () => {
    exportCSV(filtered, [
      { key:"name",    label:"Company"  },
      { key:"contact", label:"Contact"  },
      { key:"email",   label:"Email"    },
      { key:"phone",   label:"Phone"    },
      { key:"plan",    label:"Plan"     },
      { key:"status",  label:"Status"   },
      { key:"mrr",     label:"MRR"      },
      { key:"tag",     label:"Industry" },
      { key:"joined",  label:"Joined"   },
      { key:"legalName", label:"Legal Entity" },
      { key:"jurisdiction", label:"Jurisdiction" },
      { key:"relationshipTier", label:"Relationship Tier" },
      { key:"mandateType", label:"Mandate Type" },
      { key:"estimatedAum", label:"Estimated AUM" },
      { key:"expectedAnnualFee", label:"Expected Annual Fee" },
      { key:"riskRating", label:"Risk Rating" },
      { key:"complianceStatus", label:"KYC AML Status" },
      { key:"accreditationStatus", label:"Accreditation" },
    ], "clients.csv");
    toast("CSV exported", "📥");
  };

  const thStyle = { padding:"12px 16px", textAlign:"left", fontSize:11, color:C.muted,
    fontWeight:600, letterSpacing:.5, textTransform:"uppercase", cursor:"pointer",
    userSelect:"none", whiteSpace:"nowrap" };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Relationships</div>
          <div style={{ color:C.muted, fontSize:14 }}>
            {clients.length} total · {clients.filter(c => c.status === "Active").length} active
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleExport}
            style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.muted,
              borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>↓ Export CSV</button>
          <button onClick={openAdd}
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
              padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ New Relationship</button>
        </div>
      </div>

      <SegmentTabs tabs={relationshipTabs} value={segment} onChange={setSegment} />

      {/* filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input placeholder="Search name, contact, email…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, padding:"8px 14px", fontSize:13, outline:"none",
            flex:"1 1 220px", maxWidth:300 }}/>
        {["All","Active","Trial","Churned"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? C.accentBg : C.card,
              border:`1px solid ${filter === f ? C.accent : C.border}`,
              color: filter === f ? C.accent : C.muted,
              borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:500 }}>{f}</button>
        ))}
      </div>

      {/* table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {[
                { k:"name",    l:"Company"  },
                { k:"contact", l:"Contact"  },
                { k:"plan",    l:"Plan"     },
                { k:null,      l:"Health"   },
                { k:"status",  l:"Status"   },
                { k:"mrr",     l:"MRR"      },
                { k:"tag",     l:"Industry" },
                { k:null,      l:""         },
              ].map(h => (
                <th key={h.l} onClick={() => h.k && toggleSort(h.k)}
                  style={{ ...thStyle, cursor: h.k ? "pointer" : "default" }}>
                  {h.l}{h.k ? sortIcon(h.k) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const health = clientHealthScore(c, bots);
              const pc = PLAN_COLORS[c.plan] ?? { color:C.muted, bg:C.subtle };
              return (
                <tr key={c.id}
                  style={{ borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : "none",
                    transition:"background .12s", cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                  onClick={() => navigate("client-detail", c.id)}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{c.email}</div>
                  </td>
                  <td style={{ padding:"14px 16px", fontSize:13, color:C.muted }}>{c.contact}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ ...pill(pc.color, pc.bg) }}>{c.plan}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:48, background:C.surface, borderRadius:99, height:5 }}>
                        <div style={{ width:`${health}%`, background:healthColor(health),
                          borderRadius:99, height:"100%", transition:"width .8s ease" }}/>
                      </div>
                      <span style={{ fontFamily:font.mono, fontSize:11, color:healthColor(health) }}>{health}</span>
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}><span style={statusPill(c.status)}>{c.status}</span></td>
                  <td style={{ padding:"14px 16px", fontFamily:font.mono, fontSize:13,
                    color: c.mrr > 0 ? C.accent : C.muted, fontWeight:700 }}>{fmt$(c.mrr)}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ fontSize:11, color:C.muted, background:C.subtle, borderRadius:6, padding:"2px 8px" }}>{c.tag}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => openEdit(c)}
                        style={{ background:C.subtle, border:"none", borderRadius:6, padding:"4px 10px",
                          fontSize:11, cursor:"pointer", color:C.muted, fontWeight:600 }}>Edit</button>
                      <button onClick={() => setDelClient(c)}
                        style={{ background:C.redBg, border:"none", borderRadius:6, padding:"4px 10px",
                          fontSize:11, cursor:"pointer", color:C.red, fontWeight:600 }}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:14 }}>No clients match your filters.</div>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal title="Institutional Relationship Intake" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Approve Intake" size="lg">
          <ClientForm form={form} setForm={setForm} errors={errors} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editClient && (
        <Modal title={`Edit — ${editClient.name}`} onClose={() => setEditClient(null)} onSave={saveEdit}>
          <ClientForm form={form} setForm={setForm} errors={errors} />
        </Modal>
      )}

      {/* Delete Confirm */}
      {delClient && (
        <Modal title="Delete Client" onClose={() => setDelClient(null)} onSave={confirmDelete}
          saveLabel="Delete" danger>
          <p style={{ color:C.text, margin:0 }}>
            Permanently delete <strong>{delClient.name}</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
