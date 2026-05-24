import { useEffect, useMemo, useState } from "react";
import { C, font, pill } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import { formatDateShort, todayISO } from "../utils";

const API_URL = "https://mgucatech.com/api/private-clients";
const CRM_TOKEN_KEY = "mgucatech_crm_access_token";
const TOKEN_KEY = "mgucatech_private_client_token";
const PRIVATE_USER_KEY = "mgucatech_private_client_user";

const BLANK_CLIENT = {
  name: "",
  contact: "",
  sector: "",
  sensitivity: "High",
  status: "Private",
  owner: "",
  nda: "Pending",
  nextReview: todayISO(),
  notes: "",
};

function sensitivityStyle(sensitivity) {
  if (sensitivity === "Critical") return pill("#fff", C.red);
  if (sensitivity === "High") return pill(C.accent, C.accentBg);
  return pill(C.yellow, C.yellowBg);
}

async function privateRequest(payload = null) {
  const token = payload
    ? localStorage.getItem(TOKEN_KEY)
    : localStorage.getItem(CRM_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  const response = await fetch(API_URL, {
    method: payload ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Private client request failed");
  return data;
}

function AccessGate() {
  const { toast } = useApp();
  const [email, setEmail] = useState("organicsmith@gmmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async event => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await privateRequest({ action: "private_login", email, password });
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(PRIVATE_USER_KEY, JSON.stringify(data.user));
      toast("Private clients unlocked", "ok");
      window.dispatchEvent(new CustomEvent("private-clients-updated"));
    } catch (error) {
      toast(error.message ?? "Could not unlock private clients", "!", "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ maxWidth:760, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:24 }}>
        <div style={{ color:C.accent, fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>
          Private access
        </div>
        <div style={{ fontFamily:font.display, fontSize:34, lineHeight:1, marginBottom:10 }}>Private clients</div>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, margin:"0 0 18px" }}>
          This area is separate from normal CRM relationships. Sign in with the private-client credentials before viewing restricted client records.
        </p>
        <form onSubmit={login} style={{ padding:0 }}>
          <FormRow label="Private client email">
            <input
              value={email}
              onChange={event => setEmail(event.target.value)}
              style={inputStyle}
              type="email"
              autoComplete="off"
              spellCheck="false"
              placeholder="organicsmith@gmmail.com"
            />
          </FormRow>
          <FormRow label="Private client password">
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              style={inputStyle}
              type="password"
              autoComplete="new-password"
            />
          </FormRow>
          <button type="submit" disabled={loading}
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:900, cursor:loading ? "wait" : "pointer" }}>
            {loading ? "Unlocking..." : "Unlock Private Clients"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PrivateClientForm({ form, setForm }) {
  const set = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <FormRow label="Client / Codename">
        <input value={form.name} onChange={set("name")} style={inputStyle} />
      </FormRow>
      <FormRow label="Contact">
        <input value={form.contact} onChange={set("contact")} style={inputStyle} />
      </FormRow>
      <FormRow label="Sector">
        <input value={form.sector} onChange={set("sector")} style={inputStyle} />
      </FormRow>
      <FormRow label="Owner">
        <input value={form.owner} onChange={set("owner")} style={inputStyle} />
      </FormRow>
      <FormRow label="Sensitivity">
        <select value={form.sensitivity} onChange={set("sensitivity")} style={selectStyle}>
          {["Critical", "High", "Medium"].map(item => <option key={item}>{item}</option>)}
        </select>
      </FormRow>
      <FormRow label="Private Status">
        <select value={form.status} onChange={set("status")} style={selectStyle}>
          {["Private", "Under NDA", "Active", "Archived"].map(item => <option key={item}>{item}</option>)}
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
        <FormRow label="Private Notes">
          <textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, minHeight:110, resize:"vertical" }} />
        </FormRow>
      </div>
    </div>
  );
}

export default function PrivateClients() {
  const { state, toast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(BLANK_CLIENT);
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState({ approved: false, clients: [] });

  const loadPrivateClients = async () => {
    setLoading(true);
    try {
      const data = await privateRequest();
      setAccessState({ approved: !!data.approved, clients: data.clients ?? [] });
    } catch {
      setAccessState({ approved: false, clients: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivateClients();
    const handler = () => loadPrivateClients();
    window.addEventListener("private-clients-updated", handler);
    return () => window.removeEventListener("private-clients-updated", handler);
  }, []);

  const clients = useMemo(() => accessState.clients ?? [], [accessState.clients]);

  if (loading) {
    return (
      <div style={{ padding:32, overflowY:"auto", flex:1 }}>
        <div style={{ color:C.muted, fontSize:14 }}>Loading private client access...</div>
      </div>
    );
  }

  if (!accessState.approved) return <AccessGate />;

  const openAdd = () => {
    setForm({ ...BLANK_CLIENT, owner: state.user.name });
    setAddOpen(true);
  };

  const openEdit = client => {
    setForm(client);
    setEditClient(client);
  };

  const saveReadOnly = () => {
    toast("Private client storage is read-only until a private database is connected", "!", "warning");
    setAddOpen(false);
    setEditClient(null);
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Private Clients</div>
          <div style={{ color:C.muted, fontSize:14 }}>{clients.length} private records · separate from normal clients</div>
        </div>
        <button type="button" onClick={openAdd}
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:900, cursor:"pointer" }}>
          + Add Private Client
        </button>
      </div>

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
        <Modal title="Add Private Client" onClose={() => setAddOpen(false)} onSave={saveReadOnly} saveLabel="Add Client" size="lg">
          <PrivateClientForm form={form} setForm={setForm} />
        </Modal>
      )}

      {editClient && (
        <Modal title={`Edit Private Client - ${editClient.name}`} onClose={() => setEditClient(null)} onSave={saveReadOnly} size="lg">
          <PrivateClientForm form={form} setForm={setForm} />
        </Modal>
      )}
    </div>
  );
}
