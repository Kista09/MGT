import { useMemo, useState } from "react";
import { C, SERVICE_LIFECYCLE, font, pill } from "../constants";
import { useApp } from "../context";
import { daysUntil, formatDateShort } from "../utils";

function serviceRequestId(request = {}) {
  return request.requestNumber || request.id;
}

function onboardingData(request = {}) {
  if (request.onboarding && typeof request.onboarding === "object") return request.onboarding;
  return {};
}

function safeText(value) {
  return String(value ?? "");
}

function statusTone(status) {
  if (["Live", "Support", "Approved"].includes(status)) return pill(C.success, C.successBg);
  if (["In Setup", "Build", "Testing"].includes(status)) return pill(C.accent, C.accentBg);
  if (["Waiting on Client", "Needs Attention"].includes(status)) return pill(C.yellow, C.yellowBg);
  return pill(C.muted, C.subtle);
}

function priorityTone(priority) {
  if (priority === "Critical") return pill("#fff", C.red);
  if (priority === "High") return pill(C.red, C.redBg);
  if (priority === "Medium") return pill(C.yellow, C.yellowBg);
  return pill(C.blue, C.blueBg);
}

function nextAction(request) {
  if (!request.portalGranted) return "Approve portal access and send starter kit";
  if (request.status === "Waiting on Client") return "Collect missing client documents";
  if (request.status === "Approved") return "Move into setup and confirm kickoff";
  if (request.status === "In Setup") return "Connect Book Now and WhatsApp workflows";
  if (request.status === "Build") return "Prepare first chatbot and booking review";
  if (request.status === "Testing") return "Run test booking and client sign-off";
  if (request.status === "Live") return "Monitor first usage and support checks";
  return "Qualify request and capture onboarding details";
}

function cellStyle(extra = {}) {
  return {
    borderRight:`1px solid ${C.border}`,
    borderBottom:`1px solid ${C.border}`,
    color:C.text,
    padding:"8px 10px",
    minHeight:36,
    overflow:"hidden",
    textOverflow:"ellipsis",
    whiteSpace:"nowrap",
    verticalAlign:"middle",
    ...extra,
  };
}

function tableButton(background, color, border = "none") {
  return {
    background,
    border,
    color,
    borderRadius:4,
    padding:"4px 8px",
    fontSize:10,
    fontWeight:900,
    cursor:"pointer",
  };
}

function Metric({ label, value, color = C.text }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" }}>
      <div style={{ color:C.muted, fontSize:10, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:7 }}>{label}</div>
      <div style={{ color, fontFamily:font.mono, fontSize:24, fontWeight:900 }}>{value}</div>
    </div>
  );
}

const ONBOARDING_COLUMNS = [
  { key:"sr", label:"SR Number", width:150 },
  { key:"company", label:"Company", width:220 },
  { key:"requester", label:"Requester", width:170 },
  { key:"email", label:"Email", width:220 },
  { key:"sector", label:"Sector", width:130 },
  { key:"package", label:"Package", width:120 },
  { key:"priority", label:"Priority", width:96 },
  { key:"status", label:"Status", width:135 },
  { key:"portal", label:"Portal", width:110 },
  { key:"timeline", label:"Timeline", width:150 },
  { key:"due", label:"Due", width:105 },
  { key:"next", label:"Next Action", width:300 },
  { key:"actions", label:"Actions", width:160, filterable:false, sortable:false },
];

function rowText(request) {
  const data = onboardingData(request);
  const delta = daysUntil(request.dueDate);
  const dueLabel = request.dueDate
    ? delta < 0 ? `${Math.abs(delta)}d late` : delta === 0 ? "Today" : formatDateShort(request.dueDate)
    : "Not set";
  return {
    sr: serviceRequestId(request),
    company: data.company || request.company || request.subject || "",
    requester: request.requester || data.leadName || "",
    email: request.email || data.email || "",
    sector: data.sector || "Business",
    package: data.package || request.plan || "Starter",
    priority: request.priority || "Medium",
    status: request.status || "New",
    portal: request.portalGranted ? "Granted" : "Pending",
    timeline: data.timeline || "Not specified",
    due: dueLabel,
    next: nextAction(request),
  };
}

