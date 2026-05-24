import { useEffect, useMemo, useState } from "react";
import {
  C,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  SERVICE_LIFECYCLE,
  font,
  pill,
} from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { daysUntil, formatDateShort, todayISO } from "../utils";

const BLANK_REQUEST = {
  clientId: "",
  requester: "",
  email: "",
  category: "Operations",
  priority: "Medium",
  status: "New",
  subject: "",
  description: "",
  dueDate: todayISO(),
  owner: "Admin",
  channel: "Client Portal",
  notes: "",
};

function priorityStyle(priority) {
  if (priority === "Critical") return pill("#fff", C.red);
  if (priority === "High") return pill(C.red, C.redBg);
  if (priority === "Medium") return pill(C.yellow, C.yellowBg);
  return pill(C.blue, C.blueBg);
}

function requestStatusStyle(status) {
  if (status === "Resolved" || status === "Closed") return pill(C.success, C.successBg);
  if (status === "Approved" || status === "Live" || status === "Support") return pill(C.success, C.successBg);
  if (status === "Needs Attention") return pill("#fff", C.red);
  if (status === "In Setup" || status === "Build" || status === "Testing" || status === "Proposal Sent") return pill(C.accent, C.accentBg);
  if (status === "In Progress") return pill(C.blue, C.blueBg);
  if (status === "Waiting on Client") return pill(C.yellow, C.yellowBg);
  if (status === "Triaged" || status === "Qualified") return pill(C.purple, C.purpleBg);
  return pill(C.accent, C.accentBg);
}

function LifecycleBar({ status }) {
  const current = status === "Resolved" || status === "Closed" ? "Support" : status;
  const active = Math.max(0, SERVICE_LIFECYCLE.indexOf(current));
  return (
    <div style={{ margin:"0 0 12px" }}>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${SERVICE_LIFECYCLE.length},1fr)`, gap:4, marginBottom:6 }}>
        {SERVICE_LIFECYCLE.map((stage, index) => (
          <div key={stage} title={stage} style={{ height:6, borderRadius:99, background:index <= active ? C.accent : C.subtle }} />
        ))}
      </div>
      <div style={{ color:C.muted, fontSize:10, fontWeight:800, letterSpacing:.4, textTransform:"uppercase" }}>
        Lifecycle: {SERVICE_LIFECYCLE[Math.min(active, SERVICE_LIFECYCLE.length - 1)]}
      </div>
    </div>
  );
}

function validate(form) {
  const errors = {};
  const isOnboarding = form.source === "onboarding" || form.onboarding;
  if (!isOnboarding && !form.clientId) errors.clientId = "Select a relationship";
  if (!form.requester.trim()) errors.requester = "Required";
  if (!form.email.includes("@")) errors.email = "Valid email required";
  if (!form.subject.trim()) errors.subject = "Required";
  if (!isOnboarding && !form.description.trim()) errors.description = "Required";
  if (!form.dueDate) errors.dueDate = "Required";
  return errors;
}

function buildOnboardingDescription(onboarding = {}, fallback = "") {
  const products = Array.isArray(onboarding.product) ? onboarding.product.join(", ") : onboarding.product;
  const lines = [
    onboarding.company && `Company: ${onboarding.company}`,
    onboarding.sector && `Sector: ${onboarding.sector}`,
    onboarding.leadName && `Lead: ${onboarding.leadName}`,
    onboarding.email && `Email: ${onboarding.email}`,
    onboarding.phone && `WhatsApp: ${onboarding.phone}`,
    onboarding.location && `Location: ${onboarding.location}`,
    onboarding.website && `Website: ${onboarding.website}`,
    products && `Products: ${products}`,
    onboarding.privateClient && `Private Client: ${onboarding.privateClient}`,
    onboarding.package && `Package: ${onboarding.package}`,
    (onboarding.decisionStatus || onboarding.decision) && `Decision: ${onboarding.decisionStatus || onboarding.decision}`,
    (onboarding.billingStatus || onboarding.billing) && `Billing: ${onboarding.billingStatus || onboarding.billing}`,
    onboarding.goal && `Goal: ${onboarding.goal}`,
    onboarding.volume && `Volume: ${onboarding.volume}`,
    onboarding.timeline && `Timeline: ${onboarding.timeline}`,
    onboarding.language && `Languages: ${onboarding.language}`,
    onboarding.systems && `Systems: ${onboarding.systems}`,
    onboarding.handoff && `Handoff: ${onboarding.handoff}`,
    onboarding.consultantName && `Consultant: ${onboarding.consultantName}`,
    onboarding.consultantEmail && `Consultant Email: ${onboarding.consultantEmail}`,
    onboarding.notes && `Notes: ${onboarding.notes}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : fallback;
}

