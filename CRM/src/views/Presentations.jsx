import { C, font } from "../constants";

const SITE = "https://mgucatech.com";

const sectorDecks = [
  {
    title: "Medical",
    icon: "H",
    page: "medical.html",
    file: "files/MGT_Medical_Presentation.pptx",
    summary: "WhatsApp booking, reminders, triage, and patient access for clinics and GP practices.",
    audience: "Healthcare practices",
  },
  {
    title: "Pharmacy",
    icon: "Rx",
    page: "pharmacy.html",
    file: "files/MGT_Pharmacy_Presentation.pptx",
    summary: "Prescription notifications, refill reminders, and patient support on WhatsApp.",
    audience: "Pharmacies",
  },
  {
    title: "Legal",
    icon: "L",
    page: "lawyer.html",
    file: "files/MGT_Lawyer_Presentation.pptx",
    summary: "Client intake, appointment scheduling, and case-update notifications for law practices.",
    audience: "Law firms",
  },
  {
    title: "Mechanic",
    icon: "M",
    page: "mechanic.html",
    file: "files/MGT_Mechanic_Presentation.pptx",
    summary: "Service bookings, job status updates, quote approvals, and customer follow-ups.",
    audience: "Auto workshops",
  },
  {
    title: "Restaurant",
    icon: "R",
    page: "restaurant.html",
    file: "files/MGT_Restaurant_Presentation.pptx",
    summary: "Reservations, menu sharing, order notifications, and hospitality workflows.",
    audience: "Restaurants",
  },
  {
    title: "Salon",
    icon: "S",
    page: "salon.html",
    file: "files/MGT_Salon_Presentation.pptx",
    summary: "Appointment bookings, stylist reminders, aftercare tips, and retention campaigns.",
    audience: "Salons and beauty studios",
  },
  {
    title: "MGT Platform",
    icon: "MGT",
    page: "platform.html",
    file: "files/MGT_MgucaTECH_Platform_Presentation.pptx",
    summary: "The core MgucaTECH automation platform across CRM, WhatsApp, booking, and portal.",
    audience: "Strategic buyers",
  },
  {
    title: "Your Business",
    icon: "YB",
    page: "your-business.html",
    file: "files/MGT_Your_Business_Presentation.pptx",
    summary: "A flexible deck for custom WhatsApp automation by sector, workflow, and growth goal.",
    audience: "Custom prospects",
  },
];

const documents = [
  {
    title: "Contract Suite",
    icon: "CS",
    page: "contract.html",
    file: "files/MGT_Contract_Suite.docx",
    summary: "Client engagement contracts and service agreement templates.",
  },
  {
    title: "Policy Manual & Handbook",
    icon: "HB",
    page: "handbook.html",
    file: "files/MGT_Policy_Manual_and_Employee_Handbook.docx",
    summary: "Internal operating policies, procedures, and handbook material.",
  },
];

function url(path) {
  return `${SITE}/${path}`;
}

function DeckCard({ deck }) {
  return (
    <article style={{
      background:C.card,
      border:`1px solid ${C.border}`,
      borderRadius:8,
      padding:18,
      display:"flex",
      flexDirection:"column",
      minHeight:220,
      boxShadow:"0 14px 35px rgba(26,26,26,.06)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", marginBottom:14 }}>
        <div style={{
          width:42,
          height:42,
          borderRadius:8,
          background:C.accentBg,
          color:C.accent,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontFamily:font.mono,
          fontSize:deck.icon.length > 2 ? 10 : 13,
          fontWeight:900,
        }}>{deck.icon}</div>
        <span style={{
          color:C.blue,
          background:C.blueBg,
          borderRadius:99,
          padding:"3px 9px",
          fontSize:10,
          fontWeight:900,
          textTransform:"uppercase",
          letterSpacing:.5,
        }}>{deck.audience || "Document"}</span>
      </div>

      <h3 style={{ margin:0, color:C.text, fontSize:17, fontWeight:900 }}>{deck.title}</h3>
      <p style={{ color:C.muted, fontSize:13, lineHeight:1.55, margin:"8px 0 18px", flex:1 }}>
        {deck.summary}
      </p>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <a href={url(deck.page)} target="_blank" rel="noreferrer"
          style={{
            flex:"1 1 120px",
            textAlign:"center",
            background:C.accent,
            color:"#000",
            borderRadius:7,
            padding:"9px 11px",
            fontSize:12,
            fontWeight:900,
            textDecoration:"none",
          }}>
          Open page
        </a>
        <a href={url(deck.file)} target="_blank" rel="noreferrer"
          style={{
            flex:"1 1 120px",
            textAlign:"center",
            background:C.surface,
            color:C.text,
            border:`1px solid ${C.border}`,
            borderRadius:7,
            padding:"9px 11px",
            fontSize:12,
            fontWeight:900,
            textDecoration:"none",
          }}>
          Download
        </a>
      </div>
    </article>
  );
}

export default function Presentations() {
  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:24 }}>
        <div>
          <div style={{ color:C.muted, fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:"uppercase", marginBottom:6 }}>
            Sales enablement
          </div>
          <h1 style={{ margin:0, color:C.text, fontFamily:font.display, fontSize:36, lineHeight:1 }}>
            Presentations
          </h1>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, margin:"10px 0 0", maxWidth:680 }}>
            Browse the live MgucaTECH presentation pages and download sector decks for consultations, proposals, and onboarding calls.
          </p>
        </div>
        <a href={`${SITE}/presentations.html`} target="_blank" rel="noreferrer"
          style={{
            background:C.dark,
            color:"#fff",
            borderRadius:8,
            padding:"10px 14px",
            fontSize:13,
            fontWeight:900,
            textDecoration:"none",
            whiteSpace:"nowrap",
          }}>
          Open public hub
        </a>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          ["Sector decks", sectorDecks.length, C.accent],
          ["Documents", documents.length, C.blue],
          ["Live hub", "Ready", C.success],
          ["Region", "ZA", C.yellow],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" }}>
            <div style={{ color:C.muted, fontSize:10, fontWeight:900, letterSpacing:.7, textTransform:"uppercase", marginBottom:7 }}>{label}</div>
            <div style={{ color, fontFamily:font.mono, fontSize:24, fontWeight:900 }}>{value}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom:26 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <h2 style={{ margin:0, color:C.text, fontSize:18, fontWeight:900 }}>Sector decks</h2>
          <span style={{ color:C.muted, fontSize:12 }}>Uses the same public presentation design as mgucatech.com</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:14 }}>
          {sectorDecks.map(deck => <DeckCard key={deck.title} deck={deck} />)}
        </div>
      </section>

      <section>
        <h2 style={{ margin:"0 0 12px", color:C.text, fontSize:18, fontWeight:900 }}>Documents</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:14 }}>
          {documents.map(deck => <DeckCard key={deck.title} deck={deck} />)}
        </div>
      </section>
    </div>
  );
}
