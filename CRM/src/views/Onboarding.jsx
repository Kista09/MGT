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

function statusTone(status) {
  if (["Live", "Support", "Approved"].includes(status)) return pill(C.success, C.successBg);
  if (["In Setup", "Build", "Testing"].includes(status)) return pill(C.accent, C.accentBg);
  if (["Waiting on Client", "Needs Attention"].includes(status)) return pill(C.yellow, C.yellowBg);
  return pill(C.muted, C.subtle);
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

function StageRail({ status }) {
  const current = SERVICE_LIFECYCLE.indexOf(status);
  const active = current >= 0 ? current : 0;
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${SERVICE_LIFECYCLE.length}, minmax(52px,1fr))`, gap:5 }}>
      {SERVICE_LIFECYCLE.map((stage, index) => (
        <div key={stage} title={stage}
          style={{ height:6, borderRadius:99, background:index <= active ? C.accent : C.subtle }} />
      ))}
    </div>
  );
}

function Metric({ label, value, color = C.text }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" }}>
      <div style={{ color:C.muted, fontSize:10, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:7 }}>{label}</div>
      <div style={{ color, fontFamily:font.mono, fontSize:24, fontWeight:900 }}>{value}</div>
    </div>
  );
}

export default function Onboarding() {
  const { state, navigate } = useApp();
  const onboarding = (state.serviceRequests ?? [])
    .filter(request => request.source === "onboarding" || request.onboarding || request.portalGranted)
    .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0));

  const active = onboarding.filter(request => !["Resolved", "Closed", "Live"].includes(request.status));
  const waiting = onboarding.filter(request => request.status === "Waiting on Client").length;
  const approved = onboarding.filter(request => request.portalGranted || request.status === "Approved").length;
  const overdue = active.filter(request => daysUntil(request.dueDate) < 0).length;

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
        <div style={{ display:"grid", gap:12 }}>
          {onboarding.map(request => {
            const data = onboardingData(request);
            const delta = daysUntil(request.dueDate);
            return (
              <article key={serviceRequestId(request)}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:14, alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:C.accent, fontFamily:font.mono, fontSize:11, fontWeight:900, marginBottom:4 }}>{serviceRequestId(request)}</div>
                    <div style={{ color:C.text, fontSize:17, fontWeight:900, lineHeight:1.25 }}>{data.company || request.company || request.subject}</div>
                    <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>
                      {request.requester} · {request.email} · {data.location || "South Africa"}
                    </div>
                  </div>
                  <span style={statusTone(request.status)}>{request.status}</span>
                </div>
                <StageRail status={request.status} />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:10, marginTop:14 }}>
                  {[
                    ["Package", data.package || request.plan || "Starter"],
                    ["Sector", data.sector || "Business"],
                    ["Timeline", data.timeline || "Not specified"],
                    ["Due", delta < 0 ? `${Math.abs(delta)}d late` : formatDateShort(request.dueDate)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px" }}>
                      <div style={{ color:C.muted, fontSize:9, fontWeight:900, letterSpacing:.5, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                      <div style={{ color:C.text, fontSize:12, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", gap:12, alignItems:"center" }}>
                  <div style={{ color:C.text, fontSize:13, fontWeight:800 }}>{nextAction(request)}</div>
                  <button type="button" onClick={() => navigate("requests")}
                    style={{ background:C.subtle, border:`1px solid ${C.border}`, color:C.text, borderRadius:7, padding:"7px 11px", fontSize:12, fontWeight:900, cursor:"pointer" }}>
                    Manage
                  </button>
                </div>
              </article>
            );
          })}
          {onboarding.length === 0 && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:36, color:C.muted, textAlign:"center" }}>
              No onboarding records yet. Use the capture form or sync onboarding requests.
            </div>
          )}
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
            <a href={state.settings?.bookNowUrl || "https://mgtchat-20260516-1916.vercel.app/#book"} target="_blank" rel="noreferrer"
              style={{ display:"inline-flex", background:C.accent, color:"#000", borderRadius:7, padding:"8px 12px", textDecoration:"none", fontSize:12, fontWeight:900 }}>
              Open Book Now
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