function parseInternalNotes(notes = "") {
  const text = String(notes || "")
    .replace(/^Internal notes:\s*/i, "")
    .split(/\s+→\s+/)[0]
    .replace(/\s+(Source|Sector|WhatsApp|Location|Consultant email|Consultant|Decision status|Decision):/gi, "\n$1:")
    .replace(/\s+(Approved for onboarding by\s+.+?\s+on\s+\d{4}-\d{2}-\d{2}\.)/gi, "\n$1")
    .replace(/\s+(Client portal access granted to\s+.+?\.)/gi, "\n$1")
    .replace(/\s+(Approval email and starter-kit PDF sent\.)/gi, "\n$1");
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const result = { source: "", approvedBy: "", approvedDate: "", portalEmail: "", starterKitSent: false, extra: "", extraLines: [] };
  const extra = [];

  for (const line of lines) {
    let match;
    if ((match = line.match(/^Source:\s*(.+)$/i))) result.source = match[1];
    else if ((match = line.match(/^Approved for onboarding by\s+(.+?)\s+on\s+(\d{4}-\d{2}-\d{2})\.?$/i))) {
      result.approvedBy = match[1];
      result.approvedDate = match[2];
    } else if ((match = line.match(/^Client portal access granted to\s+(.+?)\.?$/i))) {
      result.portalEmail = match[1];
    } else if (/starter-kit|starter kit|approval email/i.test(line)) {
      result.starterKitSent = true;
    } else {
      extra.push(line);
    }
  }

  result.extraLines = extra.length ? extra : [""];
  result.extra = extra.join("\n");
  return result;
}

function internalNoteKey(line = "") {
  const value = String(line || "").trim();
  if (/^Source:/i.test(value)) return "initial:source";
  if (/^Approved for onboarding by/i.test(value)) return "initial:approval";
  if (/^Client portal access granted to/i.test(value)) return "initial:portal";
  if (/^Approval email and starter-kit PDF sent\.?$/i.test(value)) return "initial:starter-kit";
  return `line:${value.toLowerCase()}`;
}

