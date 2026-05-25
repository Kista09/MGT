import { useEffect, useMemo, useState } from "react";
import { C, font, CONSULTANT_ROLES, SERVICE_LIFECYCLE, SERVICE_PACKAGES } from "../constants";
import { useApp } from "../context";
import { inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { exportCSV, fmt$ } from "../utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://mgucatech.com";
const apiUrl = path => `${API_BASE}${path}`;

function Section({ title, children }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"20px 24px", marginBottom:20 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:18, paddingBottom:14,
        borderBottom:`1px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"12px 0", borderBottom:`1px solid ${C.border}`, gap:16 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width:44, height:24, borderRadius:99, border:"none", cursor:"pointer",
        background: value ? C.accent : C.subtle, position:"relative", transition:"background .2s" }}>
      <span style={{ position:"absolute", top:3, left: value ? 23 : 3,
        width:18, height:18, borderRadius:99, background:"#fff",
        transition:"left .2s", display:"block" }}/>
    </button>
  );
}

export default function Settings() {
  const { state, dispatch, toast } = useApp();
  const { settings, user } = state;
  const [sectionTab, setSectionTab] = useState("Profile");
  const [emailSearch, setEmailSearch] = useState("");
  const [portalSearch, setPortalSearch] = useState("");
  const [cleanup, setCleanup] = useState({ sourceId:"", targetId:"" });

  const [userForm, setUserForm] = useState({ name: user.name, email: user.email });
  const [consultantForm, setConsultantForm] = useState({ name:"", email:"", role:"Consultant", focus:"" });
  const setUser = (k) => (e) => setUserForm(p => ({ ...p, [k]: e.target.value }));

  const emailLogs = useMemo(() => (state.emailLogs ?? []).filter(log =>
    `${log.recipient} ${log.subject} ${log.status} ${log.relatedRequestNumber}`.toLowerCase().includes(emailSearch.toLowerCase())
  ), [emailSearch, state.emailLogs]);

  const portalUsers = useMemo(() => (state.portalUsers ?? []).filter(user =>
    `${user.email} ${user.clientName} ${user.plan} ${user.status}`.toLowerCase().includes(portalSearch.toLowerCase())
  ), [portalSearch, state.portalUsers]);

  const refreshOpsData = async () => {
    const [emailRes, userRes] = await Promise.all([
      fetch(apiUrl("/api/email-logs")).catch(() => null),
      fetch(apiUrl("/api/portal-users")).catch(() => null),
    ]);
    if (emailRes?.ok) {
      const data = await emailRes.json().catch(() => ({}));
      dispatch({ type:"SET_EMAIL_LOGS", logs:data.logs ?? [] });
    }
    if (userRes?.ok) {
      const data = await userRes.json().catch(() => ({}));
      dispatch({ type:"SET_PORTAL_USERS", users:data.users ?? [] });
    }
  };

  useEffect(() => {
    refreshOpsData().catch(() => {});
  }, []);

  const saveProfile = () => {
    if (!userForm.name.trim()) { toast("Name is required", "⚠️", "warning"); return; }
    dispatch({ type:"UPDATE_USER", user: { ...userForm, avatar: userForm.name.trim()[0].toUpperCase() } });
    toast("Profile saved", "✓");
  };

  const setNotif = (k) => (val) => {
    dispatch({ type:"UPDATE_SETTINGS", settings: { notifications: { ...settings.notifications, [k]: val } } });
  };

  const resetPortalPassword = async (email) => {
    const response = await fetch(apiUrl("/api/portal-users"), {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ action:"reset_password", email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.error || "Password reset failed", "!", "warning");
      return;
    }
    await refreshOpsData();
    window.alert(`New temporary password for ${email}:\n${data.password}`);
    toast("Portal password regenerated", "ok");
  };

  const setSetting = (k) => (e) => {
    dispatch({ type:"UPDATE_SETTINGS", settings: { [k]: e.target.value } });
  };

  const setNestedSetting = (group, key) => (e) => {
    dispatch({ type:"UPDATE_SETTINGS", settings: { [group]: { ...(settings[group] ?? {}), [key]: e.target.value } } });
  };

  const addConsultant = () => {
    if (!consultantForm.name.trim() || !consultantForm.email.includes("@")) {
      toast("Consultant name and email are required", "!", "warning");
      return;
    }
    dispatch({ type:"ADD_CONSULTANT", consultant: consultantForm });
    setConsultantForm({ name:"", email:"", role:"Consultant", focus:"" });
    toast("Consultant added", "ok");
  };

  const handleExportAll = () => {
    const data = JSON.stringify({
      clients:  state.clients,
      pipeline: state.pipeline,
      bots:     state.bots,
      tasks:    state.tasks,
      serviceRequests: state.serviceRequests,
      billing:  state.billing,
      auditLog: state.auditLog,
      emailLogs: state.emailLogs,
      portalUsers: state.portalUsers,
      exportedAt: new Date().toISOString(),
    }, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href:url, download:"mgucatech-crm-export.json" });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast("Data exported", "📥");
  };

  const handleExportClients = () => {
    exportCSV(state.clients, [
      { key:"name",    label:"Company"  },
      { key:"contact", label:"Contact"  },
      { key:"email",   label:"Email"    },
      { key:"plan",    label:"Plan"     },
      { key:"status",  label:"Status"   },
      { key:"mrr",     label:"MRR"      },
      { key:"tag",     label:"Industry" },
      { key:"joined",  label:"Joined"   },
    ], "clients.csv");
    toast("Clients exported", "📥");
  };

  const handleReset = () => {
    if (!window.confirm("Reset all data to defaults? This cannot be undone.")) return;
    localStorage.clear();
    window.location.reload();
  };

  const handleMergeClients = () => {
    const sourceId = Number(cleanup.sourceId);
    const targetId = Number(cleanup.targetId);
    if (!sourceId || !targetId || sourceId === targetId) {
      toast("Choose two different clients", "!", "warning");
      return;
    }
    dispatch({ type:"MERGE_CLIENTS", sourceId, targetId });
    setCleanup({ sourceId:"", targetId:"" });
    toast("Clients merged", "ok");
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Settings</div>
        <div style={{ color:C.muted, fontSize:14 }}>Manage your workspace and preferences</div>
      </div>

      <SegmentTabs
        tabs={[
          { id:"Profile", label:"Profile" },
          { id:"Workspace", label:"Workspace" },
          { id:"Notifications", label:"Notifications", count:Object.values(settings.notifications).filter(Boolean).length },
          { id:"Email Log", label:"Email Log", count:(state.emailLogs ?? []).length },
          { id:"Portal Users", label:"Portal Users", count:(state.portalUsers ?? []).length },
          { id:"Billing", label:"Billing", count:(state.billing ?? []).filter(i => i.status !== "Paid").length },
          { id:"Service", label:"Service" },
          { id:"Consultants", label:"Consultants", count:(state.consultants ?? []).filter(item => item.active).length },
          { id:"Roles", label:"Roles" },
          { id:"Audit", label:"Audit", count:(state.auditLog ?? []).length },
          { id:"Cleanup", label:"Cleanup" },
          { id:"Data", label:"Data" },
          { id:"About", label:"About" },
        ]}
        value={sectionTab}
        onChange={setSectionTab}
      />

      <div style={{ maxWidth:720 }}>
        {/* Profile */}
        {sectionTab === "Profile" && <Section title="Profile">
          <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20 }}>
            <div style={{ width:56, height:56, borderRadius:99, flexShrink:0,
              background:`linear-gradient(135deg,${C.accentDim},${C.accent})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:700, color:"#000" }}>{user.avatar}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:600 }}>{user.name}</div>
              <div style={{ fontSize:12, color:C.muted }}>{user.role}</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:C.muted,
                letterSpacing:.5, textTransform:"uppercase", marginBottom:6 }}>Display Name</label>
              <input value={userForm.name} onChange={setUser("name")} style={inputStyle} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:C.muted,
                letterSpacing:.5, textTransform:"uppercase", marginBottom:6 }}>Email</label>
              <input value={userForm.email} onChange={setUser("email")} style={inputStyle} />
            </div>
          </div>
          <button onClick={saveProfile}
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
              padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Save Profile</button>
        </Section>}

        {/* Workspace */}
        {sectionTab === "Workspace" && <Section title="Workspace">
          <Row label="Company Name">
            <input value={settings.companyName} onChange={setSetting("companyName")}
              style={{ ...inputStyle, width:200 }} />
          </Row>
          <Row label="Currency">
            <select value={settings.currency} onChange={setSetting("currency")} style={{ ...selectStyle, width:120 }}>
              {["ZAR"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Row>
          <Row label="Timezone">
            <select value={settings.timezone} onChange={setSetting("timezone")} style={{ ...selectStyle, width:140 }}>
              {["Africa/Johannesburg"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Row>
          <Row label="Country">
            <input value={settings.country ?? "South Africa"} onChange={setSetting("country")}
              style={{ ...inputStyle, width:200 }} />
          </Row>
        </Section>}

        {/* Notifications */}
        {sectionTab === "Notifications" && <Section title="Notifications">
          <Row label="Bot Alerts" desc="Uptime warnings and performance issues">
            <Toggle value={settings.notifications.botAlerts} onChange={setNotif("botAlerts")} />
          </Row>
          <Row label="Deal Updates" desc="Pipeline stage changes and new deals">
            <Toggle value={settings.notifications.dealUpdates} onChange={setNotif("dealUpdates")} />
          </Row>
          <Row label="Invoice & MRR" desc="Payment confirmations and MRR changes">
            <Toggle value={settings.notifications.invoices} onChange={setNotif("invoices")} />
          </Row>
          <Row label="Service Requests" desc="New client requests and onboarding approvals">
            <Toggle value={settings.notifications.serviceRequests} onChange={setNotif("serviceRequests")} />
          </Row>
          <Row label="Follow-ups" desc="Due and overdue consultant actions">
            <Toggle value={settings.notifications.followUps} onChange={setNotif("followUps")} />
          </Row>
          <Row label="Weekly Report" desc="Summary digest every Monday">
            <Toggle value={settings.notifications.weeklyReport} onChange={setNotif("weeklyReport")} />
          </Row>
          <Row label="Email failures" desc="Approval email bounces, failures, and complaints">
            <Toggle value={settings.notifications.emailFailures} onChange={setNotif("emailFailures")} />
          </Row>
          <Row label="Portal logins" desc="First login and client portal activity">
            <Toggle value={settings.notifications.portalLogins} onChange={setNotif("portalLogins")} />
          </Row>
          <Row label="Missing documents" desc="Warn after 48 hours when onboarding assets are still missing">
            <Toggle value={settings.notifications.missingDocuments} onChange={setNotif("missingDocuments")} />
          </Row>
        </Section>}

        {sectionTab === "Email Log" && <Section title="Email Delivery Log">
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <input value={emailSearch} onChange={event => setEmailSearch(event.target.value)}
              placeholder="Search recipient, subject, SR, status..." style={{ ...inputStyle, flex:1 }} />
            <button onClick={refreshOpsData}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer" }}>
              Refresh
            </button>
            <button onClick={() => exportCSV(emailLogs, [
              { key:"recipient", label:"Recipient" },
              { key:"subject", label:"Subject" },
              { key:"sentAt", label:"Sent At" },
              { key:"status", label:"Status" },
              { key:"resendId", label:"Resend ID" },
              { key:"relatedRequestNumber", label:"Service Request" },
            ], "email-delivery-log.csv")}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer" }}>
              CSV
            </button>
          </div>
          <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            {emailLogs.slice(0, 80).map(log => (
              <div key={log.id || log.resendId} style={{ display:"grid", gridTemplateColumns:"1.4fr 1.2fr .7fr .8fr", gap:10, padding:"10px 12px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:900 }}>{log.recipient}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{log.relatedRequestNumber || "No SR linked"}</div>
                </div>
                <div style={{ fontSize:12, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.subject}</div>
                <div style={{ fontSize:11, color:C.muted }}>{log.sentAt ? new Date(log.sentAt).toLocaleString("en-ZA") : "-"}</div>
                <div>
                  <span style={{ background:["failed","bounced","complained"].includes(log.status) ? C.redBg : C.successBg, color:["failed","bounced","complained"].includes(log.status) ? C.red : C.success, borderRadius:99, padding:"3px 8px", fontSize:10, fontWeight:900, textTransform:"uppercase" }}>
                    {log.status || "sent"}
                  </span>
                </div>
              </div>
            ))}
            {emailLogs.length === 0 && <div style={{ padding:18, color:C.muted, fontSize:13 }}>No email logs found yet.</div>}
          </div>
        </Section>}

        {sectionTab === "Portal Users" && <Section title="Client Portal Users">
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <input value={portalSearch} onChange={event => setPortalSearch(event.target.value)}
              placeholder="Search email, company, plan, status..." style={{ ...inputStyle, flex:1 }} />
            <button onClick={refreshOpsData}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer" }}>
              Refresh
            </button>
          </div>
          {portalUsers.map(portalUser => (
            <Row key={portalUser.email} label={portalUser.email} desc={`${portalUser.clientName || "No company"} - ${portalUser.plan || "No plan"} - approved ${portalUser.approvedAt ? new Date(portalUser.approvedAt).toLocaleDateString("en-ZA") : "unknown"}`}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:C.muted, fontWeight:900 }}>{portalUser.lastLoginAt ? `Last ${new Date(portalUser.lastLoginAt).toLocaleDateString("en-ZA")}` : "Never logged in"}</span>
                <button onClick={() => resetPortalPassword(portalUser.email)}
                  style={{ background:C.accentBg, border:`1px solid ${C.accent}`, color:C.accent, borderRadius:8, padding:"7px 10px", fontSize:11, fontWeight:900, cursor:"pointer" }}>
                  Reset password
                </button>
              </div>
            </Row>
          ))}
          {portalUsers.length === 0 && <div style={{ color:C.muted, fontSize:13 }}>No portal users found yet.</div>}
        </Section>}

        {sectionTab === "Billing" && <Section title="South African Billing">
          <Row label="VAT number" desc="Leave blank until MgucaTECH is VAT registered.">
            <input value={settings.vatNumber ?? ""} onChange={setSetting("vatNumber")}
              placeholder="VAT registration number" style={{ ...inputStyle, width:220 }} />
          </Row>
          <Row label="Banking reference prefix" desc="Used on invoices and EFT notes.">
            <input value={settings.banking?.referencePrefix ?? "MGT"} onChange={setNestedSetting("banking", "referencePrefix")}
              style={{ ...inputStyle, width:120 }} />
          </Row>
          {(state.billing ?? []).map(invoice => {
            const client = state.clients.find(item => item.id === invoice.clientId);
            return (
              <Row key={invoice.id} label={`${client?.name ?? "Unknown client"} - ${invoice.type}`} desc={`${invoice.reference} - due ${invoice.dueDate}`}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ color:invoice.status === "Overdue" ? C.red : C.text, fontFamily:font.mono, fontWeight:800 }}>{fmt$(invoice.amount)}</span>
                  <select value={invoice.status} onChange={event => dispatch({ type:"UPDATE_BILLING", invoice:{ ...invoice, status:event.target.value, paidAt:event.target.value === "Paid" ? new Date().toISOString().slice(0, 10) : invoice.paidAt } })}
                    style={{ ...selectStyle, width:110 }}>
                    {["Draft", "Due", "Paid", "Overdue"].map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </Row>
            );
          })}
        </Section>}

        {sectionTab === "Service" && <Section title="Service Operating System">
          <Row label="Support email">
            <input value={settings.supportEmail ?? "admin@mgucatech.com"} onChange={setSetting("supportEmail")}
              style={{ ...inputStyle, width:240 }} />
          </Row>
          <Row label="Support WhatsApp">
            <input value={settings.supportWhatsApp ?? "+27 76 047 0141"} onChange={setSetting("supportWhatsApp")}
              style={{ ...inputStyle, width:180 }} />
          </Row>
          <Row label="Book Now app URL">
            <input value={settings.bookNowUrl ?? ""} onChange={setSetting("bookNowUrl")}
              style={{ ...inputStyle, width:300 }} />
          </Row>
          <Row label="Client-facing status API" desc="Clients can query onboarding status with their email address.">
            <span style={{ fontFamily:font.mono, color:C.muted, fontSize:11 }}>{apiUrl("/api/client-status?email=client@example.com")}</span>
          </Row>
          <Row label="Default setup fee">
            <input type="number" value={settings.serviceDefaults?.setupFee ?? 3500} onChange={setNestedSetting("serviceDefaults", "setupFee")}
              style={{ ...inputStyle, width:130 }} />
          </Row>
          <Row label="Default monthly support">
            <input type="number" value={settings.serviceDefaults?.monthlySupport ?? 1470} onChange={setNestedSetting("serviceDefaults", "monthlySupport")}
              style={{ ...inputStyle, width:130 }} />
          </Row>
          <div style={{ marginTop:18, display:"grid", gap:10 }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase" }}>Packages in Rands</div>
            {SERVICE_PACKAGES.map(pkg => (
              <div key={pkg.name} style={{ display:"grid", gridTemplateColumns:"90px 90px 90px 1fr", gap:12, alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <strong>{pkg.name}</strong>
                <span style={{ fontFamily:font.mono }}>{pkg.setup ? fmt$(pkg.setup) : "Scoped"}</span>
                <span style={{ fontFamily:font.mono }}>{pkg.monthly ? `${fmt$(pkg.monthly)}/mo` : "Scoped"}</span>
                <span style={{ color:C.muted, fontSize:12 }}>{pkg.fit}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:12, color:C.muted, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:10 }}>Request lifecycle</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {SERVICE_LIFECYCLE.map(stage => (
                <span key={stage} style={{ background:C.accentBg, color:C.accent, border:`1px solid ${C.accentDim}`, borderRadius:99, padding:"5px 9px", fontSize:11, fontWeight:800 }}>{stage}</span>
              ))}
            </div>
          </div>
        </Section>}

        {sectionTab === "Consultants" && <Section title="Consultant Accounts">
          {(state.consultants ?? []).map(consultant => (
            <Row key={consultant.id} label={consultant.name} desc={`${consultant.email} - ${consultant.focus || "No focus set"}`}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <select value={consultant.role} onChange={event => dispatch({ type:"UPDATE_CONSULTANT", consultant:{ ...consultant, role:event.target.value } })}
                  style={{ ...selectStyle, width:130 }}>
                  {CONSULTANT_ROLES.map(role => <option key={role.name}>{role.name}</option>)}
                </select>
                <Toggle value={consultant.active} onChange={active => dispatch({ type:"UPDATE_CONSULTANT", consultant:{ ...consultant, active } })} />
              </div>
            </Row>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 150px", gap:10, marginTop:18 }}>
            <input value={consultantForm.name} onChange={e => setConsultantForm(p => ({ ...p, name:e.target.value }))}
              placeholder="Consultant name" style={inputStyle} />
            <input value={consultantForm.email} onChange={e => setConsultantForm(p => ({ ...p, email:e.target.value }))}
              placeholder="consultant@mgucatech.com" style={inputStyle} />
            <select value={consultantForm.role} onChange={e => setConsultantForm(p => ({ ...p, role:e.target.value }))}
              style={selectStyle}>
              {CONSULTANT_ROLES.map(role => <option key={role.name}>{role.name}</option>)}
            </select>
            <input value={consultantForm.focus} onChange={e => setConsultantForm(p => ({ ...p, focus:e.target.value }))}
              placeholder="Focus area" style={{ ...inputStyle, gridColumn:"1 / 3" }} />
            <button onClick={addConsultant}
              style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
              Add
            </button>
          </div>
        </Section>}

        {sectionTab === "Roles" && <Section title="Role Permissions">
          {CONSULTANT_ROLES.concat([{ name:"Client", focus:"Use the Client Portal only: dashboards, credentials, requests, bookings, and support." }]).map(role => (
            <Row key={role.name} label={role.name} desc={role.focus}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:800 }}>Defined</span>
            </Row>
          ))}
        </Section>}

        {sectionTab === "Audit" && <Section title="Audit Log">
          {(state.auditLog ?? []).slice(0, 30).map(item => (
            <Row key={item.id} label={item.action} desc={`${item.target} - ${new Date(item.time).toLocaleString("en-ZA")}`}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:800 }}>{item.actor}</span>
            </Row>
          ))}
        </Section>}

        {sectionTab === "Cleanup" && <Section title="Data Cleanup Tools">
          <Row label="Merge duplicate clients" desc="Move requests, follow-ups, and billing from one client into another.">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={cleanup.sourceId} onChange={event => setCleanup(prev => ({ ...prev, sourceId:event.target.value }))}
                style={{ ...selectStyle, width:170 }}>
                <option value="">Move from...</option>
                {state.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              <select value={cleanup.targetId} onChange={event => setCleanup(prev => ({ ...prev, targetId:event.target.value }))}
                style={{ ...selectStyle, width:170 }}>
                <option value="">Merge into...</option>
                {state.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              <button onClick={handleMergeClients}
                style={{ background:C.accent, border:"none", color:"#000", borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:900, cursor:"pointer" }}>
                Merge
              </button>
            </div>
          </Row>
          <Row label="Archive test/demo records" desc="Closes requests and marks clients containing test/demo as archived.">
            <button onClick={() => { dispatch({ type:"ARCHIVE_TEST_RECORDS" }); toast("Test/demo records archived", "ok"); }}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:800, cursor:"pointer" }}>
              Archive detected
            </button>
          </Row>
          <Row label="Fix emails and reassignment" desc="Use Client and Request Capture forms to update incorrect email addresses, company names, owners, and consultants.">
            <span style={{ color:C.muted, fontSize:12, fontWeight:800 }}>Available in records</span>
          </Row>
        </Section>}

        {/* Data */}
        {sectionTab === "Data" && <Section title="Data Management">
          <Row label="Export Clients" desc="Download client list as CSV">
            <button onClick={handleExportClients}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text,
                borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>↓ CSV</button>
          </Row>
          <Row label="Export All Data" desc="Full workspace backup as JSON">
            <button onClick={handleExportAll}
              style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text,
                borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>↓ JSON</button>
          </Row>
          <Row label="Storage Readiness" desc="Current CRM persists in this browser. Use a managed database before adding more team members.">
            <span style={{ color:C.yellow, fontSize:12, fontWeight:800 }}>Database recommended</span>
          </Row>
          <Row label="Reset to Defaults" desc="Clear all data and restore sample dataset">
            <button onClick={handleReset}
              style={{ background:C.redBg, border:`1px solid ${C.red}`, color:C.red,
                borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Reset</button>
          </Row>
        </Section>}

        {/* About */}
        {sectionTab === "About" && <Section title="About">
          <Row label="Version"><span style={{ fontFamily:font.mono, fontSize:12, color:C.muted }}>MgucaTECH CRM v3.0</span></Row>
          <Row label="Build"><span style={{ fontFamily:font.mono, fontSize:12, color:C.muted }}>2026.05.22</span></Row>
          <Row label="Data Storage"><span style={{ fontFamily:font.mono, fontSize:12, color:C.muted }}>LocalStorage</span></Row>
        </Section>}
      </div>
    </div>
  );
}
