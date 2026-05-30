import { useMemo, useState } from "react";
import { C, font, CONSULTANT_ROLES, INDUSTRIES } from "../constants";
import { useApp } from "../context";
import { inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { generateId } from "../utils";

const STATUS_COLORS = {
  New:        { color: C.muted,   bg: C.subtle   },
  "In Progress": { color: C.accent, bg: C.accentBg },
  Approved:   { color: C.success, bg: C.successBg },
  Resolved:   { color: C.success, bg: C.successBg },
  Closed:     { color: C.muted,   bg: C.subtle   },
  Qualified:  { color: C.blue,    bg: C.blueBg   },
  Verified:   { color: C.success, bg: C.successBg },
  Rejected:   { color: C.red,     bg: C.redBg    },
  Critical:   { color: "#fff",    bg: C.red       },
};

const statusPill = (s = "New") => {
  const t = STATUS_COLORS[s] || { color: C.muted, bg: C.subtle };
  return (
    <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:99, fontSize:11,
      fontWeight:700, color:t.color, background:t.bg, whiteSpace:"nowrap" }}>{s}</span>
  );
};

/* ─── SUBMISSIONS PANEL ────────────────────────────────────── */
function SubmissionsPanel({ requests, title = "Submissions", statusOptions }) {
  const { dispatch, navigate } = useApp();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = useMemo(() => requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${r.subject} ${r.company} ${r.email} ${r.owner}`.toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [requests, search, filterStatus]);

  const updateStatus = (request, status) => {
    dispatch({ type: "UPDATE_SERVICE_REQUEST", request: { ...request, status } });
  };

  if (requests.length === 0) return (
    <div style={{ textAlign:"center", padding:"32px 0", color:C.muted, fontSize:13 }}>
      No submissions yet — use the form above to create one.
    </div>
  );

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:14, paddingTop:24, borderTop:`1px solid ${C.border}`, gap:12, flexWrap:"wrap" }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{title} <span style={{ color:C.muted, fontWeight:400 }}>({filtered.length})</span></div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…" style={{ ...inputStyle, width:180, padding:"6px 10px", fontSize:12 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ ...selectStyle, fontSize:12, padding:"6px 10px" }}>
            <option value="All">All statuses</option>
            {(statusOptions || ["New","In Progress","Resolved","Closed"]).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:1,
        border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
        {filtered.slice(0, 30).map((r, i) => (
          <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1fr 140px 120px 120px",
            gap:12, padding:"11px 14px", background: i % 2 === 0 ? C.card : C.cream,
            alignItems:"center", fontSize:13 }}>
            <div>
              <div style={{ fontWeight:600, color:C.text, marginBottom:2,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {r.subject}
              </div>
              <div style={{ fontSize:11, color:C.muted }}>
                {r.company || r.email || "—"} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-ZA") : "—"} · {r.owner || "Unassigned"}
              </div>
            </div>
            {statusPill(r.status)}
            <select value={r.status} onChange={e => updateStatus(r, e.target.value)}
              style={{ ...selectStyle, fontSize:11, padding:"4px 6px" }}>
              {(statusOptions || ["New","In Progress","Resolved","Closed"]).map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => navigate("requests")}
              style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`, color:C.accent,
                borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              View SR →
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding:18, color:C.muted, fontSize:13, textAlign:"center" }}>
            No results match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CLIENT SUBMISSIONS LIST ──────────────────────────────── */
