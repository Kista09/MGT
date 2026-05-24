import { useEffect, useMemo, useState } from "react";
import { C, font, pill } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import { formatDateShort, todayISO } from "../utils";

const API_URL = "https://mgucatech.com/api/confidential-clients";
const TOKEN_KEY = "mgucatech_crm_access_token";

const BLANK_CLIENT = {
  name: "",
  contact: "",
  sector: "",
  sensitivity: "High",
  status: "Restricted",
  owner: "",
  nda: "Pending",
  nextReview: todayISO(),
  notes: "",
};

function canApproveConfidentialAccess(user) {
  const role = String(user?.role ?? "").toLowerCase();
  return ["admin", "executive", "owner", "superadmin", "internal crm"].some(item => role.includes(item)) ||
    user?.email === "admin@mgucatech.com";
}

function sensitivityStyle(sensitivity) {
  if (sensitivity === "Critical") return pill("#fff", C.red);
  if (sensitivity === "High") return pill(C.accent, C.accentBg);
  return pill(C.yellow, C.yellowBg);
}

function AccessGate({ pendingRequest, canApprove }) {
  const { toast } = useApp();
  const [reason, setReason] = useState("");

  const requestAccess = async () => {
    try {
      await confidentialRequest({ action: "request_access", reason });
      toast("Confidential client access requested", "!");
      window.dispatchEvent(new CustomEvent("confidential-access-updated"));
    } catch (error) {
      toast(error.message ?? "Could not request confidential access", "!", "warning");
    }
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ maxWidth:760, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:24 }}>
        <div style={{ color:C.accent, fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>
          Approval required
        </div>
        <div style={{ fontFamily:font.display, fontSize:34, lineHeight:1, marginBottom:10 }}>Confidential clients</div>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, margin:"0 0 18px" }}>
          This tab contains sensitive client records, commercial notes, and restricted relationship context. Request access from an approved CRM user before viewing it.
        </p>
        {pendingRequest ? (
          <div style={{ background:C.yellowBg, border:`1px solid ${C.yellow}`, color:C.yellow, borderRadius:8, padding:"12px 14px", fontSize:13, fontWeight:800 }}>
            Access request pending since {new Date(pendingRequest.requestedAt).toLocaleString("en-ZA")}.
          </div>
        ) : (
          <>
            <FormRow label="Reason for access">
              <textarea value={reason} onChange={event => setReason(event.target.value)}
                placeholder="Example: I need to update onboarding notes for a restricted client."
                style={{ ...inputStyle, minHeight:92, resize:"vertical" }} />
            </FormRow>
            <button type="button" onClick={requestAccess}
              style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:900, cursor:"pointer" }}>
              Request Access
            </button>
          </>
        )}
        {!canApprove && (
          <div style={{ color:C.muted, fontSize:12, marginTop:18 }}>
            Approved users will see your request inside this same tab.
          </div>
        )}
      </div>
    </div>
  );
}

async function confidentialRequest(payload = null) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(API_URL, {
    method: payload ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Confidential client request failed");
  return data;
}

function ConfidentialForm({ form, setForm }) {
  const set = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <FormRow label="Client / Codename">
        <input value={form.name} onChange={set("name")} style={inputStyle} placeholder="Restricted client name or codename" />
      </FormRow>
      <FormRow label="Contact">
        <input value={form.contact} onChange={set("contact")} style={inputStyle} placeholder="Primary contact" />
      </FormRow>
      <FormRow label="Sector">
        <input value={form.sector} onChange={set("sector")} style={inputStyle} placeholder="Financial services, Legal, Healthcare..." />
      </FormRow>
      <FormRow label="Owner">
        <input value={form.owner} onChange={set("owner")} style={inputStyle} />
      </FormRow>
      <FormRow label="Sensitivity">
        <select value={form.sensitivity} onChange={set("sensitivity")} style={selectStyle}>
          {["Critical", "High", "Medium"].map(item => <option key={item}>{item}</option>)}
        </select>
      </FormRow>
      <FormRow label="Access Status">
        <select value={form.status} onChange={set("status")} style={selectStyle}>
          {["Restricted", "Approval Required", "Under NDA", "Active", "Archived"].map(item => <option key={item}>{item}</option>)}
        </select>
      </FormRow>
      <FormRow label="NDA">
        <select value={form.nda} onChange={set("nda")} style={selectStyle}>
          {["Signed", "Pending", "Not required"].map(item => <option key={item}>{item}</option>)}
        </select>
      </FormRow>
      <FormRow label="Next Review">
        <input type="date" value={form.nextReview} onChange={set("nextReview")} style={inputStyle} />
      </FormRow>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Confidential Notes">
          <textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, minHeight:110, resize:"vertical" }} />
        </FormRow>
      </div>
    </div>
  );
}