function uniqueInternalNoteLines(lines = []) {
  const seen = new Set();
  return lines
    .map(line => String(line || "").replace(/^Internal notes:\s*/i, "").trim())
    .filter(Boolean)
    .filter(line => {
      const key = internalNoteKey(line);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeInternalNotes(...blocks) {
  const lines = blocks
    .flatMap(block => String(block || "").split(/\n+|\s+→\s+/))
    .map(line => line.trim());
  return uniqueInternalNoteLines(lines).join("\n");
}

function buildInternalNotes(notes = {}, fallback = "") {
  const extraLines = Array.isArray(notes.extraLines)
    ? notes.extraLines.map(line => String(line || "").trim()).filter(Boolean)
    : String(notes.extra || "").split(/\n+/).map(line => line.trim()).filter(Boolean);
  const lines = [
    notes.source && `Source: ${notes.source}`,
    notes.approvedBy && notes.approvedDate && `Approved for onboarding by ${notes.approvedBy} on ${notes.approvedDate}.`,
    notes.portalEmail && `Client portal access granted to ${notes.portalEmail}.`,
    notes.starterKitSent && "Approval email and starter-kit PDF sent.",
    ...extraLines,
  ].filter(Boolean);
  const uniqueLines = uniqueInternalNoteLines(lines);
  return uniqueLines.length ? uniqueLines.join("\n") : fallback;
}

function RequestForm({ form, setForm, errors, clients }) {
  const set = (key) => (event) => setForm(prev => ({ ...prev, [key]: event.target.value }));
  const setOnboarding = (key) => (event) => {
    setForm(prev => ({
      ...prev,
      onboarding: { ...(prev.onboarding ?? {}), [key]: event.target.value },
    }));
  };
  const setInternalNote = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm(prev => ({
      ...prev,
      internalNotes: { ...(prev.internalNotes ?? {}), [key]: value },
    }));
  };
  const setInternalNoteLine = (index) => (event) => {
    setForm(prev => {
      const internalNotes = prev.internalNotes ?? {};
      const extraLines = [...(internalNotes.extraLines ?? [""])];
      extraLines[index] = event.target.value;
      return { ...prev, internalNotes: { ...internalNotes, extraLines, extra: extraLines.join("\n") } };
    });
  };
  const addInternalNoteLine = () => {
    setForm(prev => {
      const internalNotes = prev.internalNotes ?? {};
      const extraLines = [...(internalNotes.extraLines ?? [""]), ""];
      return { ...prev, internalNotes: { ...internalNotes, extraLines, extra: extraLines.join("\n") } };
    });
  };
  const onboarding = form.onboarding;
  const internalNotes = form.internalNotes;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Relationship" error={errors.clientId}>
          <select value={form.clientId} onChange={set("clientId")} style={{ ...selectStyle, borderColor: errors.clientId ? C.red : C.border }}>
            <option value="">Select relationship...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </FormRow>
      </div>
      <FormRow label="Requester" error={errors.requester}>
        <input value={form.requester} onChange={set("requester")} style={{ ...inputStyle, borderColor: errors.requester ? C.red : C.border }} placeholder="Client contact name" />
      </FormRow>
      <FormRow label="Requester Email" error={errors.email}>
        <input value={form.email} onChange={set("email")} style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }} placeholder="client@company.com" />
      </FormRow>
      <FormRow label="Category">
        <select value={form.category} onChange={set("category")} style={selectStyle}>
          {REQUEST_CATEGORIES.map(category => <option key={category}>{category}</option>)}
        </select>
      </FormRow>
      <FormRow label="Priority">
        <select value={form.priority} onChange={set("priority")} style={selectStyle}>
          {REQUEST_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
        </select>
      </FormRow>
      <FormRow label="Status">
        <select value={form.status} onChange={set("status")} style={selectStyle}>
          {REQUEST_STATUSES.map(status => <option key={status}>{status}</option>)}
        </select>
      </FormRow>
      <FormRow label="Target Response Date" error={errors.dueDate}>
        <input type="date" value={form.dueDate} onChange={set("dueDate")} style={{ ...inputStyle, borderColor: errors.dueDate ? C.red : C.border }} />
      </FormRow>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Subject" error={errors.subject}>
          <input value={form.subject} onChange={set("subject")} style={{ ...inputStyle, borderColor: errors.subject ? C.red : C.border }} placeholder="Board pack request, compliance file, issue..." />
        </FormRow>
      </div>
      {onboarding ? (
        <div style={{ gridColumn:"1/-1" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.muted,
            letterSpacing:.5, textTransform:"uppercase", marginBottom:10 }}>
            Request Details
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px",
            border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:18 }}>
            <FormRow label="Products">
              <input value={fieldVal(onboarding.product) ?? ""} onChange={setOnboarding("product")} style={inputStyle} />
            </FormRow>
            <FormRow label="Package">
              <input value={onboarding.package ?? ""} onChange={setOnboarding("package")} style={inputStyle} />
            </FormRow>
            <FormRow label="Private Client">
              <select value={onboarding.privateClient ?? "No"} onChange={setOnboarding("privateClient")} style={selectStyle}>
                {["No", "Yes"].map(value => <option key={value}>{value}</option>)}
              </select>
            </FormRow>
            <FormRow label="Billing">
              <input value={onboarding.billingStatus ?? onboarding.billing ?? ""} onChange={setOnboarding("billingStatus")} style={inputStyle} />
            </FormRow>
            <FormRow label="Decision">
              <input value={onboarding.decisionStatus ?? onboarding.decision ?? ""} onChange={setOnboarding("decisionStatus")} style={inputStyle} />
            </FormRow>
            <FormRow label="Volume">
              <input value={onboarding.volume ?? ""} onChange={setOnboarding("volume")} style={inputStyle} />
            </FormRow>
            <FormRow label="Timeline">
              <input value={onboarding.timeline ?? ""} onChange={setOnboarding("timeline")} style={inputStyle} />
            </FormRow>
            <FormRow label="Languages">
              <input value={onboarding.language ?? ""} onChange={setOnboarding("language")} style={inputStyle} />
            </FormRow>
            <FormRow label="Systems">
              <input value={onboarding.systems ?? ""} onChange={setOnboarding("systems")} style={inputStyle} />
            </FormRow>
            <div style={{ gridColumn:"1/-1" }}>
              <FormRow label="Handoff">
                <textarea value={onboarding.handoff ?? ""} onChange={setOnboarding("handoff")} style={{ ...inputStyle, minHeight:70, resize:"vertical" }} />
              </FormRow>
            </div>
            <FormRow label="Consultant">
              <input value={onboarding.consultantName ?? ""} onChange={setOnboarding("consultantName")} style={inputStyle} />
            </FormRow>
            <FormRow label="Consultant Email">
              <input value={onboarding.consultantEmail ?? ""} onChange={setOnboarding("consultantEmail")} style={inputStyle} />
            </FormRow>
            <div style={{ gridColumn:"1/-1" }}>
              <FormRow label="Notes">
                <textarea value={onboarding.notes ?? ""} onChange={setOnboarding("notes")} style={{ ...inputStyle, minHeight:72, resize:"vertical" }} />
              </FormRow>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ gridColumn:"1/-1" }}>
          <FormRow label="Request Details" error={errors.description}>
            <textarea value={form.description} onChange={set("description")} style={{ ...inputStyle, borderColor: errors.description ? C.red : C.border, minHeight:96, resize:"vertical" }} placeholder="What does the client need, by when, and what context matters?" />
          </FormRow>
        </div>
      )}
      <FormRow label="Owner">
        <input value={form.owner} onChange={set("owner")} style={inputStyle} />
      </FormRow>
      <FormRow label="Channel">
        <select value={form.channel} onChange={set("channel")} style={selectStyle}>
          {["Onboarding", "Client Portal", "Email", "Phone", "WhatsApp", "Meeting", "Other"].map(channel => <option key={channel}>{channel}</option>)}
        </select>
      </FormRow>
      {internalNotes ? (
        <div style={{ gridColumn:"1/-1" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.muted,
            letterSpacing:.5, textTransform:"uppercase", marginBottom:10 }}>
            Internal Notes
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px",
            border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
            <FormRow label="Source">
              <input value={internalNotes.source ?? ""} onChange={setInternalNote("source")} style={inputStyle} />
            </FormRow>
            <FormRow label="Approved By">
              <input value={internalNotes.approvedBy ?? ""} onChange={setInternalNote("approvedBy")} style={inputStyle} />
            </FormRow>
            <FormRow label="Approval Date">
              <input type="date" value={internalNotes.approvedDate ?? ""} onChange={setInternalNote("approvedDate")} style={inputStyle} />
            </FormRow>
            <FormRow label="Portal Access Email">
              <input value={internalNotes.portalEmail ?? ""} onChange={setInternalNote("portalEmail")} style={inputStyle} />
            </FormRow>
            <div style={{ gridColumn:"1/-1", marginBottom:18 }}>
              <label style={{ display:"flex", alignItems:"center", gap:10, color:C.text, fontWeight:700, fontSize:13 }}>
                <input type="checkbox" checked={!!internalNotes.starterKitSent} onChange={setInternalNote("starterKitSent")} />
                Approval email and starter-kit PDF sent
              </label>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <FormRow label="Additional Internal Notes">
                {(internalNotes.extraLines ?? [internalNotes.extra ?? ""]).map((line, index) => (
                  <input key={index} value={line} onChange={setInternalNoteLine(index)} style={{ ...inputStyle, marginBottom:8 }} placeholder={`Internal note line ${index + 1}`} />
                ))}
                <button type="button" onClick={addInternalNoteLine}
                  style={{ background:C.subtle, border:"none", color:C.muted, borderRadius:6, padding:"7px 10px", fontSize:11, fontWeight:800, cursor:"pointer" }}>
                  + Add note line
                </button>
              </FormRow>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ gridColumn:"1/-1" }}>
          <FormRow label="Internal Notes">
            <textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, minHeight:72, resize:"vertical" }} placeholder="Internal handling notes, dependencies, escalation path..." />
          </FormRow>
        </div>
      )}
    </div>
  );
}