function ClientSubmissionsList() {
  const { state, navigate } = useApp();
  const clients = useMemo(() =>
    state.clients.filter(c => c.source === "Internal Intake"),
  [state.clients]);

  if (clients.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:14, paddingTop:24, borderTop:`1px solid ${C.border}` }}>
        Clients from Intake <span style={{ color:C.muted, fontWeight:400 }}>({clients.length})</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:1,
        border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
        {clients.map((c, i) => (
          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 100px",
            gap:12, padding:"11px 14px", background: i % 2 === 0 ? C.card : C.cream,
            alignItems:"center", fontSize:13 }}>
            <div>
              <div style={{ fontWeight:600, color:C.text }}>{c.name}</div>
              <div style={{ fontSize:11, color:C.muted }}>{c.contact} · {c.email} · {c.tag || "—"}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{c.plan}</span>
            {statusPill(c.status)}
            <button onClick={() => navigate("client-detail", c.id)}
              style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`, color:C.accent,
                borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              Open →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTORS = [
  "Retail","Grocery","Sports","E-Commerce","Financial Services","Logistics",
  "Transport","Banking","Healthcare","SaaS","Hospitality","Legal","Education","Other",
];
const COUNTRIES = ["South Africa","Botswana","Namibia","Zimbabwe","Kenya","Nigeria","United Kingdom","United States"];
const ID_TYPES  = ["SA National ID","Passport","Driver's Licence","Company Registration No.","Trust Deed No."];
const BOT_TYPES = ["WhatsApp Automation","Booking Workflow","Client Portal","Analytics Dashboard","CRM Integration","Custom Solution"];
const RISK_LEVELS = ["Low","Medium","High","Very High"];
const INCIDENT_TYPES = ["Bot Outage","API Failure","Data Issue","Security Alert","Billing Error","Integration Failure","Other"];

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: C.muted, letterSpacing: .5, textTransform: "uppercase", marginBottom: 6,
};
const fieldStyle = { marginBottom: 18 };

function Field({ label, required, children }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}{required && <span style={{ color: C.accent }}> *</span>}</label>
      {children}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "0 20px" }}>
      {children}
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: .8,
      textTransform: "uppercase", marginBottom: 16, paddingBottom: 10,
      borderBottom: `1px solid ${C.border}` }}>
      {title}
    </div>
  );
}

function SubmitBtn({ onClick, disabled, label = "Submit →" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? C.subtle : C.accent, color: disabled ? C.muted : "#000",
        border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13,
        fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", marginTop: 8 }}>
      {label}
    </button>
  );
}

function ClearBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted,
        borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700,
        cursor: "pointer", marginTop: 8, marginRight: 10 }}>
      Clear
    </button>
  );
}

function SuccessBanner({ message, onClose }) {
  return (
    <div style={{ background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 10,
      padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 700, color: C.success, fontSize: 14 }}>Submitted successfully</div>
        <div style={{ fontSize: 12, color: C.teal, marginTop: 2 }}>{message}</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16 }}>✕</button>
    </div>
  );
}

/* ─── CLIENT INTAKE FORM ───────────────────────────────────── */
function ClientIntake() {
  const { state, dispatch, toast, navigate } = useApp();
  const intakeSRs = useMemo(() =>
    (state.serviceRequests ?? []).filter(r => r.category === "Onboarding" && r.channel === "Internal")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [state.serviceRequests]);
  const blank = { company:"", contact:"", email:"", phone:"", sector:"", country:"South Africa",
    website:"", referral:"", plan:"Growth", notes:"", consultant:"" };
  const [form, setForm] = useState(blank);
  const [success, setSuccess] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!form.company.trim() || !form.contact.trim() || !form.email.trim()) {
      toast("Company, contact name and email are required", "!", "warning"); return;
    }
    const id = generateId();
    const client = {
      id, name: form.company, contact: form.contact, email: form.email, phone: form.phone,
      tag: form.sector, country: form.country, website: form.website,
      plan: form.plan, status: "Trial", mrr: 0,
      joined: new Date().toISOString().slice(0, 10),
      notes: form.notes, owner: form.consultant || state.user.name,
      source: "Internal Intake",
    };
    dispatch({ type: "ADD_CLIENT", client });
    const srId = `MGT-SR-0000-${generateId().toUpperCase().slice(-8)}`;
    dispatch({ type: "ADD_SERVICE_REQUEST", request: {
      id: srId, requestNumber: srId,
      subject: `New client intake: ${form.company}`,
      category: "Onboarding", priority: "High", status: "New",
      company: form.company, requester: form.contact, email: form.email,
      description: `New client intake submitted via Internal Forms.\n\nCompany: ${form.company}\nContact: ${form.contact}\nEmail: ${form.email}\nPhone: ${form.phone || "—"}\nSector: ${form.sector || "—"}\nCountry: ${form.country}\nWebsite: ${form.website || "—"}\nPlan: ${form.plan}\nReferral: ${form.referral || "—"}\nNotes: ${form.notes || "—"}`,
      owner: form.consultant || state.user.name, channel: "Internal",
      createdAt: new Date().toISOString(),
    }});
    setSuccess(`Client record created for ${form.company}. Onboarding request logged.`);
    setForm(blank);
  };

  return (
    <div>
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}
      <SectionHead title="Company & Contact" />
      <Grid cols={2}>
        <Field label="Company Name" required><input style={inputStyle} value={form.company} onChange={set("company")} placeholder="e.g. Meridian Holdings" /></Field>
        <Field label="Primary Contact" required><input style={inputStyle} value={form.contact} onChange={set("contact")} placeholder="Full name" /></Field>
        <Field label="Email Address" required><input style={inputStyle} type="email" value={form.email} onChange={set("email")} placeholder="contact@company.co.za" /></Field>
        <Field label="Phone Number"><input style={inputStyle} type="tel" value={form.phone} onChange={set("phone")} placeholder="+27 82 000 0000" /></Field>
        <Field label="Industry / Sector">
          <select style={selectStyle} value={form.sector} onChange={set("sector")}>
            <option value="">Select…</option>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Country">
          <select style={selectStyle} value={form.country} onChange={set("country")}>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Website"><input style={inputStyle} value={form.website} onChange={set("website")} placeholder="https://company.co.za" /></Field>
        <Field label="Referral / Source"><input style={inputStyle} value={form.referral} onChange={set("referral")} placeholder="e.g. LinkedIn, referral from…" /></Field>
      </Grid>
      <SectionHead title="Service Interest" />
      <Grid cols={2}>
        <Field label="Proposed Plan">
          <select style={selectStyle} value={form.plan} onChange={set("plan")}>
            {["Starter","Growth","Scale","Enterprise","Custom"].map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Assigned Consultant">
          <select style={selectStyle} value={form.consultant} onChange={set("consultant")}>
            <option value="">Assign to…</option>
            {(state.consultants ?? []).map(c => <option key={c.id}>{c.name}</option>)}
            <option value={state.user.name}>{state.user.name} (me)</option>
          </select>
        </Field>
      </Grid>
      <Field label="Notes & Context">
        <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes} onChange={set("notes")} placeholder="Initial conversation notes, specific needs, pain points…" />
      </Field>
      <div style={{ display: "flex" }}>
        <ClearBtn onClick={() => setForm(blank)} />
        <SubmitBtn onClick={submit} label="Create Client & Log Intake →" />
      </div>
      <ClientSubmissionsList />
      <SubmissionsPanel
        requests={intakeSRs}
        title="Intake Requests"
        statusOptions={["New","Qualified","Approved","In Setup","Live","Closed"]}
      />
    </div>
  );
}

/* ─── KYC / FICA FORM ──────────────────────────────────────── */
function KycForm() {
  const { state, dispatch, toast } = useApp();
  const kycSRs = useMemo(() =>
    (state.serviceRequests ?? []).filter(r => r.category === "Compliance" && r.channel === "Internal")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [state.serviceRequests]);
  const blank = { company:"", contact:"", email:"", idType:"SA National ID", idNumber:"",
    taxNumber:"", sourceOfFunds:"", riskLevel:"Low", pepStatus:"No", notes:"", consultant:"" };
  const [form, setForm] = useState(blank);
  const [success, setSuccess] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!form.company.trim() || !form.idNumber.trim()) {
      toast("Company and ID number are required", "!", "warning"); return;
    }
    const srId = `MGT-SR-0000-${generateId().toUpperCase().slice(-8)}`;
    dispatch({ type: "ADD_SERVICE_REQUEST", request: {
      id: srId, requestNumber: srId,
      subject: `KYC/FICA submission: ${form.company}`,
      category: "Compliance", priority: form.riskLevel === "High" || form.riskLevel === "Very High" ? "High" : "Medium",
      status: "New", company: form.company, requester: form.contact, email: form.email,
      description: `KYC/FICA form submitted via Internal Forms.\n\nCompany: ${form.company}\nContact: ${form.contact}\nEmail: ${form.email}\nID Type: ${form.idType}\nID Number: ${form.idNumber}\nTax/VAT Number: ${form.taxNumber || "—"}\nSource of Funds: ${form.sourceOfFunds || "—"}\nRisk Level: ${form.riskLevel}\nPEP Status: ${form.pepStatus}\nNotes: ${form.notes || "—"}`,
      owner: form.consultant || state.user.name, channel: "Internal",
      createdAt: new Date().toISOString(),
    }});
    setSuccess(`KYC/FICA record submitted for ${form.company}.`);
    setForm(blank);
  };

  return (
    <div>
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}
      <SectionHead title="Entity Identification" />
      <Grid cols={2}>
        <Field label="Company / Entity Name" required><input style={inputStyle} value={form.company} onChange={set("company")} placeholder="Legal entity name" /></Field>
        <Field label="Authorised Representative" required><input style={inputStyle} value={form.contact} onChange={set("contact")} placeholder="Full legal name" /></Field>
        <Field label="Email Address"><input style={inputStyle} type="email" value={form.email} onChange={set("email")} placeholder="representative@company.co.za" /></Field>
        <Field label="ID Document Type">
          <select style={selectStyle} value={form.idType} onChange={set("idType")}>
            {ID_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Document Number" required><input style={inputStyle} value={form.idNumber} onChange={set("idNumber")} placeholder="Exactly as it appears" /></Field>
        <Field label="Tax / VAT Number"><input style={inputStyle} value={form.taxNumber} onChange={set("taxNumber")} placeholder="Optional" /></Field>
      </Grid>
      <SectionHead title="Compliance Assessment" />
      <Grid cols={2}>
        <Field label="Source of Funds">
          <select style={selectStyle} value={form.sourceOfFunds} onChange={set("sourceOfFunds")}>
            <option value="">Select…</option>
            {["Business Revenue","Salary / Employment","Investment Returns","Inheritance","Property Sale","Other"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Risk Level">
          <select style={selectStyle} value={form.riskLevel} onChange={set("riskLevel")}>
            {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Politically Exposed Person (PEP)">
          <select style={selectStyle} value={form.pepStatus} onChange={set("pepStatus")}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
            <option value="Related">Related to a PEP</option>
          </select>
        </Field>
        <Field label="Assigned Consultant">
          <select style={selectStyle} value={form.consultant} onChange={set("consultant")}>
            <option value="">Assign to…</option>
            {(state.consultants ?? []).map(c => <option key={c.id}>{c.name}</option>)}
            <option value={state.user.name}>{state.user.name} (me)</option>
          </select>
        </Field>
      </Grid>
      <Field label="Notes / Observations">
        <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes} onChange={set("notes")} placeholder="Any concerns, additional verification required…" />
      </Field>
      <div style={{ display: "flex" }}>
        <ClearBtn onClick={() => setForm(blank)} />
        <SubmitBtn onClick={submit} label="Submit KYC Record →" />
      </div>
      <SubmissionsPanel
        requests={kycSRs}
        title="KYC / FICA Records"
        statusOptions={["New","In Progress","Verified","Rejected","Closed"]}
      />
    </div>
  );
}

/* ─── SERVICE SCOPE FORM ───────────────────────────────────── */
function ServiceScope() {
  const { state, dispatch, toast } = useApp();
  const scopeSRs = useMemo(() =>
    (state.serviceRequests ?? []).filter(r => r.category === "Operations" && r.channel === "Internal" && !r.subject.startsWith("Handover:"))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [state.serviceRequests]);
  const blank = { clientId:"", services:[], timeline:"4–6 weeks", budget:"", setupFee:"",
    monthly:"", requirements:"", deliverables:"", consultant:"" };
  const [form, setForm] = useState(blank);
  const [success, setSuccess] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleService = s => setForm(p => ({
    ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s],
  }));

  const submit = () => {
    if (!form.clientId || form.services.length === 0) {
      toast("Select a client and at least one service", "!", "warning"); return;
    }
    const client = state.clients.find(c => String(c.id) === String(form.clientId));
    const srId = `MGT-SR-0000-${generateId().toUpperCase().slice(-8)}`;
    dispatch({ type: "ADD_SERVICE_REQUEST", request: {
      id: srId, requestNumber: srId,
      subject: `Service scope: ${client?.name || "Unknown"} — ${form.services.join(", ")}`,
      category: "Operations", priority: "Medium", status: "Qualified",
      company: client?.name || "", requester: client?.contact || "", email: client?.email || "",
      clientId: form.clientId,
      description: `Service scoping form submitted.\n\nClient: ${client?.name}\nServices: ${form.services.join(", ")}\nTimeline: ${form.timeline}\nBudget: ${form.budget || "—"}\nSetup Fee: ${form.setupFee || "—"}\nMonthly: ${form.monthly || "—"}\n\nRequirements:\n${form.requirements || "—"}\n\nDeliverables:\n${form.deliverables || "—"}`,
      owner: form.consultant || state.user.name, channel: "Internal",
      createdAt: new Date().toISOString(),
    }});
    setSuccess(`Scope logged for ${client?.name}.`);
    setForm(blank);
  };

  return (
    <div>
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}
      <SectionHead title="Client & Services" />
      <Grid cols={2}>
        <Field label="Client" required>
          <select style={selectStyle} value={form.clientId} onChange={set("clientId")}>
            <option value="">Select client…</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Assigned Consultant">
          <select style={selectStyle} value={form.consultant} onChange={set("consultant")}>
            <option value="">Assign to…</option>
            {(state.consultants ?? []).map(c => <option key={c.id}>{c.name}</option>)}
            <option value={state.user.name}>{state.user.name} (me)</option>
          </select>
        </Field>
      </Grid>
      <Field label="Services in Scope" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {BOT_TYPES.map(s => (
            <button key={s} type="button" onClick={() => toggleService(s)}
              style={{ padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${form.services.includes(s) ? C.accent : C.border}`,
                background: form.services.includes(s) ? C.accentBg : C.card,
                color: form.services.includes(s) ? C.accent : C.muted,
                fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
      </Field>
      <SectionHead title="Commercial Terms" />
      <Grid cols={3}>
        <Field label="Timeline">
          <select style={selectStyle} value={form.timeline} onChange={set("timeline")}>
            {["1–2 weeks","2–4 weeks","4–6 weeks","6–8 weeks","8–12 weeks","Custom"].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Setup Fee (ZAR)"><input style={inputStyle} value={form.setupFee} onChange={set("setupFee")} placeholder="e.g. 9500" /></Field>
        <Field label="Monthly Retainer (ZAR)"><input style={inputStyle} value={form.monthly} onChange={set("monthly")} placeholder="e.g. 4500" /></Field>
      </Grid>
      <SectionHead title="Scope Details" />
      <Field label="Client Requirements">
        <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={form.requirements} onChange={set("requirements")} placeholder="What the client needs and expects…" />
      </Field>
      <Field label="Deliverables">
        <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={form.deliverables} onChange={set("deliverables")} placeholder="What we will deliver — flows, integrations, reports…" />
      </Field>
      <div style={{ display: "flex" }}>
        <ClearBtn onClick={() => setForm(blank)} />
        <SubmitBtn onClick={submit} label="Log Service Scope →" />
      </div>
      <SubmissionsPanel
        requests={scopeSRs}
        title="Scope Records"
        statusOptions={["Qualified","Proposal Sent","Approved","In Setup","Build","Testing","Live","Closed"]}
      />
    </div>
  );
}