function uniqueOptions(rows, key) {
  return [...new Set(rows.map(row => safeText(rowText(row)[key]).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function sortValue(request, key) {
  const priorityRank = { Critical:0, High:1, Medium:2, Low:3 };
  const statusRank = Object.fromEntries(SERVICE_LIFECYCLE.map((status, index) => [status, index]));
  const text = rowText(request);
  if (key === "priority") return priorityRank[request.priority] ?? 99;
  if (key === "status") return statusRank[request.status] ?? 99;
  if (key === "due") return request.dueDate || "";
  return safeText(text[key]).toLowerCase();
}

export default function Onboarding() {
  const { state, navigate } = useApp();
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key:"sr", dir:"asc" });
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const onboarding = (state.serviceRequests ?? [])
    .filter(request => request.source === "onboarding" || request.onboarding || request.portalGranted);

  const active = onboarding.filter(request => !["Resolved", "Closed", "Live"].includes(request.status));
  const waiting = onboarding.filter(request => request.status === "Waiting on Client").length;
  const approved = onboarding.filter(request => request.portalGranted || request.status === "Approved").length;
  const overdue = active.filter(request => request.dueDate && daysUntil(request.dueDate) < 0).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFilters = Object.entries(columnFilters)
      .map(([key, value]) => [key, safeText(value).trim().toLowerCase()])
      .filter(([, value]) => value);

    return onboarding
      .filter(request => {
        const text = rowText(request);
        const searchMatch = !q || Object.values(text).some(value => safeText(value).toLowerCase().includes(q));
        const columnMatch = activeFilters.every(([key, value]) => safeText(text[key]).trim().toLowerCase() === value);
        return searchMatch && columnMatch;
      })
      .sort((a, b) => {
        const aValue = sortValue(a, sortConfig.key);
        const bValue = sortValue(b, sortConfig.key);
        const compare = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : safeText(aValue).localeCompare(safeText(bValue));
        return sortConfig.dir === "asc" ? compare : -compare;
      });
  }, [columnFilters, onboarding, search, sortConfig]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const columnOptions = useMemo(() => (
    Object.fromEntries(ONBOARDING_COLUMNS
      .filter(column => column.filterable !== false)
      .map(column => [column.key, uniqueOptions(onboarding, column.key)])
    )
  ), [onboarding]);

  const sortBy = column => {
    if (column.sortable === false) return;
    setSortConfig(prev => prev.key === column.key
      ? { key:column.key, dir:prev.dir === "asc" ? "desc" : "asc" }
      : { key:column.key, dir:"asc" });
  };

  const setColumnFilter = key => event => {
    setPage(0);
    setColumnFilters(prev => ({ ...prev, [key]: event.target.value }));
  };

  const clearFilters = () => {
    setSearch("");
    setColumnFilters({});
    setPage(0);
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>Onboarding Suite</div>
          <div style={{ color:C.muted, fontSize:14 }}>Track new clients from brief to Book Now, WhatsApp, portal, and go-live.</div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <a href="https://mgucatech.com/consultant-onboarding.html" target="_blank" rel="noreferrer"
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:900, textDecoration:"none" }}>
            Open Capture Form
          </a>
          <button type="button" onClick={() => navigate("requests")}
            style={{ background:C.card, color:C.text, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:900, cursor:"pointer" }}>
            View Request Table
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(150px,1fr))", gap:14, marginBottom:20 }}>
        <Metric label="Active onboarding" value={active.length} color={active.length ? C.accent : C.muted} />
        <Metric label="Portal approved" value={approved} color={approved ? C.success : C.muted} />
        <Metric label="Waiting client" value={waiting} color={waiting ? C.yellow : C.muted} />
        <Metric label="Overdue" value={overdue} color={overdue ? C.red : C.muted} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 320px", gap:16 }}>
        <div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", justifyContent:"space-between", padding:12, borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}
                placeholder="Search onboarding records..."
                style={{ minWidth:260, flex:"1 1 300px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 11px", color:C.text, outline:"none" }} />
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ color:C.muted, fontSize:12, fontWeight:800 }}>{filtered.length} records</span>
                <button type="button" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
                  style={tableButton(C.subtle, currentPage === 0 ? C.muted : C.text)}>Prev 10</button>
                <button type="button" onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))} disabled={currentPage >= pageCount - 1}
                  style={tableButton(C.subtle, currentPage >= pageCount - 1 ? C.muted : C.text)}>Next 10</button>
                <button type="button" onClick={clearFilters} style={tableButton(C.subtle, C.muted)}>Clear</button>
              </div>
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", minWidth:1880, borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
                <colgroup>
                  {ONBOARDING_COLUMNS.map(column => <col key={column.key} style={{ width:column.width }} />)}
                </colgroup>
                <thead>
                  <tr style={{ background:C.dark }}>
                    {ONBOARDING_COLUMNS.map(column => (
                      <th key={column.key} style={{ ...cellStyle({ color:"#fff", fontSize:10, fontWeight:900, letterSpacing:.5, textTransform:"uppercase", background:C.dark, position:"sticky", top:0, zIndex:1 }) }}>
                        <button type="button" onClick={() => sortBy(column)}
                          style={{ background:"transparent", border:"none", color:"#fff", padding:0, cursor:column.sortable === false ? "default" : "pointer", fontSize:10, fontWeight:900, letterSpacing:.5, textTransform:"uppercase" }}>
                          {column.label}
                          {sortConfig.key === column.key && column.sortable !== false ? (sortConfig.dir === "asc" ? " ^" : " v") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr style={{ background:C.surface }}>
                    {ONBOARDING_COLUMNS.map(column => (
                      <th key={`${column.key}-filter`} style={cellStyle({ padding:6, background:C.surface })}>
                        {column.filterable === false ? null : (
                          <select value={columnFilters[column.key] || ""} onChange={setColumnFilter(column.key)}
                            style={{ width:"100%", background:C.card, color:C.text, border:`1px solid ${C.border}`, borderRadius:4, padding:"5px 6px", fontSize:10, outline:"none" }}>
                            <option value="">All</option>
                            {(columnOptions[column.key] ?? []).map(option => (
                              <option key={option} value={option.toLowerCase()}>{option}</option>
                            ))}
                          </select>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((request, index) => {
                    const text = rowText(request);
                    const rowBg = index % 2 === 0 ? C.card : C.surface;
                    return (
                      <tr key={serviceRequestId(request)} style={{ background:rowBg }}>
                        <td style={cellStyle({ color:C.accent, fontWeight:900, fontFamily:font.mono })}>{text.sr}</td>
                        <td style={cellStyle({ fontWeight:900 })} title={text.company}>{text.company}</td>
                        <td style={cellStyle()} title={text.requester}>{text.requester}</td>
                        <td style={cellStyle()} title={text.email}>{text.email}</td>
                        <td style={cellStyle()}>{text.sector}</td>
                        <td style={cellStyle()}>{text.package}</td>
                        <td style={cellStyle()}><span style={priorityTone(text.priority)}>{text.priority}</span></td>
                        <td style={cellStyle()}><span style={statusTone(text.status)}>{text.status}</span></td>
                        <td style={cellStyle()}><span style={pill(request.portalGranted ? C.success : C.yellow, request.portalGranted ? C.successBg : C.yellowBg)}>{text.portal}</span></td>
                        <td style={cellStyle()} title={text.timeline}>{text.timeline}</td>
                        <td style={cellStyle({ color:request.dueDate && daysUntil(request.dueDate) < 0 ? C.red : C.muted, fontWeight:800 })}>{text.due}</td>
                        <td style={cellStyle()} title={text.next}>{text.next}</td>
                        <td style={{ ...cellStyle(), overflow:"visible" }}>
                          <div style={{ display:"flex", gap:6, whiteSpace:"nowrap" }}>
                            <button type="button" onClick={() => navigate("requests")} style={tableButton(C.subtle, C.text)}>Manage</button>
                            <button type="button" onClick={() => navigate("requests")} style={tableButton(C.accentBg, C.accent, `1px solid ${C.accent}`)}>Capture</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div style={{ padding:36, color:C.muted, textAlign:"center", fontSize:14 }}>
                No onboarding records match your filters.
              </div>
            )}
          </div>
        </div>

        <aside style={{ display:"grid", gap:12, alignContent:"start" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
            <div style={{ color:C.muted, fontSize:10, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:10 }}>Launch checklist</div>
            <div style={{ display:"grid", gap:9 }}>
              {(state.onboardingChecklist ?? []).map((item, index) => (
                <div key={item} style={{ display:"grid", gridTemplateColumns:"24px 1fr", gap:9, alignItems:"start" }}>
                  <span style={{ width:22, height:22, borderRadius:99, background:index < 2 ? C.successBg : C.subtle, color:index < 2 ? C.success : C.muted, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900 }}>
                    {index + 1}
                  </span>
                  <span style={{ color:C.text, fontSize:12, lineHeight:1.4, fontWeight:700 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:C.dark, borderRadius:8, padding:16, color:"#fff" }}>
            <div style={{ color:"rgba(255,255,255,.55)", fontSize:10, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:8 }}>Booking app</div>
            <div style={{ fontFamily:font.display, fontSize:24, lineHeight:1, marginBottom:8 }}>Book Now</div>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:12, lineHeight:1.5, marginBottom:12 }}>
              Use this during onboarding to test booking rules, SAST availability, and client handoff.
            </div>
            <a href={state.settings?.bookNowUrl || "https://mgt-app.vercel.app/#book"} target="_blank" rel="noreferrer"
              style={{ display:"inline-flex", background:C.accent, color:"#000", borderRadius:7, padding:"8px 12px", textDecoration:"none", fontSize:12, fontWeight:900 }}>
              Open Book Now
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