function fieldVal(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || null;
  const s = String(v ?? "").trim();
  return s || null;
}

// Parse "Key: Value Key: Value …" text (stored in request.description / notes)
// into a structured object. Handles both "Consultant Capture" and "Onboarding" formats.
function parseRequestData(request) {
  if (request.onboarding && typeof request.onboarding === "object") return request.onboarding;
  const raw = (request.description ?? "").replace(/\n|`n/g, " ");
  if (!raw.trim()) return null;

  // [fieldName, regex] — longer/more-specific patterns listed first so
  // "Consultant email" is found before the bare "Consultant" pattern.
  const FIELDS = [
    ["consultantEmail", /consultant\s+email/i],
    ["privateClient",   /private\s+client/i],
    ["decisionStatus",  /decision\s+status/i],
    ["consultantName",  /consultant/i],
    ["handoff",         /handoff/i],
    ["company",         /company/i],
    ["sector",          /sector/i],
    ["location",        /location/i],
    ["phone",           /whatsapp/i],
    ["website",         /website/i],
    ["product",         /products?/i],
    ["package",         /package/i],
    ["goal",            /goal/i],
    ["timeline",        /timeline/i],
    ["billing",         /billing/i],
    ["volume",          /volume/i],
    ["decision",        /decision/i],
    ["systems",         /systems?/i],
    ["language",        /languages?/i],
    ["lead",            /lead/i],
    ["notes",           /notes/i],
    ["email",           /email/i],
  ];

  // Find every "Label:" occurrence with its span
  const hits = [];
  for (const [field, rx] of FIELDS) {
    const gr = new RegExp(rx.source + "\\s*:", "gi");
    let m;
    while ((m = gr.exec(raw)) !== null) {
      hits.push({ field, start: m.index, end: m.index + m[0].length });
    }
  }
  hits.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (shorter key matched inside a longer one)
  const kept = [];
  for (const h of hits) {
    const prev = kept[kept.length - 1];
    if (!prev || h.start >= prev.end) kept.push(h);
  }

  // Extract the text between consecutive hits as the value for each key
  const result = {};
  for (let i = 0; i < kept.length; i++) {
    const { field, end } = kept[i];
    const nextStart = i + 1 < kept.length ? kept[i + 1].start : raw.length;
    const value = raw.slice(end, nextStart).trim().replace(/\s+/g, " ");
    if (value && !result[field]) result[field] = value;
  }

  return Object.keys(result).length >= 3 ? result : null;
}

function InfoCell({ label, value }) {
  const v = fieldVal(value);
  if (!v) return <div />;
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:.6, textTransform:"uppercase", color:C.muted, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, color:C.text, fontWeight:500, lineHeight:1.35 }}>{v}</div>
    </div>
  );
}

function OnboardingGrid({ onboarding: o }) {
  const groups = [
    { label:"Client", cells:[
      ["Company",  o.company],  ["Email",    o.email],
      ["Sector",   o.sector],   ["Location", o.location],
      ["WhatsApp", o.phone],    ["Website",  o.website],
    ]},
    { label:"Package", cells:[
      ["Products", fieldVal(o.product)], ["Package",  o.package],
      ["Private",  o.privateClient],
      ["Goal",     o.goal],              ["Timeline", o.timeline],
    ]},
    { label:"Business Details", cells:[
      ["Volume",    o.volume],
      ["Billing",   o.billingStatus || o.billing],
      ["Decision",  o.decisionStatus || o.decision],
      ["Systems",   o.systems],
      ["Languages", o.language],
    ]},
    { label:"Captured By", cells:[
      ["Consultant", o.consultantName || o.lead],
      ["Email",      o.consultantEmail],
    ]},
  ].filter(g => g.cells.some(([, v]) => fieldVal(v)));

  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:12 }}>
      {groups.map((group, gi) => {
        const cells = group.cells.filter(([, v]) => fieldVal(v));
        if (!cells.length) return null;
        return (
          <div key={group.label} style={{ borderBottom: gi < groups.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ background:C.subtle, padding:"4px 12px", fontSize:9, fontWeight:800, letterSpacing:.8, textTransform:"uppercase", color:C.muted }}>
              {group.label}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px 16px", padding:"10px 12px" }}>
              {cells.map(([label, value]) => <InfoCell key={label} label={label} value={value} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApprovalTrail({ notes }) {
  if (!notes) return null;
  // Notes may be a single long string without newlines — use regex to find sentences
  const KEYS = ["Approved for onboarding", "Client portal access granted", "Approval email"];
  const lines = KEYS.map(k => {
    const m = notes.match(new RegExp(k + "[^.]*\\.", "i"));
    return m ? m[0].trim() : null;
  }).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ background:C.successBg, border:`1px solid ${C.success}`, borderRadius:6, padding:"9px 12px", marginBottom:12 }}>
      <div style={{ color:C.success, fontSize:9, fontWeight:800, letterSpacing:.6, textTransform:"uppercase", marginBottom:5 }}>Approval Trail</div>
      {lines.map((line, i) => <div key={i} style={{ color:C.success, fontSize:11, lineHeight:1.5 }}>{line}</div>)}
    </div>
  );
}

function RequestAuditTrail({ trail = [] }) {
  const items = trail.slice(0, 3);
  if (!items.length) return null;
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 10px", marginBottom:12 }}>
      <div style={{ color:C.muted, fontSize:9, fontWeight:800, letterSpacing:.6, textTransform:"uppercase", marginBottom:7 }}>
        Consultant Amendment Audit
      </div>
      {items.map((item, index) => (
        <div key={item.id ?? index} style={{ padding:index > 0 ? "8px 0 0" : 0, marginTop:index > 0 ? 8 : 0, borderTop:index > 0 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:5 }}>
            <strong style={{ color:C.text, fontSize:12 }}>
              Consultant: {item.consultantName || item.amendedBy || item.actor || "System"}
            </strong>
            <span style={{ color:C.muted, fontSize:10 }}>{new Date(item.time).toLocaleString("en-ZA")}</span>
          </div>
          {(item.consultantEmail || item.amendedByEmail || item.actorEmail || item.consultantRole) && (
            <div style={{ color:C.muted, fontSize:10, marginBottom:5 }}>
              {[item.consultantEmail || item.amendedByEmail || item.actorEmail, item.consultantRole].filter(Boolean).join(" · ")}
            </div>
          )}
          {(item.changes ?? []).slice(0, 4).map(change => (
            <div key={change.field} style={{ color:C.muted, fontSize:11, lineHeight:1.45 }}>
              <strong style={{ color:C.accent }}>{change.label}:</strong> {change.before} → {change.after}
            </div>
          ))}
          {(item.changes ?? []).length > 4 && (
            <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>+{item.changes.length - 4} more changes</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ServiceRequests() {
  const { state, dispatch, navigate, toast } = useApp();
  const [queue, setQueue] = useState("Open");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [form, setForm] = useState(BLANK_REQUEST);
  const [errors, setErrors] = useState({});
  const [syncState, setSyncState] = useState("idle");
  const [approvingId, setApprovingId] = useState(null);

  const syncOnboardingRequests = async ({ quiet = false } = {}) => {
    setSyncState("syncing");
    try {
      const response = await fetch("https://mgucatech.com/api/requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request sync failed");
      dispatch({ type: "IMPORT_SERVICE_REQUESTS", requests: data.requests ?? [] });
      setSyncState(data.storage === "unconfigured" ? "unconfigured" : "synced");
      if (!quiet && data.storage === "unconfigured") {
        toast("Onboarding storage is not configured yet", "!", "warning");
      } else if (!quiet) {
        toast("Onboarding requests synced", "✓");
      }
    } catch {
      setSyncState("error");
      if (!quiet) toast("Could not sync onboarding requests", "!", "warning");
    }
  };

  useEffect(() => {
    syncOnboardingRequests({ quiet: true });
  }, []);

  const clientMap = useMemo(() => new Map(state.clients.map(client => [client.id, client])), [state.clients]);
  const requests = state.serviceRequests ?? [];
  const openRequests = requests.filter(request => !["Resolved", "Closed"].includes(request.status));
  const overdue = openRequests.filter(request => daysUntil(request.dueDate) < 0).length;
  const critical = openRequests.filter(request => request.priority === "Critical").length;
  const waiting = requests.filter(request => request.status === "Waiting on Client").length;
  const inSetup = requests.filter(request => ["Approved", "In Setup"].includes(request.status)).length;
  const attention = requests.filter(request => request.status === "Needs Attention").length;

  const tabs = [
    { id:"Open", label:"Open", count:openRequests.length },
    { id:"New", label:"New", count:requests.filter(r => r.status === "New").length },
    { id:"Qualified", label:"Qualified", count:requests.filter(r => r.status === "Qualified").length },
    { id:"Proposal Sent", label:"Proposal", count:requests.filter(r => r.status === "Proposal Sent").length },
    { id:"In Setup", label:"Setup", count:inSetup },
    { id:"Live", label:"Live", count:requests.filter(r => r.status === "Live").length },
    { id:"Needs Attention", label:"Attention", count:attention },
    { id:"Critical", label:"Critical", count:critical },
    { id:"Overdue", label:"Overdue", count:overdue },
    { id:"Waiting", label:"Waiting", count:waiting },
    { id:"Resolved", label:"Resolved", count:requests.filter(r => r.status === "Resolved").length },
    { id:"All", label:"All", count:requests.length },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter(request => {
        const client = clientMap.get(request.clientId);
        const queueMatch =
          queue === "All" ||
          (queue === "Open" && !["Resolved", "Closed"].includes(request.status)) ||
          (queue === "Critical" && request.priority === "Critical") ||
          (queue === "In Setup" && ["Approved", "In Setup"].includes(request.status)) ||
          (queue === "Overdue" && !["Resolved", "Closed"].includes(request.status) && daysUntil(request.dueDate) < 0) ||
          (queue === "Waiting" && request.status === "Waiting on Client") ||
          request.status === queue;
        const categoryMatch = category === "All" || request.category === category;
        const searchMatch = !q ||
          request.subject.toLowerCase().includes(q) ||
          request.description.toLowerCase().includes(q) ||
          request.requester.toLowerCase().includes(q) ||
          (client?.name ?? "").toLowerCase().includes(q);
        return queueMatch && categoryMatch && searchMatch;
      })
      .sort((a, b) => {
        const priorityRank = { Critical:0, High:1, Medium:2, Low:3 };
        return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) ||
          a.dueDate.localeCompare(b.dueDate);
      });
  }, [category, clientMap, queue, requests, search]);

  const openAdd = () => {
    setForm({ ...BLANK_REQUEST, owner: state.user.name });
    setErrors({});
    setAddOpen(true);
  };

  const openEdit = (request) => {
    const onboarding = parseRequestData(request);
    setForm({
      ...request,
      clientId: request.clientId ? String(request.clientId) : "",
      onboarding: onboarding || request.onboarding || null,
      internalNotes: onboarding || request.source === "onboarding" ? parseInternalNotes(request.notes) : null,
    });
    setErrors({});
    setEditRequest(request);
  };

  const saveAdd = () => {
    const next = { ...form, clientId: Number(form.clientId) };
    const nextErrors = validate(next);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    dispatch({ type:"ADD_SERVICE_REQUEST", request: next });
    toast("Service request received", "!");
    setAddOpen(false);
  };

  const saveEdit = () => {
    const next = {
      ...editRequest,
      ...form,
      clientId: form.clientId ? Number(form.clientId) : null,
      description: form.onboarding ? buildOnboardingDescription(form.onboarding, form.description) : form.description,
      notes: form.internalNotes ? buildInternalNotes(form.internalNotes, form.notes) : form.notes,
    };
    const nextErrors = validate(next);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    dispatch({ type:"UPDATE_SERVICE_REQUEST", request: next });
    toast("Service request updated", "✓");
    setEditRequest(null);
  };

  const closeRequest = (request) => {
    dispatch({ type:"UPDATE_SERVICE_REQUEST", request: { ...request, status:"Resolved" } });
    toast("Request resolved", "✓");
  };

  const approveOnboarding = async (request) => {
    setApprovingId(request.id);
    const approvedAt = new Date().toISOString();
    try {
      const response = await fetch("https://mgucatech.com/api/approve-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, approvedBy: state.user.name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Approval failed");

      const approvalNote = [
        `Approved for onboarding by ${state.user.name} on ${approvedAt.slice(0, 10)}.`,
        `Client portal access granted to ${data.portalUser?.email ?? request.email}.`,
        "Approval email and starter-kit PDF sent.",
      ].join("\n");
      dispatch({
        type:"UPDATE_SERVICE_REQUEST",
        request: {
          ...request,
          status:"Approved",
          owner: request.owner || state.user.name,
          approvedAt,
          approvedBy: state.user.name,
          portalGranted: true,
          portalUser: data.portalUser,
          notes: mergeInternalNotes(request.notes, approvalNote),
        },
      });
      toast("Portal access granted and email sent", "ok");
    } catch (error) {
      toast(error.message || "Could not approve onboarding", "!", "warning");
    } finally {
      setApprovingId(null);
    }
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_SERVICE_REQUEST", id: deleteRequest.id });
    toast("Request deleted", "x", "warning");
    setDeleteRequest(null);
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Service Requests</div>
          <div style={{ color:C.muted, fontSize:14 }}>
            {openRequests.length} open · {critical} critical · {overdue} overdue
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <a href="https://mgucatech.com/consultant-onboarding.html" target="_blank" rel="noreferrer"
            style={{ background:C.successBg, color:C.success, border:`1px solid ${C.success}`, borderRadius:8,
              padding:"9px 14px", fontSize:13, fontWeight:800, cursor:"pointer", textDecoration:"none" }}>
            Internal Onboarding
          </a>
          <button type="button" onClick={openAdd}
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
              padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            + Receive Request
          </button>
          <button type="button" onClick={() => syncOnboardingRequests()}
            style={{ background:C.card, color:C.text, border:`1px solid ${C.border}`, borderRadius:8,
              padding:"9px 14px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            {syncState === "syncing" ? "Syncing..." : "Sync Onboarding"}
          </button>
        </div>
      </div>

      <SegmentTabs tabs={tabs} value={queue} onChange={setQueue} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(150px,1fr))", gap:14, margin:"10px 0 20px" }}>
        {[
          { label:"Open Queue", value:openRequests.length, color:C.accent },
          { label:"Critical", value:critical, color:critical ? C.red : C.muted },
          { label:"Overdue", value:overdue, color:overdue ? C.red : C.muted },
          { label:"Waiting Client", value:waiting, color:waiting ? C.yellow : C.muted },
        ].map(item => (
          <div key={item.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" }}>
            <div style={{ color:C.muted, fontSize:10, fontWeight:800, letterSpacing:.6, textTransform:"uppercase", marginBottom:7 }}>{item.label}</div>
            <div style={{ color:item.color, fontFamily:font.mono, fontSize:24, fontWeight:800 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Search requests, clients, requester..."
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, padding:"8px 14px", fontSize:13, outline:"none",
            flex:"1 1 260px", maxWidth:380 }} />
        <select value={category} onChange={event => setCategory(event.target.value)}
          style={{ ...selectStyle, width:"auto", minWidth:170 }}>
          <option>All</option>
          {REQUEST_CATEGORIES.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))", gap:14 }}>
        {filtered.map(request => {
          const client = clientMap.get(request.clientId);
          const delta = daysUntil(request.dueDate);
          const dueColor = delta < 0 ? C.red : delta === 0 ? C.yellow : C.muted;
          const ob = parseRequestData(request);
          return (
            <article key={request.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20, display:"flex", flexDirection:"column" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:6 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, lineHeight:1.35 }}>{request.subject}</div>
                  <button type="button" onClick={() => client && navigate("client-detail", client.id)}
                    style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer",
                      padding:0, fontSize:12, marginTop:3, textAlign:"left" }}>
                    {client?.name ?? "Unknown relationship"} · {request.requester}
                  </button>
                </div>
                <span style={{ ...requestStatusStyle(request.status), flexShrink:0 }}>{request.status}</span>
              </div>

              {/* Pills */}
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
                <span style={priorityStyle(request.priority)}>{request.priority}</span>
                <span style={pill(C.blue, C.blueBg)}>{request.category}</span>
                <span style={pill(dueColor, C.surface)}>{delta < 0 ? `${Math.abs(delta)}d overdue` : delta === 0 ? "Due today" : formatDateShort(request.dueDate)}</span>
                {request.source === "onboarding"
                  ? <span style={pill(C.purple, C.purpleBg)}>Onboarding</span>
                  : <span style={pill(C.muted, C.subtle)}>{request.channel}</span>}
              </div>

              {/* Structured onboarding data or plain description */}
              <LifecycleBar status={request.status} />
              {ob
                ? <OnboardingGrid onboarding={ob} />
                : request.description
                  ? <p style={{ margin:"0 0 12px", color:C.muted, fontSize:13, lineHeight:1.5 }}>{request.description}</p>
                  : null}

              {/* Approval trail (onboarding) or full notes (other requests) */}
              {ob
                ? <ApprovalTrail notes={request.notes} />
                : request.notes && (
                    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 10px", marginBottom:12 }}>
                      <div style={{ color:C.muted, fontSize:9, fontWeight:800, letterSpacing:.6, textTransform:"uppercase", marginBottom:4 }}>Internal Notes</div>
                      <div style={{ color:C.text, fontSize:12, lineHeight:1.45 }}>{request.notes}</div>
                    </div>
                  )}

              <RequestAuditTrail trail={request.auditTrail} />

              {/* Footer */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginTop:"auto", paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                <span style={{ color:C.muted, fontSize:11 }}>Owner: {request.owner} · {formatDateShort(request.receivedAt?.slice(0, 10))}</span>
                <div style={{ display:"flex", gap:6 }}>
                  {!["Resolved", "Closed"].includes(request.status) && (
                    <button type="button" onClick={() => closeRequest(request)}
                      style={{ background:C.successBg, border:`1px solid ${C.success}`, color:C.success,
                        borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:800, cursor:"pointer" }}>Resolve</button>
                  )}
                  {request.source === "onboarding" && !["Approved", "Resolved", "Closed"].includes(request.status) && (
                    <button type="button" disabled={approvingId === request.id} onClick={() => approveOnboarding(request)}
                      style={{ background:C.successBg, border:`1px solid ${C.success}`, color:C.success,
                        borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:800, cursor:approvingId === request.id ? "wait" : "pointer" }}>
                      {approvingId === request.id ? "Approving…" : "Approve"}
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(request)}
                    style={{ background:C.subtle, border:"none", color:C.muted,
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:800, cursor:"pointer" }}>Edit</button>
                  <button type="button" onClick={() => setDeleteRequest(request)}
                    style={{ background:C.redBg, border:"none", color:C.red,
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:800, cursor:"pointer" }}>Del</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding:48, textAlign:"center", color:C.muted, fontSize:14 }}>No service requests match your filters.</div>
      )}

      {addOpen && (
        <Modal title="Receive Client Service Request" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Receive Request" size="lg">
          <RequestForm form={form} setForm={setForm} errors={errors} clients={state.clients} />
        </Modal>
      )}

      {editRequest && (
        <Modal title={`Edit Request - ${editRequest.subject}`} onClose={() => setEditRequest(null)} onSave={saveEdit} size="lg">
          <RequestForm form={form} setForm={setForm} errors={errors} clients={state.clients} />
        </Modal>
      )}

      {deleteRequest && (
        <Modal title="Delete Service Request" onClose={() => setDeleteRequest(null)} onSave={confirmDelete} saveLabel="Delete" danger>
          <p style={{ color:C.text, margin:0 }}>Delete <strong>{deleteRequest.subject}</strong>?</p>
        </Modal>
      )}
    </div>
  );
}