/* ─── INCIDENT REPORT FORM ─────────────────────────────────── */
function IncidentReport() {
  const { state, dispatch, toast } = useApp();
  const incidentSRs = useMemo(() =>
    (state.serviceRequests ?? []).filter(r => r.category === "Technical" && r.channel === "Internal")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [state.serviceRequests]);
  const blank = { clientId:"", type:"Bot Outage", severity:"Medium", title:"", description:"",
    detectedAt: new Date().toISOString().slice(0, 16), resolvedAt:"", impact:"", rootCause:"", actions:"" };
  const [form, setForm] = useState(blank);
  const [success, setSuccess] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast("Title and description are required", "!", "warning"); return;
    }
    const client = state.clients.find(c => String(c.id) === String(form.clientId));
    const srId = `MGT-SR-0000-${generateId().toUpperCase().slice(-8)}`;
    dispatch({ type: "ADD_SERVICE_REQUEST", request: {
      id: srId, requestNumber: srId,
      subject: `[Incident] ${form.type}: ${form.title}`,
      category: "Technical", priority: form.severity === "Critical" ? "Critical" : form.severity === "High" ? "High" : "Medium",
      status: form.resolvedAt ? "Resolved" : "In Progress",
      company: client?.name || "MgucaTECH Internal", requester: state.user.name, email: state.user.email,
      clientId: form.clientId || undefined,
      description: `Incident Report\n\nType: ${form.type}\nSeverity: ${form.severity}\nDetected: ${form.detectedAt}\nResolved: ${form.resolvedAt || "Ongoing"}\n\nDescription:\n${form.description}\n\nImpact:\n${form.impact || "—"}\n\nRoot Cause:\n${form.rootCause || "—"}\n\nActions Taken:\n${form.actions || "—"}`,
      owner: state.user.name, channel: "Internal",
      createdAt: new Date().toISOString(),
    }});
    setSuccess(`Incident report logged: ${form.title}`);
    setForm(blank);
  };

  return (
    <div>
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}
      <SectionHead title="Incident Details" />
      <Grid cols={2}>
        <Field label="Incident Title" required><input style={inputStyle} value={form.title} onChange={set("title")} placeholder="Brief description of the incident" /></Field>
        <Field label="Incident Type">
          <select style={selectStyle} value={form.type} onChange={set("type")}>
            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Severity">
          <select style={selectStyle} value={form.severity} onChange={set("severity")}>
            {["Low","Medium","High","Critical"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Affected Client (if any)">
          <select style={selectStyle} value={form.clientId} onChange={set("clientId")}>
            <option value="">All / Internal</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Detected At"><input style={inputStyle} type="datetime-local" value={form.detectedAt} onChange={set("detectedAt")} /></Field>
        <Field label="Resolved At"><input style={inputStyle} type="datetime-local" value={form.resolvedAt} onChange={set("resolvedAt")} /></Field>
      </Grid>
      <SectionHead title="Analysis" />
      <Field label="Description & Timeline" required>
        <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="What happened, when, and how it was discovered…" />
      </Field>
      <Grid cols={2}>
        <Field label="Impact">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.impact} onChange={set("impact")} placeholder="Who was affected, how badly…" />
        </Field>
        <Field label="Root Cause">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.rootCause} onChange={set("rootCause")} placeholder="Why did it happen…" />
        </Field>
      </Grid>
      <Field label="Actions Taken / Remediation">
        <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.actions} onChange={set("actions")} placeholder="Steps taken to fix, prevent recurrence…" />
      </Field>
      <div style={{ display: "flex" }}>
        <ClearBtn onClick={() => setForm(blank)} />
        <SubmitBtn onClick={submit} label="Log Incident →" />
      </div>
      <SubmissionsPanel
        requests={incidentSRs}
        title="Incident Log"
        statusOptions={["New","In Progress","Resolved","Closed"]}
      />
    </div>
  );
}

