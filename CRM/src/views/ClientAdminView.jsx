import { useState } from "react";

// Load fonts once
if (!document.querySelector('link[data-ca-fonts]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.setAttribute("data-ca-fonts", "1");
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

const CA_CSS = `
.ca-root{--o:#E8561A;--o2:#F07A46;--obg:#FDF0EB;--bg:#F8F4EF;--sf:#FFFFFF;--cd:#F3ECE3;--cd2:#EDE5DA;--bd:#E8E2DA;--bd2:#D7CCBE;--tx:#1A1A1A;--mt:#6F6258;--ft:#9E9B94;--gn:#1a9948;--gnbg:#E3F5EB;--rd:#B42318;--rdbg:#FFF1F0;--bl:#0C4A4A;--blbg:#E4F2F2;--r:12px;--rs:8px;--rx:5px;font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--tx);min-height:100%;position:relative;flex:1;overflow-y:auto;}
.ca-elephant{position:absolute;bottom:0;right:-4%;width:60%;max-width:720px;opacity:.04;pointer-events:none;z-index:0;filter:grayscale(1);user-select:none;}
.ca-tabnav{display:flex;gap:0;border-bottom:1px solid var(--bd);padding:0 24px;overflow-x:auto;background:var(--sf);position:sticky;top:0;z-index:50;flex-shrink:0;}
.ca-tabnav::-webkit-scrollbar{height:3px;}
.ca-tab{display:flex;align-items:center;gap:8px;padding:14px 18px;border:none;background:none;color:var(--mt);font-family:'DM Sans',system-ui,sans-serif;font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .2s;}
.ca-tab:hover{color:var(--tx);}
.ca-tab.ca-active{color:var(--tx);border-bottom-color:var(--o);}
.ca-tabnum{width:20px;height:20px;border-radius:50%;background:var(--bd2);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--mt);flex-shrink:0;transition:all .2s;}
.ca-tab.ca-active .ca-tabnum{background:var(--o);color:#fff;}
.ca-page{position:relative;z-index:1;padding:32px 32px 72px;max-width:1000px;margin:0 auto;}
.ca-sh{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.ca-snum{width:30px;height:30px;border-radius:50%;background:var(--o);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
.ca-stitle{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;letter-spacing:-.02em;color:var(--tx);}
.ca-srule{flex:1;height:1px;background:linear-gradient(90deg,var(--bd2),transparent);}
.ca-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px;}
.ca-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 18px;}
.ca-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.ca-span2{grid-column:1/-1;}
.ca-field{display:flex;flex-direction:column;gap:6px;}
.ca-field label{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--mt);}
.ca-field label span{color:var(--o);}
.ca-field input,.ca-field select,.ca-field textarea{background:var(--sf);border:1.5px solid var(--bd2);border-radius:var(--rs);padding:10px 13px;font-family:'DM Sans',system-ui,sans-serif;font-size:13.5px;color:var(--tx);transition:border-color .2s,box-shadow .2s;outline:none;width:100%;}
.ca-field input::placeholder,.ca-field textarea::placeholder{color:var(--ft);}
.ca-field input:focus,.ca-field select:focus,.ca-field textarea:focus{border-color:var(--o);box-shadow:0 0 0 3px rgba(232,86,26,.10);}
.ca-field select{appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236F6258'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
.ca-field textarea{resize:vertical;min-height:80px;}
.ca-card{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:22px;}
.ca-kpi{background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:18px 16px;}
.ca-kpi-lbl{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mt);margin-bottom:8px;}
.ca-kpi-val{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:900;color:var(--o);line-height:1;}
.ca-kpi-ch{font-size:11px;font-weight:600;margin-top:5px;}
.ca-up{color:var(--gn);}.ca-dn{color:var(--rd);}.ca-neu{color:var(--mt);}
.ca-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
.ca-po{background:var(--obg);color:var(--o);border:1px solid rgba(232,86,26,.3);}
.ca-pg{background:var(--gnbg);color:var(--gn);border:1px solid rgba(26,153,72,.3);}
.ca-pr{background:var(--rdbg);color:var(--rd);border:1px solid rgba(180,35,24,.3);}
.ca-pb{background:var(--blbg);color:var(--bl);border:1px solid rgba(12,74,74,.3);}
.ca-pm{background:var(--bd);color:var(--mt);border:1px solid var(--bd2);}
.ca-notice{border-radius:var(--rs);padding:12px 16px;font-size:12.5px;line-height:1.6;color:var(--mt);display:flex;gap:10px;align-items:flex-start;}
.ca-no{background:var(--obg);border:1px solid rgba(232,86,26,.25);}
.ca-ng{background:var(--gnbg);border:1px solid rgba(26,153,72,.25);}
.ca-nr{background:var(--rdbg);border:1px solid rgba(180,35,24,.25);}
.ca-nb{background:var(--blbg);border:1px solid rgba(12,74,74,.25);}
.ca-notice-icon{font-size:15px;flex-shrink:0;margin-top:1px;}
.ca-sr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd);}
.ca-sr:last-child{border-bottom:none;}
.ca-sk{font-size:12.5px;color:var(--mt);}
.ca-sv{font-size:13px;font-weight:600;color:var(--tx);}
.ca-prog-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.ca-prog-lbl{font-size:12px;color:var(--mt);width:150px;flex-shrink:0;}
.ca-prog-bar{flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden;}
.ca-prog-fill{height:100%;background:linear-gradient(90deg,var(--o),var(--o2));border-radius:3px;}
.ca-prog-val{font-family:'DM Mono',monospace;font-size:11px;color:var(--tx);width:55px;text-align:right;flex-shrink:0;}
.ca-rec{display:flex;align-items:flex-start;gap:12px;background:var(--cd);border-left:3px solid var(--o);border-radius:0 var(--rs) var(--rs) 0;padding:12px 14px;margin-bottom:8px;}
.ca-rec-tag{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:20px;flex-shrink:0;margin-top:1px;}
.ca-rec-text{font-size:12.5px;color:var(--mt);line-height:1.55;}
.ca-tbl-wrap{border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;}
.ca-tbl-wrap table{width:100%;border-collapse:collapse;}
.ca-tbl-wrap thead tr{background:var(--o);}
.ca-tbl-wrap thead th{padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;text-align:left;}
.ca-tbl-wrap thead th.r{text-align:right;}
.ca-tbl-wrap tbody tr{border-bottom:1px solid var(--bd);}
.ca-tbl-wrap tbody tr:last-child{border-bottom:none;}
.ca-tbl-wrap tbody tr:nth-child(odd){background:var(--sf);}
.ca-tbl-wrap tbody tr:nth-child(even){background:var(--cd);}
.ca-tbl-wrap tbody td{padding:9px 12px;font-size:12.5px;color:var(--mt);}
.ca-tbl-wrap tbody td.val{color:var(--tx);font-family:'DM Mono',monospace;font-size:12px;}
.ca-tbl-wrap tbody td.r{text-align:right;}
.ca-tbl-wrap tbody td.debit{color:var(--rd);font-family:'DM Mono',monospace;font-size:12px;text-align:right;}
.ca-tbl-wrap tbody td.credit{color:var(--gn);font-family:'DM Mono',monospace;font-size:12px;text-align:right;}
.ca-tbl-wrap tbody td.balance{color:var(--tx);font-family:'DM Mono',monospace;font-size:12px;text-align:right;}
.ca-tbl-wrap tbody td.neg{color:var(--rd)!important;}
.ca-tbl-footer{background:var(--rdbg);border-top:1px solid rgba(180,35,24,.3);padding:10px 12px;display:flex;justify-content:space-between;align-items:center;}
.ca-tbl-footer .tfl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mt);}
.ca-tbl-footer .tft{font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--rd);}
.ca-totals{background:var(--cd);border:1px solid var(--bd);border-radius:var(--rs);padding:16px;width:280px;margin-left:auto;}
.ca-tot-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12.5px;}
.ca-tot-row:last-child{border-bottom:none;}
.ca-tot-key{color:var(--mt);}
.ca-tot-val{font-family:'DM Mono',monospace;font-weight:600;}
.ca-tot-grand{background:var(--o);border-radius:var(--rx);display:flex;justify-content:space-between;padding:9px 12px;margin-top:8px;font-weight:700;font-size:13px;color:#fff;}
.ca-tot-grand span:last-child{font-family:'DM Mono',monospace;}
.ca-pay{background:var(--sf);border:1px solid var(--bd);border-radius:var(--rs);padding:18px;}
.ca-pay-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd);}
.ca-pay-row:last-child{border-bottom:none;}
.ca-pay-key{font-size:12px;color:var(--mt);}
.ca-pay-val{font-size:13px;font-weight:600;color:var(--tx);}
.ca-pay-val.orange{color:var(--o);}
.ca-ic-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
.ca-ic{background:var(--sf);border:1px solid var(--bd);border-radius:var(--rs);overflow:hidden;}
.ca-ic-head{background:var(--o);padding:8px 14px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;}
.ca-ic-body{padding:12px 14px;}
.ca-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ca-ac{background:var(--sf);border:2px solid var(--bd);border-radius:var(--rs);padding:16px;cursor:pointer;transition:all .2s;}
.ca-ac:hover,.ca-ac.sel{border-color:var(--o);background:var(--obg);}
.ca-ac-icon{font-size:20px;margin-bottom:8px;}
.ca-ac-name{font-size:13px;font-weight:600;color:var(--tx);margin-bottom:3px;}
.ca-ac-desc{font-size:11px;color:var(--mt);line-height:1.4;}
.ca-mod-row{display:flex;flex-wrap:wrap;gap:8px;}
.ca-mod{padding:6px 14px;border:1.5px solid var(--bd2);border-radius:20px;font-size:12px;color:var(--mt);cursor:pointer;transition:all .15s;user-select:none;}
.ca-mod:hover,.ca-mod.on{background:var(--o);border-color:var(--o);color:#fff;}
.ca-check{display:flex;align-items:center;gap:10px;background:var(--sf);border:1px solid var(--bd);border-radius:var(--rx);padding:9px 12px;cursor:pointer;transition:all .15s;margin-bottom:20px;}
.ca-check:hover,.ca-check.on{border-color:var(--o);background:var(--obg);}
.ca-check input[type=checkbox]{accent-color:var(--o);width:14px;height:14px;}
.ca-check span{font-size:12.5px;color:var(--mt);}
.ca-check.on span{color:var(--tx);}
.ca-emp-card{background:var(--sf);border:1px solid var(--bd);border-radius:var(--rs);padding:16px;margin-bottom:12px;}
.ca-emp-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.ca-emp-num{width:24px;height:24px;border-radius:50%;background:var(--o);font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ca-emp-name{font-size:13px;font-weight:600;color:var(--tx);}
.ca-emp-rm{margin-left:auto;padding:3px 10px;background:var(--rdbg);border:1px solid rgba(180,35,24,.25);border-radius:5px;color:var(--rd);font-size:11px;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.ca-emp-add{display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--obg);border:1px solid rgba(232,86,26,.3);border-radius:var(--rs);color:var(--o);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;transition:all .2s;}
.ca-emp-add:hover{background:rgba(232,86,26,.15);}
.ca-age{background:var(--sf);border:1px solid var(--bd);border-radius:var(--rs);padding:16px;text-align:center;}
.ca-age-lbl{font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--mt);margin-bottom:6px;}
.ca-age-bar{height:5px;border-radius:3px;margin:8px 0 6px;}
.ca-age-val{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:900;}
.ca-btn-row{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid var(--bd);}
.ca-btn-ghost{padding:10px 22px;background:transparent;border:1.5px solid var(--bd2);border-radius:var(--rs);color:var(--mt);font-family:'DM Sans',system-ui,sans-serif;font-size:13px;cursor:pointer;transition:all .2s;}
.ca-btn-ghost:hover{border-color:var(--o);color:var(--tx);}
.ca-btn-pri{padding:10px 28px;background:linear-gradient(135deg,var(--o),var(--o2));border:none;border-radius:var(--rs);color:#fff;font-family:'DM Sans',system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(232,86,26,.25);transition:all .2s;}
.ca-btn-pri:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 22px rgba(232,86,26,.35);}
.ca-btn-pri:disabled{opacity:.5;cursor:not-allowed;}
.ca-ov{position:fixed;inset:0;background:rgba(26,26,26,.5);z-index:300;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;}
.ca-ov-box{background:var(--sf);border:1px solid var(--bd);border-radius:20px;padding:44px 36px;text-align:center;max-width:400px;width:90%;box-shadow:0 8px 48px rgba(26,26,26,.15);}
.ca-ov-icon{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--o),var(--o2));display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;box-shadow:0 4px 20px rgba(232,86,26,.3);}
.ca-ov-title{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:900;margin-bottom:8px;color:var(--tx);}
.ca-ov-sub{font-size:13px;color:var(--mt);margin-bottom:20px;line-height:1.6;}
.ca-ref{background:var(--obg);border:1px solid rgba(232,86,26,.3);border-radius:10px;padding:12px 20px;margin-bottom:20px;}
.ca-ref-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--o);margin-bottom:4px;}
.ca-ref-code{font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:var(--tx);letter-spacing:.1em;}
@media(max-width:680px){.ca-g2,.ca-g3,.ca-g4{grid-template-columns:1fr;}.ca-span2{grid-column:1;}.ca-ic-grid{grid-template-columns:1fr;}.ca-access-grid{grid-template-columns:1fr;}.ca-totals{width:100%;}.ca-page{padding:20px 16px 56px;}.ca-tabnav{padding:0 8px;}.ca-tab{padding:12px 12px;font-size:11px;}}
`;

const MODS = ["Client Portal","WhatsApp Automation","Booking Workflow","Analytics Dashboard","Contracts & Docs","Invoices & Billing","CRM Access","Compliance Module"];

const TABS = [
  { id:"report",    num:"01", label:"Client Report" },
  { id:"client",   num:"02", label:"Client Details" },
  { id:"access",   num:"03", label:"Grant Access" },
  { id:"employees",num:"04", label:"Employee List" },
  { id:"invoice",  num:"05", label:"Invoice" },
  { id:"statement",num:"06", label:"Statement" },
];

function SecHead({ num, title, children }) {
  return (
    <div className="ca-sh">
      <div className="ca-snum" style={String(num).length > 2 ? { fontSize: 10 } : {}}>{num}</div>
      <div className="ca-stitle">{title}</div>
      <div className="ca-srule" />
      {children}
    </div>
  );
}

function StatRow({ label, value, style }) {
  return (
    <div className="ca-sr">
      <span className="ca-sk">{label}</span>
      <span className="ca-sv" style={style}>{value}</span>
    </div>
  );
}

function ProgBar({ label, value, color }) {
  return (
    <div className="ca-prog-row">
      <span className="ca-prog-lbl">{label}</span>
      <div className="ca-prog-bar">
        <div className="ca-prog-fill" style={{ width: value, ...(color ? { background: color } : {}) }} />
      </div>
      <span className="ca-prog-val">{value}</span>
    </div>
  );
}

function EmpRow({ num, onRemove }) {
  const [name, setName] = useState("New Employee");
  const [active, setActive] = useState(new Set());
  const toggle = (m) => setActive(p => { const n = new Set(p); n.has(m) ? n.delete(m) : n.add(m); return n; });
  return (
    <div className="ca-emp-card">
      <div className="ca-emp-head">
        <div className="ca-emp-num">{num}</div>
        <span className="ca-emp-name">{name || "New Employee"}</span>
        {onRemove && <button className="ca-emp-rm" onClick={onRemove}>Remove</button>}
      </div>
      <div className="ca-g2" style={{ marginBottom: 12 }}>
        <div className="ca-field"><label>Full Name <span>*</span></label><input type="text" placeholder="John Nkosi" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="ca-field"><label>Work Email <span>*</span></label><input type="email" placeholder="john@company.co.za" /></div>
        <div className="ca-field"><label>Job Title</label><input type="text" placeholder="e.g. Account Manager" /></div>
        <div className="ca-field"><label>Access Role</label>
          <select><option value="">Select role…</option>{["Admin","Manager","Standard User","Read-Only","External Reviewer"].map(r => <option key={r}>{r}</option>)}</select>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--mt)", marginBottom: 8 }}>Module Access</div>
      <div className="ca-mod-row">
        {MODS.map(m => <div key={m} className={`ca-mod${active.has(m) ? " on" : ""}`} onClick={() => toggle(m)}>{m}</div>)}
      </div>
    </div>
  );
}

const CRM_API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const CRM_TOKEN_KEY = "mgucatech_crm_access_token";

export default function ClientAdminView() {
  const [tab, setTab] = useState("report");
  const [employees, setEmployees] = useState([{ id: 1 }]);
  const [nextId, setNextId] = useState(2);
  const [selAccess, setSelAccess] = useState(null);
  const [activeMods, setActiveMods] = useState(new Set());
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [cd, setCd] = useState({ firstName: "", lastName: "", company: "", sector: "", email: "", phone: "", city: "", idType: "", idNumber: "", notes: "", consent: false });
  const [ga, setGa] = useState({ name: "", email: "", notification: "", expiry: "", notes: "", consent: false });
  const [ea, setEa] = useState({ company: "", dept: "", manager: "", consent: false });

  const addEmp = () => { setEmployees(p => [...p, { id: nextId }]); setNextId(p => p + 1); };
  const removeEmp = (id) => setEmployees(p => p.filter(e => e.id !== id));
  const toggleMod = (m) => setActiveMods(p => { const n = new Set(p); n.has(m) ? n.delete(m) : n.add(m); return n; });

  const submitAdminForm = async (subject, category, description, priority = "Medium", extra = {}) => {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem(CRM_TOKEN_KEY) || "";
      const res = await fetch(`${CRM_API_BASE}/api/client-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "admin_form_request", subject, category, priority, description, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSuccess({ msg: "Request submitted successfully.", ref: data.request?.requestNumber || data.request?.id });
    } catch (err) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ca-root">
      <style>{CA_CSS}</style>

      {/* Elephant watermark */}
      <svg className="ca-elephant" viewBox="0 0 1400 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="510" cy="540" rx="310" ry="210" fill="#888"/><ellipse cx="775" cy="355" rx="155" ry="160" fill="#8a8a8a"/>
        <ellipse cx="920" cy="310" rx="170" ry="200" fill="#737373"/><ellipse cx="898" cy="330" rx="120" ry="150" fill="#8f8f8f" opacity=".6"/>
        <ellipse cx="868" cy="178" rx="50" ry="30" fill="#7a7a7a" opacity=".8"/>
        <polygon points="820,450 850,460 865,530 900,610 890,700 870,790 840,870 820,920 800,920 780,870 800,790 820,700 820,610 795,530 775,460 790,450" fill="#7a7a7a"/>
        <ellipse cx="812" cy="922" rx="28" ry="14" fill="#707070"/>
        <circle cx="808" cy="243" r="8" fill="#202020" opacity=".9"/><circle cx="814" cy="247" r="3" fill="#fff" opacity=".6"/>
        <polygon points="825,460 840,465 810,550 770,620 740,680 720,700 710,690 728,666 758,608 798,538 822,448" fill="#c8c0a8" opacity=".85"/>
        <rect x="260" y="650" width="90" height="110" rx="6" fill="#757575"/><rect x="370" y="670" width="90" height="110" rx="6" fill="#757575"/>
        <rect x="490" y="650" width="90" height="110" rx="6" fill="#757575"/><rect x="610" y="640" width="90" height="110" rx="6" fill="#757575"/>
        <ellipse cx="305" cy="765" rx="52" ry="12" fill="#686868"/><ellipse cx="415" cy="782" rx="52" ry="12" fill="#686868"/>
        <ellipse cx="535" cy="762" rx="52" ry="12" fill="#686868"/><ellipse cx="655" cy="752" rx="52" ry="12" fill="#686868"/>
        <polygon points="210,440 200,440 175,500 165,560 162,600 168,610 178,600 182,562 190,504 215,445" fill="#727272"/>
      </svg>

      {/* Tab nav */}
      <div className="ca-tabnav">
        {TABS.map(t => (
          <button key={t.id} className={`ca-tab${tab === t.id ? " ca-active" : ""}`} onClick={() => setTab(t.id)}>
            <span className="ca-tabnum">{t.num}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Client Report ── */}
      {tab === "report" && (
        <div className="ca-page">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Client Performance Report · April 2026</div>
              <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 30, fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.1, color: "var(--tx)" }}>Monthly <em style={{ color: "var(--o)" }}>Review.</em></h1>
              <p style={{ fontSize: 13, color: "var(--mt)", marginTop: 6 }}>Tech Co. (Pty) Ltd · Keys Mokoena · 01–30 April 2026</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="ca-pill ca-pm">RPT-2026-APR-019</span>
              <span className="ca-pill ca-po">Cape Town</span>
              <span className="ca-pill ca-pb">Financial Services</span>
            </div>
          </div>

          <div className="ca-g4" style={{ marginBottom: 28 }}>
            {[["Active Users","12","▲ +2 MoM","ca-up"],["Sessions","847","▲ +18%","ca-up"],["Uptime","99.8%","— stable","ca-neu"],["CSAT Score","4.7/5","▲ +0.2","ca-up"]].map(([l,v,c,cls]) => (
              <div key={l} className="ca-kpi"><div className="ca-kpi-lbl">{l}</div><div className="ca-kpi-val" style={{ fontSize: 22 }}>{v}</div><div className={`ca-kpi-ch ${cls}`}>{c}</div></div>
            ))}
          </div>

          <SecHead num="01" title="Executive Summary" />
          <div className="ca-card" style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13.5, color: "var(--mt)", lineHeight: 1.75 }}>
              Tech Co. had a <strong style={{ color: "var(--tx)" }}>strong month in April 2026</strong> across all MgucaTech-powered services. WhatsApp automation handled <strong style={{ color: "var(--o)" }}>623 customer interactions</strong> with a <strong style={{ color: "var(--o)" }}>94% resolution rate</strong>, reducing manual workload significantly. The booking workflow processed <strong style={{ color: "var(--tx)" }}>184 appointments</strong> with zero scheduling conflicts. Client portal adoption grew <strong style={{ color: "var(--gn)" }}>18% month-on-month</strong>, with 12 active staff users logging 847 sessions. One outstanding invoice <strong style={{ color: "var(--rd)" }}>(R 8,900)</strong> requires attention.
            </p>
          </div>

          <SecHead num="02" title="Usage & Engagement" />
          <div className="ca-g3" style={{ marginBottom: 28 }}>
            {[["Portal Sessions","847","+18% MoM","ca-up"],["Page Views","4,312","+22% MoM","ca-up"],["Avg. Session","6m 42s","−4% MoM","ca-dn"],["Docs Accessed","138","+9% MoM","ca-up"],["Reports Downloaded","34","New this month","ca-neu"],["Support Tickets","3","All resolved","ca-up"]].map(([l,v,c,cls]) => (
              <div key={l} className="ca-kpi"><div className="ca-kpi-lbl">{l}</div><div className="ca-kpi-val" style={{ fontSize: 20 }}>{v}</div><div className={`ca-kpi-ch ${cls}`}>{c}</div></div>
            ))}
          </div>

          <div className="ca-g2" style={{ marginBottom: 28 }}>
            <div>
              <SecHead num="03" title="WhatsApp Automation" />
              <div className="ca-card">
                <StatRow label="Total Messages Sent" value="623" />
                <StatRow label="Auto-resolved (No Agent)" value="587 (94.2%)" style={{ color: "var(--gn)" }} />
                <StatRow label="Avg. Response Time" value="< 8 seconds" />
                <StatRow label="Escalated to Human" value="36 (5.8%)" />
                <StatRow label="Opt-outs" value="2" />
                <StatRow label="New Subscribers" value="47" style={{ color: "var(--gn)" }} />
                <div style={{ marginTop: 16 }}>
                  <ProgBar label="Resolution Rate" value="94.2%" />
                  <ProgBar label="Subscriber Growth" value="72%" />
                </div>
              </div>
            </div>
            <div>
              <SecHead num="04" title="Booking & Appointments" />
              <div className="ca-card">
                <StatRow label="Appointments Booked" value="184" />
                <StatRow label="Completed" value="171 (92.9%)" style={{ color: "var(--gn)" }} />
                <StatRow label="Cancelled" value="9 (4.9%)" />
                <StatRow label="No-Show" value="4 (2.2%)" style={{ color: "var(--rd)" }} />
                <StatRow label="Avg. Lead Time" value="2.3 days" />
                <StatRow label="Top Channel" value="WhatsApp Bot" />
                <div style={{ marginTop: 16 }}>
                  <ProgBar label="Completion Rate" value="92.9%" />
                  <ProgBar label="No-Show Rate" value="2.2%" color="var(--rd)" />
                </div>
              </div>
            </div>
          </div>

          <SecHead num="05" title="Financial Overview" />
          <div className="ca-g4" style={{ marginBottom: 28 }}>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Invoiced</div><div className="ca-kpi-val" style={{ fontSize: 18 }}>R 11,650</div><div className="ca-kpi-ch ca-neu">This month</div></div>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Received</div><div className="ca-kpi-val" style={{ fontSize: 18, color: "var(--gn)" }}>R 4,250</div><div className="ca-kpi-ch ca-up">EFT cleared</div></div>
            <div className="ca-kpi" style={{ borderColor: "rgba(180,35,24,.3)", background: "rgba(180,35,24,.04)" }}><div className="ca-kpi-lbl">Outstanding</div><div className="ca-kpi-val" style={{ fontSize: 18, color: "var(--rd)" }}>R 8,900</div><div className="ca-kpi-ch ca-dn">Overdue</div></div>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Next Due</div><div className="ca-kpi-val" style={{ fontSize: 16, color: "var(--o)" }}>28 Jun</div><div className="ca-kpi-ch ca-neu">2026</div></div>
          </div>

          <SecHead num="06" title="Recommendations & Next Steps" />
          {[
            { bc:"var(--rd)", tbg:"rgba(180,35,24,.12)", tc:"var(--rd)", tbdr:"rgba(180,35,24,.3)", tag:"Priority", text:"Settle outstanding invoice (R 8,900) before 28 June to avoid late payment fees and potential service suspension." },
            { bc:"var(--bl)", tbg:"rgba(12,74,74,.12)",  tc:"var(--bl)", tbdr:"rgba(12,74,74,.3)",  tag:"Growth",   text:"Upgrade to the Business Tier to unlock an additional 5,000 WhatsApp broadcast credits per month." },
            { bc:"var(--gn)", tbg:"rgba(26,153,72,.12)", tc:"var(--gn)", tbdr:"rgba(26,153,72,.3)", tag:"Optimise", text:"Enable automated appointment reminders — projected to reduce no-shows by ~60% based on sector benchmarks." },
            { bc:"var(--bd2)",tbg:"var(--cd)",           tc:"var(--mt)", tbdr:"var(--bd2)",          tag:"Review",   text:"3 support tickets were resolved this month. Schedule a 30-min check-in to review any recurring issues." },
            { bc:"var(--o)",  tbg:"rgba(232,86,26,.12)", tc:"var(--o)",  tbdr:"rgba(232,86,26,.3)", tag:"Explore",  text:"Peak portal usage is 08:00–10:00 SAST. Consider scheduling automated report deliveries at 07:30 for maximum visibility." },
          ].map(({ bc,tbg,tc,tbdr,tag,text }) => (
            <div key={tag} className="ca-rec" style={{ borderLeftColor: bc }}>
              <span className="ca-rec-tag" style={{ background: tbg, color: tc, border: `1px solid ${tbdr}` }}>{tag}</span>
              <p className="ca-rec-text">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 2: Client Details ── */}
      {tab === "client" && (
        <div className="ca-page">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Form 01</div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 28, fontWeight: 900, letterSpacing: "-.02em", color: "var(--tx)" }}>Client <em style={{ color: "var(--o)" }}>Details</em> Form.</h1>
            <p style={{ fontSize: 13, color: "var(--mt)", marginTop: 6 }}>Capture essential client information for onboarding and portal setup.</p>
          </div>
          <SecHead num="01" title="Organisation & Contact" />
          <div className="ca-g2" style={{ marginBottom: 24 }}>
            <div className="ca-field"><label>First Name <span>*</span></label><input type="text" placeholder="e.g. Sarah" value={cd.firstName} onChange={e => setCd(p => ({ ...p, firstName: e.target.value }))} /></div>
            <div className="ca-field"><label>Last Name <span>*</span></label><input type="text" placeholder="e.g. Dlamini" value={cd.lastName} onChange={e => setCd(p => ({ ...p, lastName: e.target.value }))} /></div>
            <div className="ca-field"><label>Company / Practice Name</label><input type="text" placeholder="e.g. Meridian Holdings" /></div>
            <div className="ca-field"><label>Sector <span>*</span></label><select><option value="">Select sector…</option>{["Healthcare","Financial Services","Retail","Education","Legal","Real Estate","Other"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="ca-field"><label>Client Type <span>*</span></label><select><option value="">Select type…</option>{["Individual","Corporate","Trust / Entity","Government","Non-Profit"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="ca-field"><label>Email Address <span>*</span></label><input type="email" placeholder="sarah@company.co.za" /></div>
            <div className="ca-field"><label>Phone Number <span>*</span></label><input type="tel" placeholder="+27 82 000 0000" /></div>
            <div className="ca-field"><label>WhatsApp Number</label><input type="tel" placeholder="If different from phone" /></div>
            <div className="ca-field"><label>Date of Birth</label><input type="date" /></div>
            <div className="ca-field ca-span2"><label>Street Address</label><input type="text" placeholder="123 Long Street" /></div>
            <div className="ca-field"><label>City</label><input type="text" placeholder="e.g. Cape Town" /></div>
            <div className="ca-field"><label>Country</label><select><option value="">Select…</option>{["South Africa","Botswana","Namibia","Zimbabwe","Kenya","Nigeria","United Kingdom","United States"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="ca-field ca-span2"><label>How did you hear about us?</label><select><option value="">Select…</option>{["Referral","LinkedIn","Google Search","WhatsApp","Event / Conference","Other"].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <SecHead num="02" title="Identity Verification" />
          <div className="ca-notice ca-no" style={{ marginBottom: 16 }}><span className="ca-notice-icon">🔒</span><span>All identity information is encrypted and stored in compliance with POPIA. Never shared with third parties without written consent.</span></div>
          <div className="ca-g2" style={{ marginBottom: 24 }}>
            <div className="ca-field"><label>ID / Document Type <span>*</span></label><select><option value="">Select…</option>{["SA National ID Card","Passport","Driver's Licence","Company Registration No.","Trust Deed No."].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="ca-field"><label>Document Number <span>*</span></label><input type="text" placeholder="Enter exactly as it appears" /></div>
            <div className="ca-field"><label>Tax / VAT Number</label><input type="text" placeholder="Optional" /></div>
          </div>
          <SecHead num="03" title="Portal Setup Notes" />
          <div className="ca-field" style={{ marginBottom: 24 }}><label>Additional Notes / Special Requirements</label><textarea placeholder="Any context about this client, special requirements, packages requested…" /></div>
          <SecHead num="04" title="Declaration & Consent" />
          <div className="ca-notice ca-no" style={{ marginBottom: 16 }}><span className="ca-notice-icon">📋</span><span>I confirm the information provided is accurate. I consent to MgucaTech Solutions storing and processing my personal data for client portal setup and service delivery, in accordance with POPIA and the MgucaTech Privacy Policy.</span></div>
          <label className={`ca-check${cd.consent ? " on" : ""}`} style={{ display: "flex" }}>
            <input type="checkbox" checked={cd.consent} onChange={e => setCd(p => ({ ...p, consent: e.target.checked }))} />
            <span>I have read and agree to the above declaration.</span>
          </label>
          {error && tab === "client" && <p style={{ color: "var(--rd)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <div className="ca-btn-row">
            <button className="ca-btn-ghost" onClick={() => setCd(p => ({ ...p, consent: false }))}>Clear Form</button>
            <button className="ca-btn-pri" disabled={!cd.consent || submitting} onClick={() => submitAdminForm(
              `New client details: ${cd.firstName} ${cd.lastName}`.trim() || "New client details",
              "Client Details",
              `Client details form submitted from CRM admin panel.\n\nName: ${cd.firstName} ${cd.lastName}\nCompany: ${cd.company}\nSector: ${cd.sector}\nEmail: ${cd.email}\nPhone: ${cd.phone}\nCity: ${cd.city}\nID Type: ${cd.idType}\nID Number: ${cd.idNumber}\nNotes: ${cd.notes || "None"}`,
              "Medium"
            )}>{submitting ? "Submitting…" : "Save Client Record →"}</button>
          </div>
        </div>
      )}

      {/* ── Tab 3: Grant Access ── */}
      {tab === "access" && (
        <div className="ca-page">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Form 02</div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 28, fontWeight: 900, letterSpacing: "-.02em", color: "var(--tx)" }}>Grant Portal <em style={{ color: "var(--o)" }}>Access.</em></h1>
            <p style={{ fontSize: 13, color: "var(--mt)", marginTop: 6 }}>Authorise a private client's access to selected portal modules and services.</p>
          </div>
          <SecHead num="01" title="Client Identification" />
          <div className="ca-g2" style={{ marginBottom: 24 }}>
            <div className="ca-field"><label>Client Full Name <span>*</span></label><input type="text" placeholder="As registered in the system" value={ga.name} onChange={e => setGa(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="ca-field"><label>Client Email <span>*</span></label><input type="email" placeholder="Portal login email" value={ga.email} onChange={e => setGa(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="ca-field"><label>Existing Client Reference ID</label><input type="text" placeholder="CD-XXXXXXXX (from client details form)" /></div>
            <div className="ca-field"><label>Notification Method</label><select><option value="">Notify client via…</option>{["Email","WhatsApp","Both","Do not notify"].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <SecHead num="02" title="Access Level" />
          <div className="ca-access-grid" style={{ marginBottom: 24 }}>
            {[["👁","View Only","Read-only on all assigned modules"],["✦","Standard","View, download and comment"],["⬡","Full Access","Edit, upload and manage"],["⚡","Administrator","Full control + team management"]].map(([icon,name,desc]) => (
              <div key={name} className={`ca-ac${selAccess === name ? " sel" : ""}`} onClick={() => setSelAccess(name)}>
                <div className="ca-ac-icon">{icon}</div>
                <div className="ca-ac-name">{name}</div>
                <div className="ca-ac-desc">{desc}</div>
              </div>
            ))}
          </div>
          <SecHead num="03" title="Portal Module Permissions" />
          <div className="ca-mod-row" style={{ marginBottom: 24 }}>
            {MODS.map(m => <div key={m} className={`ca-mod${activeMods.has(m) ? " on" : ""}`} onClick={() => toggleMod(m)}>{m}</div>)}
          </div>
          <div className="ca-g2" style={{ marginBottom: 24 }}>
            <div className="ca-field"><label>Access Expiry Date</label><input type="date" /></div>
            <div className="ca-field"><label>Authorised By <span>*</span></label><input type="text" placeholder="Staff member granting access" /></div>
            <div className="ca-field ca-span2"><label>Internal Notes</label><textarea placeholder="Reason for access, special conditions…" /></div>
          </div>
          <SecHead num="04" title="Authorisation" />
          <div className="ca-notice ca-no" style={{ marginBottom: 16 }}><span className="ca-notice-icon">📋</span><span>I am authorised to grant this access level and confirm the client has been verified per MgucaTech's onboarding policy and data protection requirements.</span></div>
          <label className={`ca-check${ga.consent ? " on" : ""}`} style={{ display: "flex" }}>
            <input type="checkbox" checked={ga.consent} onChange={e => setGa(p => ({ ...p, consent: e.target.checked }))} />
            <span>I confirm the above declaration and authorise this access grant.</span>
          </label>
          {error && tab === "access" && <p style={{ color: "var(--rd)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <div className="ca-btn-row">
            <button className="ca-btn-ghost" onClick={() => setGa(p => ({ ...p, consent: false }))}>Clear</button>
            <button className="ca-btn-pri" disabled={!ga.consent || submitting} onClick={() => submitAdminForm(
              `Grant portal access: ${ga.name || "New user"}`,
              "Access Request",
              `Portal access request submitted from CRM admin panel.\n\nName: ${ga.name}\nEmail: ${ga.email}\nAccess Level: ${selAccess || "Not selected"}\nModules: ${[...activeMods].join(", ") || "None selected"}\nNotification: ${ga.notification || "Not specified"}\nExpiry: ${ga.expiry || "No expiry"}\nNotes: ${ga.notes || "None"}`,
              "High",
              { targetEmail: ga.email, targetName: ga.name, targetAccessLevel: selAccess }
            )}>{submitting ? "Submitting…" : "Grant Access →"}</button>
          </div>
        </div>
      )}

      {/* ── Tab 4: Employee List ── */}
      {tab === "employees" && (
        <div className="ca-page">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Form 03</div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 28, fontWeight: 900, letterSpacing: "-.02em", color: "var(--tx)" }}>Employee Portal <em style={{ color: "var(--o)" }}>Access List.</em></h1>
            <p style={{ fontSize: 13, color: "var(--mt)", marginTop: 6 }}>Register all team members authorised to use the MgucaTech client portal.</p>
          </div>
          <SecHead num="01" title="Organisation Details" />
          <div className="ca-g2" style={{ marginBottom: 24 }}>
            <div className="ca-field"><label>Company / Organisation <span>*</span></label><input type="text" placeholder="e.g. Meridian Holdings" /></div>
            <div className="ca-field"><label>Department / Team</label><input type="text" placeholder="e.g. Operations" /></div>
            <div className="ca-field"><label>Submission Date</label><input type="date" /></div>
            <div className="ca-field"><label>Authorised Manager <span>*</span></label><input type="text" placeholder="Full name" /></div>
          </div>
          <SecHead num="02" title="Employee Register"><button className="ca-emp-add" onClick={addEmp}>+ Add Employee</button></SecHead>
          <div style={{ marginBottom: 24 }}>
            {employees.map((e, i) => <EmpRow key={e.id} num={i + 1} onRemove={employees.length > 1 ? () => removeEmp(e.id) : null} />)}
          </div>
          <div className="ca-notice ca-no" style={{ marginBottom: 16 }}><span className="ca-notice-icon">📋</span><span>I confirm all listed employees are authorised to access the portal and have been briefed on data confidentiality and acceptable use policies.</span></div>
          <label className={`ca-check${ea.consent ? " on" : ""}`} style={{ display: "flex" }}>
            <input type="checkbox" checked={ea.consent} onChange={e => setEa(p => ({ ...p, consent: e.target.checked }))} />
            <span>I have read and agree to the above declaration.</span>
          </label>
          {error && tab === "employees" && <p style={{ color: "var(--rd)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <div className="ca-btn-row">
            <button className="ca-btn-pri" disabled={!ea.consent || submitting} onClick={() => {
              const empList = employees.map((e, i) => `  ${i + 1}. Employee ${e.id}`).join("\n");
              submitAdminForm(
                `Employee portal access: ${ea.company || "Company"}`,
                "Team Access",
                `Employee access list submitted from CRM admin panel.\n\nCompany: ${ea.company}\nDepartment: ${ea.dept || "Not specified"}\nAuthorised Manager: ${ea.manager || "Not specified"}\nEmployee Count: ${employees.length}\n\nEmployees:\n${empList}`,
                "Medium"
              );
            }}>{submitting ? "Submitting…" : "Submit Employee List →"}</button>
          </div>
        </div>
      )}

      {/* ── Tab 5: Invoice ── */}
      {tab === "invoice" && (
        <div className="ca-page">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Tax Invoice</div>
              <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 700, letterSpacing: ".02em", color: "var(--tx)" }}>INV-2026-052</h1>
              <p style={{ fontSize: 12, color: "var(--mt)", marginTop: 6 }}>Issue Date: 29 May 2026 · Due: 28 June 2026 · VAT Reg: 4180123456</p>
            </div>
            <span className="ca-pill ca-pr" style={{ fontSize: 12, padding: "6px 16px" }}>UNPAID</span>
          </div>
          <div className="ca-ic-grid">
            <div className="ca-ic"><div className="ca-ic-head">Billed To</div><div className="ca-ic-body">
              <StatRow label="Company" value="Tech Co. (Pty) Ltd" /><StatRow label="Contact" value="Keys Mokoena" />
              <StatRow label="Email" value="keys@techco.co.za" /><StatRow label="Address" value="14 Long St, Cape Town" />
              <StatRow label="VAT No." value="4290000001" />
            </div></div>
            <div className="ca-ic"><div className="ca-ic-head">From</div><div className="ca-ic-body">
              <StatRow label="Company" value="MgucaTech Solutions" /><StatRow label="Contact" value="Admin Team" />
              <StatRow label="Email" value="admin@mgucatech.com" /><StatRow label="Address" value="Cape Town, South Africa" />
              <StatRow label="VAT No." value="4180123456" />
            </div></div>
          </div>
          <SecHead num="SVC" title="Services Rendered" />
          <div className="ca-tbl-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead><tr><th>#</th><th>Description</th><th className="r">Qty</th><th className="r">Unit Price</th><th className="r">Discount</th><th className="r">Total</th></tr></thead>
              <tbody>
                {[["1","WhatsApp Automation – Monthly Licence","1","R 2,500.00","—","R 2,500.00"],["2","Booking Workflow – Setup & Configuration","1","R 3,200.00","—","R 3,200.00"],["3","Client Portal – Monthly Access Fee","1","R 1,800.00","5%","R 1,710.00"],["4","Analytics Dashboard Module","1","R 1,400.00","—","R 1,400.00"],["5","CRM Integration – Professional Tier","1","R 2,000.00","—","R 2,000.00"],["6","Dedicated Support Hours (×3)","3","R 450.00","—","R 1,350.00"]].map(([n,d,q,u,disc,tot]) => (
                  <tr key={n}><td className="val">{n}</td><td>{d}</td><td className="r val">{q}</td><td className="r val">{u}</td><td className="r val" style={disc !== "—" ? { color: "var(--gn)" } : {}}>{disc}</td><td className="r val" style={{ color: "var(--o)" }}>{tot}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <div className="ca-totals">
              <div className="ca-tot-row"><span className="ca-tot-key">Subtotal</span><span className="ca-tot-val">R 12,160.00</span></div>
              <div className="ca-tot-row"><span className="ca-tot-key">Discount (5% Portal)</span><span className="ca-tot-val" style={{ color: "var(--gn)" }}>− R 90.00</span></div>
              <div className="ca-tot-row"><span className="ca-tot-key">VAT (15%)</span><span className="ca-tot-val" style={{ color: "var(--mt)" }}>R 1,810.50</span></div>
              <div className="ca-tot-grand"><span>Total Due</span><span>R 13,880.50</span></div>
            </div>
          </div>
          <SecHead num="PAY" title="Payment Details" />
          <div className="ca-pay" style={{ marginBottom: 16 }}>
            {[["Bank","Nedbank Business Banking"],["Account No.","1234 5678 9012"],["Branch Code","198765"],["Reference","INV-2026-052 / Your Company Name"],["Amount Due","R 13,880.50 by 28 June 2026"]].map(([k,v],i) => (
              <div key={k} className="ca-pay-row"><span className="ca-pay-key">{k}</span><span className={`ca-pay-val${i >= 3 ? " orange" : ""}`}>{v}</span></div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--ft)" }}>Tax invoice as defined by VAT Act 89/1991. E&amp;OE. Late payments attract 2% monthly interest. Queries within 7 days of issue.</p>
        </div>
      )}

      {/* ── Tab 6: Statement ── */}
      {tab === "statement" && (
        <div className="ca-page">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--o)", marginBottom: 6 }}>Account Statement</div>
              <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 26, fontWeight: 900, letterSpacing: "-.02em", color: "var(--tx)" }}>01 April 2026 – 30 April 2026</h1>
              <p style={{ fontSize: 12, color: "var(--mt)", marginTop: 6 }}>Ref: ST-2026-0047 · Account: MGT-2024-019 · Generated: 29 May 2026</p>
            </div>
            <span className="ca-pill ca-pr" style={{ fontSize: 12, padding: "6px 16px" }}>BALANCE DUE</span>
          </div>
          <div className="ca-ic-grid">
            <div className="ca-ic"><div className="ca-ic-head">Client Details</div><div className="ca-ic-body">
              <StatRow label="Name" value="Tech Co. (Pty) Ltd" /><StatRow label="Contact" value="Keys Mokoena" />
              <StatRow label="Email" value="keys@techco.co.za" /><StatRow label="Location" value="Cape Town, SA" />
            </div></div>
            <div className="ca-ic"><div className="ca-ic-head">Statement Info</div><div className="ca-ic-body">
              <StatRow label="Reference" value="ST-2026-0047" /><StatRow label="Account No." value="MGT-2024-019" />
              <StatRow label="Period" value="April 2026" /><StatRow label="Currency" value="ZAR" />
            </div></div>
          </div>
          <SecHead num="SUM" title="Account Summary" />
          <div className="ca-g4" style={{ marginBottom: 28 }}>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Opening Balance</div><div className="ca-kpi-val" style={{ fontSize: 18 }}>R 4,250</div></div>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Charges This Period</div><div className="ca-kpi-val" style={{ fontSize: 18, color: "var(--o)" }}>R 8,900</div></div>
            <div className="ca-kpi"><div className="ca-kpi-lbl">Payments Received</div><div className="ca-kpi-val" style={{ fontSize: 18, color: "var(--gn)" }}>R 4,250</div></div>
            <div className="ca-kpi" style={{ borderColor: "rgba(180,35,24,.35)", background: "rgba(180,35,24,.04)" }}><div className="ca-kpi-lbl">Balance Due</div><div className="ca-kpi-val" style={{ fontSize: 18, color: "var(--rd)" }}>R 8,900</div></div>
          </div>
          <SecHead num="TXN" title="Transaction History" />
          <div className="ca-tbl-wrap" style={{ marginBottom: 24 }}>
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Ref No.</th><th className="r">Debit (R)</th><th className="r">Credit (R)</th><th className="r">Balance (R)</th></tr></thead>
              <tbody>
                {[["01 Apr","Opening Balance b/f","BF-001","","","4,250.00",false],["03 Apr","WhatsApp Automation – Monthly Fee","INV-2026-041","2,500.00","","1,750.00",false],["05 Apr","Booking Workflow Setup","INV-2026-042","3,200.00","","(1,450.00)",true],["10 Apr","Payment Received – EFT","PAY-0089","","4,250.00","2,800.00",false],["15 Apr","Client Portal Licence – April","INV-2026-043","1,800.00","","1,000.00",false],["18 Apr","Analytics Module Add-on","INV-2026-044","1,400.00","","(400.00)",true],["22 Apr","CRM Integration – Professional","INV-2026-045","2,000.00","","(2,400.00)",true],["28 Apr","Late Payment Fee","FEE-026","750.00","","(3,150.00)",true],["30 Apr","Credit Note – Overpayment Adj.","CN-011","","500.00","(2,650.00)",true],["30 Apr","VAT Adjustment (15%)","VAT-030","6,250.00","","(8,900.00)",true]].map(([date,desc,ref,debit,credit,bal,neg]) => (
                  <tr key={ref}><td>{date}</td><td>{desc}</td><td className="val">{ref}</td><td className="debit">{debit}</td><td className="credit">{credit}</td><td className={`balance${neg ? " neg" : ""}`}>{bal}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="ca-tbl-footer"><span className="tfl">Closing Balance</span><span className="tft">R 8,900.00 OVERDUE</span></div>
          </div>
          <SecHead num="AGE" title="Ageing Analysis" />
          <div className="ca-g4" style={{ marginBottom: 28 }}>
            {[["Current (0–30 days)","var(--gn)","R 2,000"],["31–60 Days","var(--o)","R 3,150"],["61–90 Days","var(--o2)","R 1,800"],["90+ Days","var(--rd)","R 1,950"]].map(([lbl,c,val],i) => (
              <div key={lbl} className="ca-age" style={i === 3 ? { background: "rgba(180,35,24,.04)", border: "1px solid rgba(180,35,24,.2)" } : {}}>
                <div className="ca-age-lbl">{lbl}</div>
                <div className="ca-age-bar" style={{ background: c }} />
                <div className="ca-age-val" style={{ color: c }}>{val}</div>
              </div>
            ))}
          </div>
          <SecHead num="PAY" title="Payment Instructions" />
          <div className="ca-pay">
            {[["Bank","Nedbank Business Banking"],["Account Name","MgucaTech Solutions (Pty) Ltd"],["Account No.","1234 5678 9012"],["Branch Code","198765"],["Reference","MGT-2024-019 / ST-2026-0047"],["Amount Due","R 8,900.00"],["Due Date","15 June 2026"]].map(([k,v],i) => (
              <div key={k} className="ca-pay-row"><span className="ca-pay-key">{k}</span><span className={`ca-pay-val${i >= 4 && i <= 5 ? " orange" : ""}${i === 6 ? "" : ""}`} style={i === 6 ? { color: "var(--rd)" } : {}}>{v}</span></div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--ft)", marginTop: 12 }}>Queries: admin@mgucatech.com · WhatsApp: +27 60 000 0000 · Terms: 30 days from invoice date.</p>
        </div>
      )}

      {/* Success overlay */}
      {success && (
        <div className="ca-ov" onClick={() => setSuccess(null)}>
          <div className="ca-ov-box" onClick={e => e.stopPropagation()}>
            <div className="ca-ov-icon">✓</div>
            <div className="ca-ov-title">Submitted</div>
            <p className="ca-ov-sub">{success.msg}</p>
            <div className="ca-ref"><div className="ca-ref-lbl">Reference ID</div><div className="ca-ref-code">{success.ref}</div></div>
            <button className="ca-btn-ghost" onClick={() => setSuccess(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
