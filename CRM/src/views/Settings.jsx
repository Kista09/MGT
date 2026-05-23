import { useState } from "react";
import { C, font } from "../constants";
import { useApp } from "../context";
import { inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { exportCSV } from "../utils";

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

  const [userForm, setUserForm] = useState({ name: user.name, email: user.email });
  const setUser = (k) => (e) => setUserForm(p => ({ ...p, [k]: e.target.value }));

  const saveProfile = () => {
    if (!userForm.name.trim()) { toast("Name is required", "⚠️", "warning"); return; }
    dispatch({ type:"UPDATE_USER", user: { ...userForm, avatar: userForm.name.trim()[0].toUpperCase() } });
    toast("Profile saved", "✓");
  };

  const setNotif = (k) => (val) => {
    dispatch({ type:"UPDATE_SETTINGS", settings: { notifications: { ...settings.notifications, [k]: val } } });
  };

  const setSetting = (k) => (e) => {
    dispatch({ type:"UPDATE_SETTINGS", settings: { [k]: e.target.value } });
  };

  const handleExportAll = () => {
    const data = JSON.stringify({
      clients:  state.clients,
      pipeline: state.pipeline,
      bots:     state.bots,
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
          <Row label="Weekly Report" desc="Summary digest every Monday">
            <Toggle value={settings.notifications.weeklyReport} onChange={setNotif("weeklyReport")} />
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