/* ─── CONSULTANT HANDOVER FORM ─────────────────────────────── */
function ConsultantHandover() {
  const { state, dispatch, toast } = useApp();
  const handoverSRs = useMemo(() =>
    (state.serviceRequests ?? []).filter(r => r.category === "Operations" && r.channel === "Internal" && r.subject.startsWith("Handover:"))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [state.serviceRequests]);
  const blank = { clientId:"", fromConsultant:"", toConsultant:"", handoverDate: new Date().toISOString().slice(0,10),
    openRequests:"", pendingActions:"", keyContacts:"", contractNotes:"", billingNotes:"", additionalNotes:"" };
  const [form, setForm] = useState(blank);
  const [success, setSuccess] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const consultantNames = [...(state.consultants ?? []).map(c => c.name), state.user.name];

  const submit = () => {
    if (!form.clientId || !form.toConsultant) {
      toast("Client and receiving consultant are required", "!", "warning"); return;
    }
    const client = state.clients.find(c => String(c.id) === String(form.clientId));
    const srId = `MGT-SR-0000-${generateId().toUpperCase().slice(-8)}`;
    dispatch({ type: "ADD_SERVICE_REQUEST", request: {
      id: srId, requestNumber: srId,
      subject: `Handover: ${client?.name || "Client"} → ${form.toConsultant}`,
      category: "Operations", priority: "Medium", status: "In Progress",
      company: client?.name || "", requester: form.fromConsultant || state.user.name, email: state.user.email,
      clientId: form.clientId,
      description: `Consultant Handover Form\n\nClient: ${client?.name}\nFrom: ${form.fromConsultant || state.user.name}\nTo: ${form.toConsultant}\nDate: ${form.handoverDate}\n\nOpen Requests / Tasks:\n${form.openRequests || "—"}\n\nPending Actions:\n${form.pendingActions || "—"}\n\nKey Contacts:\n${form.keyContacts || "—"}\n\nContract Notes:\n${form.contractNotes || "—"}\n\nBilling Notes:\n${form.billingNotes || "—"}\n\nAdditional Notes:\n${form.additionalNotes || "—"}`,
      owner: form.toConsultant, channel: "Internal",
      createdAt: new Date().toISOString(),
    }});
    if (client && form.toConsultant) {
      dispatch({ type: "UPDATE_CLIENT", client: { ...client, owner: form.toConsultant } });
    }
    setSuccess(`Handover to ${form.toConsultant} logged for ${client?.name}.`);
    setForm(blank);
  };

  return (
    <div>
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}
      <SectionHead title="Handover Details" />
      <Grid cols={2}>
        <Field label="Client" required>
          <select style={selectStyle} value={form.clientId} onChange={set("clientId")}>
            <option value="">Select client…</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Handover Date"><input style={inputStyle} type="date" value={form.handoverDate} onChange={set("handoverDate")} /></Field>
        <Field label="Handing Over (From)">
          <select style={selectStyle} value={form.fromConsultant} onChange={set("fromConsultant")}>
            <option value="">Select…</option>
            {consultantNames.map(n => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Receiving Consultant (To)" required>
          <select style={selectStyle} value={form.toConsultant} onChange={set("toConsultant")}>
            <option value="">Select…</option>
            {consultantNames.map(n => <option key={n}>{n}</option>)}
          </select>
        </Field>
      </Grid>
      <SectionHead title="Account Summary" />
      <Grid cols={2}>
        <Field label="Open Requests / Tasks">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.openRequests} onChange={set("openRequests")} placeholder="List open SRs, follow-ups, blockers…" />
        </Field>
        <Field label="Pending Actions">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.pendingActions} onChange={set("pendingActions")} placeholder="What needs to be done next…" />
        </Field>
        <Field label="Key Contacts">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.keyContacts} onChange={set("keyContacts")} placeholder="Name, role, email, preferred contact method…" />
        </Field>
        <Field label="Contract & SLA Notes">
          <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.contractNotes} onChange={set("contractNotes")} placeholder="Contract terms, SLAs, renewal dates…" />
        </Field>
      </Grid>
      <Field label="Billing Notes">
        <textarea style={{ ...inputStyle, height: 70, resize: "vertical" }} value={form.billingNotes} onChange={set("billingNotes")} placeholder="Outstanding invoices, payment terms, billing contacts…" />
      </Field>
      <Field label="Additional Notes">
        <textarea style={{ ...inputStyle, height: 70, resize: "vertical" }} value={form.additionalNotes} onChange={set("additionalNotes")} placeholder="Anything else the incoming consultant should know…" />
      </Field>
      <div style={{ display: "flex" }}>
        <ClearBtn onClick={() => setForm(blank)} />
        <SubmitBtn onClick={submit} label="Submit Handover →" />
      </div>
      <SubmissionsPanel
        requests={handoverSRs}
        title="Handover History"
        statusOptions={["New","In Progress","Approved","Closed"]}
      />
    </div>
  );
}