export default function ConfidentialClients() {
  const { state, toast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(BLANK_CLIENT);
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState({ approved: false, canApprove: false, clients: [], access: { requests: [] }, pendingRequest: null, message: "" });
  const [loadError, setLoadError] = useState("");

  const loadConfidential = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await confidentialRequest();
      setAccessState({
        approved: !!data.approved,
        canApprove: !!data.canApprove,
        clients: data.clients ?? [],
        access: data.access ?? { requests: [] },
        pendingRequest: data.pendingRequest ?? null,
        message: data.message ?? "",
      });
    } catch (error) {
      setLoadError(error.message ?? "Could not load confidential client access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfidential();
    const handler = () => loadConfidential();
    window.addEventListener("confidential-access-updated", handler);
    return () => window.removeEventListener("confidential-access-updated", handler);
  }, []);

  const approved = accessState.approved;
  const canApprove = accessState.canApprove || canApproveConfidentialAccess(state.user);
  const pendingRequests = (accessState.access?.requests ?? []).filter(item => item.status === "Pending");
  const pendingRequest = accessState.pendingRequest || pendingRequests.find(item => item.email === state.user?.email);
  const clients = useMemo(() => accessState.clients ?? [], [accessState.clients]);

  if (loading) {
    return (
      <div style={{ padding:32, overflowY:"auto", flex:1 }}>
        <div style={{ color:C.muted, fontSize:14 }}>Loading confidential access...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding:32, overflowY:"auto", flex:1 }}>
        <div style={{ background:C.redBg, border:`1px solid ${C.red}`, color:C.red, borderRadius:8, padding:14, fontSize:13, fontWeight:800 }}>
          {loadError}
        </div>
      </div>
    );
  }

  if (!approved) return <AccessGate pendingRequest={pendingRequest} canApprove={canApprove} />;

  const openAdd = () => {
    setForm({ ...BLANK_CLIENT, owner: state.user.name });
    setAddOpen(true);
  };

  const openEdit = client => {
    setForm(client);
    setEditClient(client);
  };

  const saveAdd = async () => {
    if (!form.name.trim()) {
      toast("Confidential client name is required", "!", "warning");
      return;
    }
    try {
      const data = await confidentialRequest({ action:"add_client", client: form });
      setAccessState(prev => ({ ...prev, clients: data.clients ?? prev.clients, access: data.access ?? prev.access }));
      toast("Confidential client added", "ok");
      setAddOpen(false);
    } catch (error) {
      toast(error.message ?? "Could not add confidential client", "!", "warning");
    }
  };

  const saveEdit = async () => {
    try {
      const data = await confidentialRequest({ action:"update_client", client: form });
      setAccessState(prev => ({ ...prev, clients: data.clients ?? prev.clients, access: data.access ?? prev.access }));
      toast("Confidential client updated", "ok");
      setEditClient(null);
    } catch (error) {
      toast(error.message ?? "Could not update confidential client", "!", "warning");
    }
  };

  const approveAccess = async request => {
    try {
      const data = await confidentialRequest({ action:"approve_access", requestId: request.id });
      setAccessState(prev => ({ ...prev, access: data.access ?? prev.access, canApprove: !!data.canApprove }));
      toast(`Access approved for ${request.name}`, "ok");
    } catch (error) {
      toast(error.message ?? "Could not approve access", "!", "warning");
    }
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Confidential Clients</div>
          <div style={{ color:C.muted, fontSize:14 }}>{clients.length} restricted records · access controlled</div>
        </div>
        <button type="button" onClick={openAdd}
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:900, cursor:"pointer" }}>
          + Add Confidential Client
        </button>
      </div>

      {accessState.message && (
        <div style={{ background:C.yellowBg, border:`1px solid ${C.yellow}`, color:C.yellow, borderRadius:8, padding:"12px 14px", fontSize:13, fontWeight:800, marginBottom:18 }}>
          {accessState.message}
        </div>
      )}

      {canApprove && pendingRequests.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18, marginBottom:18 }}>
          <div style={{ color:C.accent, fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:"uppercase", marginBottom:10 }}>
            Access approval queue
          </div>
          {pendingRequests.map(request => (
            <div key={request.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, padding:"10px 0", borderTop:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800 }}>{request.name}</div>
                <div style={{ color:C.muted, fontSize:12 }}>{request.email} · {request.role} · {request.reason || "No reason supplied"}</div>
              </div>
              <button type="button" onClick={() => approveAccess(request)}
                style={{ background:C.successBg, border:`1px solid ${C.success}`, color:C.success, borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:900, cursor:"pointer" }}>
                Approve Access
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:14 }}>
        {clients.map(client => (
          <article key={client.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, marginBottom:3 }}>{client.name}</div>
                <div style={{ color:C.muted, fontSize:12 }}>{client.contact} · {client.sector}</div>
              </div>
              <span style={sensitivityStyle(client.sensitivity)}>{client.sensitivity}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 14px", margin:"14px 0" }}>
              {[
                ["Status", client.status],
                ["NDA", client.nda],
                ["Owner", client.owner],
                ["Review", formatDateShort(client.nextReview)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color:C.muted, fontSize:9, fontWeight:900, letterSpacing:.7, textTransform:"uppercase" }}>{label}</div>
                  <div style={{ color:C.text, fontSize:12, fontWeight:700 }}>{value}</div>
                </div>
              ))}
            </div>
            {client.notes && <p style={{ color:C.muted, fontSize:12, lineHeight:1.5, margin:"0 0 14px" }}>{client.notes}</p>}
            <button type="button" onClick={() => openEdit(client)}
              style={{ background:C.subtle, border:"none", color:C.muted, borderRadius:6, padding:"6px 10px", fontSize:11, fontWeight:900, cursor:"pointer" }}>
              Edit
            </button>
          </article>
        ))}
      </div>

      {addOpen && (
        <Modal title="Add Confidential Client" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Add Client" size="lg">
          <ConfidentialForm form={form} setForm={setForm} />
        </Modal>
      )}

      {editClient && (
        <Modal title={`Edit Confidential Client - ${editClient.name}`} onClose={() => setEditClient(null)} onSave={saveEdit} size="lg">
          <ConfidentialForm form={form} setForm={setForm} />
        </Modal>
      )}
    </div>
  );
}