/* ─── MAIN VIEW ────────────────────────────────────────────── */
export default function InternalForms() {
  const { state } = useApp();
  const [tab, setTab] = useState("intake");

  const srs = state.serviceRequests ?? [];
  const counts = {
    intake:   srs.filter(r => r.category === "Onboarding" && r.channel === "Internal").length,
    kyc:      srs.filter(r => r.category === "Compliance" && r.channel === "Internal").length,
    scope:    srs.filter(r => r.category === "Operations" && r.channel === "Internal" && !r.subject?.startsWith("Handover:")).length,
    incident: srs.filter(r => r.category === "Technical"  && r.channel === "Internal").length,
    handover: srs.filter(r => r.category === "Operations" && r.channel === "Internal" && r.subject?.startsWith("Handover:")).length,
  };

  const tabs = [
    { id: "intake",   label: "Client Intake",      count: counts.intake   || undefined },
    { id: "kyc",      label: "KYC / FICA",          count: counts.kyc      || undefined },
    { id: "scope",    label: "Service Scope",       count: counts.scope    || undefined },
    { id: "incident", label: "Incident Report",     count: counts.incident || undefined },
    { id: "handover", label: "Consultant Handover", count: counts.handover || undefined },
  ];

  const descriptions = {
    intake:   "Capture new client information and create a client record + onboarding request.",
    kyc:      "Record KYC/FICA identity verification and compliance assessment.",
    scope:    "Define service scope, deliverables and commercial terms for a client engagement.",
    incident: "Log a technical incident, outage, or operational issue with root cause analysis.",
    handover: "Document a consultant handover — transfers account ownership and open actions.",
  };

  const form = {
    intake:   <ClientIntake />,
    kyc:      <KycForm />,
    scope:    <ServiceScope />,
    incident: <IncidentReport />,
    handover: <ConsultantHandover />,
  };

  return (
    <div style={{ padding: 32, overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Internal Forms</div>
        <div style={{ color: C.muted, fontSize: 14 }}>{descriptions[tab]}</div>
      </div>

      <SegmentTabs tabs={tabs} value={tab} onChange={setTab} />

      <div style={{ maxWidth: 800, marginTop: 24,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "24px 28px" }}>
        {form[tab]}
      </div>
    </div>
  );
}
