import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/* ─── fonts ───────────────────────────────────────────────── */
const fl = document.createElement("link");
fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fl);

/* ─── tokens ──────────────────────────────────────────────── */
const T = {
  bg:"#F8F4EF", surface:"#FFFFFF", card:"#FFFFFF",
  border:"#E8E2DA", borderDark:"#D7CCBE",
  accent:"#E8561A", accentLt:"#F07A46", accentBg:"#FDF0EB", accentBdr:"#F6C6B4",
  red:"#B42318", redBg:"#FFF1F0", redBdr:"#FDA29B",
  yellow:"#A16207", yellowBg:"#FEF3C7", yellowBdr:"#FDE68A",
  blue:"#0C4A4A", blueBg:"#E4F2F2", blueBdr:"#B7D8D8",
  purple:"#6B4E71", purpleBg:"#F3EEF5", purpleBdr:"#D9C6DF",
  text:"#1A1A1A", muted:"#6F6258", subtle:"#F3ECE3",
  dark:"#1A1A1A", teal:"#0C4A4A",
  shadow:"0 1px 4px rgba(26,26,26,.06),0 10px 28px rgba(26,26,26,.07)",
  shadowMd:"0 18px 48px rgba(26,26,26,.16)",
};
const font="'DM Sans',sans-serif";
const serif="'Cormorant Garamond',Georgia,serif";
const fmtRand = (v) => `R${Number(v).toLocaleString("en-ZA")}`;
const BOOK_NOW_URL = import.meta.env.VITE_BOOK_NOW_URL || "https://mgt-app.vercel.app/#book";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://mgucatech.com";
const STORAGE_KEY = "mgucatech_client_access_token";
const bookingUrlFor = (user) => {
  const url = new URL(BOOK_NOW_URL);
  if (user?.clientId) url.searchParams.set("clientId", user.clientId);
  if (user?.clientName) url.searchParams.set("client", user.clientName);
  return url.toString();
};
const openBookNow = (user) => window.open(bookingUrlFor(user), "_blank", "noopener,noreferrer");
const portalToken = () => localStorage.getItem(STORAGE_KEY);
const portalFetch = async (path = "/api/client-portal", options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${portalToken() || ""}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Client portal backend unavailable");
  return data;
};

const portalAction = (action, payload = {}) => portalFetch("/api/client-portal", {
  method: "POST",
  body: JSON.stringify({ action, ...payload }),
});
const PRIVATE_CLIENT_TOKEN_KEY = "mgucatech_private_client_access_token";
const privateClientToken = () => localStorage.getItem(PRIVATE_CLIENT_TOKEN_KEY);
const privateClientFetch = async (options = {}) => {
  const res = await fetch(`${API_BASE}/api/private-clients`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${privateClientToken() || ""}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Private clients backend unavailable");
  return data;
};

/* ─── seed data ───────────────────────────────────────────── */
const INIT_QA = [
  { id:1,category:"Orders",  question:"How do I track my order?",        answer:"Reply with your order number and we'll send real-time tracking info within seconds.", active:true  },
  { id:2,category:"Orders",  question:"Can I cancel my order?",          answer:"Orders can be cancelled within 2 hours. Reply 'CANCEL [order number]' to proceed.",  active:true  },
  { id:3,category:"Returns", question:"What is your return policy?",     answer:"We accept returns within 30 days of delivery. Items must be unused and in original packaging.", active:true },
  { id:4,category:"Returns", question:"How long do refunds take?",       answer:"Refunds are processed within 5-7 business days back to your original payment method.", active:true  },
  { id:5,category:"Support", question:"How do I speak to a human agent?",answer:"Reply 'AGENT' at any time and we'll connect you to a live support representative.",   active:true  },
  { id:6,category:"Support", question:"What are your support hours?",    answer:"Our team is available Monday-Friday, 8 AM to 5 PM (SAST).",                         active:true  },
  { id:7,category:"Products",question:"Do you offer bulk discounts?",    answer:"Yes! For orders above 50 units, reply 'BULK' to get a custom quote.",                 active:true  },
];

const INIT_CONVS = [
  { id:1, name:"Lerato Mokoena", phone:"+27 82 123 4567", status:"Escalated", agent:"Owen", country:"ZA", unread:3,
    messages:[
      { id:1, from:"customer", text:"Hi I need help with my order", time:"10:02" },
      { id:2, from:"bot",      text:"Hello! I'd be happy to help. What's your order number?", time:"10:02" },
      { id:3, from:"customer", text:"ZA-29341, it's been 3 weeks and nothing arrived", time:"10:03" },
      { id:4, from:"bot",      text:"I see order #ZA-29341 placed on 1 May. Let me check the shipping status... it appears there's a delay at the Johannesburg hub. I'm escalating this to our team now.", time:"10:03" },
      { id:5, from:"customer", text:"AGENT", time:"10:04" },
      { id:6, from:"bot",      text:"Connecting you to a human agent now. Please hold...", time:"10:04" },
      { id:7, from:"agent",    text:"Hi Lerato, this is Owen from Takealot Partner Support. I can see your order was delayed at our Johannesburg hub. I'm arranging a priority redelivery for tomorrow - will that work for you?", time:"10:06", agentName:"Owen" },
      { id:8, from:"customer", text:"Yes that's fine, I just need it delivered", time:"10:07" },
    ]
  },
  { id:2, name:"Thabo Nkosi", phone:"+27 71 234 5678", status:"Bot", agent:null, country:"ZA", unread:0,
    messages:[
      { id:1, from:"customer", text:"track order ZA-45892", time:"09:41" },
      { id:2, from:"bot",      text:"Order #ZA-45892 is out for delivery! Your driver is nearby. Expected arrival: before 6 PM today.\n\nTrack live: tapartner.co.za/track/ZA-45892", time:"09:41" },
      { id:3, from:"customer", text:"thank you!", time:"09:42" },
      { id:4, from:"bot",      text:"You're welcome! Let me know if there's anything else I can help with.", time:"09:42" },
    ]
  },
  { id:3, name:"Ayesha Jacobs", phone:"+27 73 345 6789", status:"Resolved", agent:null, country:"ZA", unread:0,
    messages:[
      { id:1, from:"customer", text:"what's the return policy?", time:"Yesterday" },
      { id:2, from:"bot",      text:"Our return policy allows returns within 30 days of delivery. Items must be unused and in their original packaging.\n\nTo start a return, reply 'RETURN' with your order number.", time:"Yesterday" },
      { id:3, from:"customer", text:"great thanks", time:"Yesterday" },
    ]
  },
  { id:4, name:"Sibusiso Khumalo", phone:"+27 76 456 7890", status:"Escalated", agent:null, country:"ZA", unread:1,
    messages:[
      { id:1, from:"customer", text:"I was charged twice for the same order!!", time:"08:30" },
      { id:2, from:"bot",      text:"I'm very sorry to hear that. Double charges are taken seriously - let me escalate this to our billing team immediately.", time:"08:30" },
      { id:3, from:"customer", text:"This is unacceptable I want a refund NOW", time:"08:31" },
    ]
  },
  { id:5, name:"Megan Naidoo", phone:"+27 84 567 8901", status:"Bot", agent:null, country:"ZA", unread:0,
    messages:[
      { id:1, from:"customer", text:"do you deliver to Durban?", time:"11:20" },
      { id:2, from:"bot",      text:"Yes! We deliver across South Africa, including Durban. Standard delivery takes 2-4 business days.", time:"11:20" },
    ]
  },
];

const INIT_CONTACTS = [
  { id:1,  name:"Lerato Mokoena",     phone:"+27 82 123 4567", optIn:true,  tags:["VIP","Escalated"],  country:"ZA", convs:8,  lastSeen:"Today"     },
  { id:2,  name:"Thabo Nkosi",        phone:"+27 71 234 5678", optIn:true,  tags:["Regular"],           country:"ZA", convs:14, lastSeen:"Today"     },
  { id:3,  name:"Ayesha Jacobs",      phone:"+27 73 345 6789", optIn:true,  tags:["Resolved"],          country:"ZA", convs:3,  lastSeen:"Yesterday" },
  { id:4,  name:"Sibusiso Khumalo",   phone:"+27 76 456 7890", optIn:true,  tags:["Billing","VIP"],     country:"ZA", convs:5,  lastSeen:"Today"     },
  { id:5,  name:"Megan Naidoo",       phone:"+27 84 567 8901", optIn:true,  tags:["Regular"],           country:"ZA", convs:2,  lastSeen:"Today"     },
  { id:6,  name:"Naledi Dlamini",     phone:"+27 81 678 9012", optIn:false, tags:["Opted-out"],         country:"ZA", convs:1,  lastSeen:"3 days ago"},
  { id:7,  name:"Owen Petersen",      phone:"+27 83 789 0123", optIn:true,  tags:["Regular"],           country:"ZA", convs:7,  lastSeen:"2 days ago"},
  { id:8,  name:"Zanele Mthembu",     phone:"+27 72 890 1234", optIn:true,  tags:["VIP","Repeat"],      country:"ZA", convs:21, lastSeen:"Yesterday" },
  { id:9,  name:"Johan Botha",        phone:"+27 79 901 2345", optIn:true,  tags:["Regular"],           country:"ZA", convs:4,  lastSeen:"1 week ago"},
  { id:10, name:"Priya Govender",     phone:"+27 74 012 3456", optIn:true,  tags:["New"],               country:"ZA", convs:1,  lastSeen:"Today"     },
];

const INIT_TEMPLATES = [
  { id:1, name:"order_confirmed",     category:"UTILITY",   status:"APPROVED", lang:"English", body:"Hello {{1}}, your order #{{2}} has been confirmed. Estimated delivery: {{3}}. Track it anytime by replying with your order number.", vars:["name","order_id","delivery_date"], uses:12400 },
  { id:2, name:"order_shipped",       category:"UTILITY",   status:"APPROVED", lang:"English", body:"Great news {{1}}! Your order #{{2}} is on its way. Your driver will arrive between {{3}}. Reply TRACK for live updates.", vars:["name","order_id","time_window"],  uses:9800  },
  { id:3, name:"delivery_failed",     category:"UTILITY",   status:"APPROVED", lang:"English", body:"Hi {{1}}, we attempted delivery of order #{{2}} but couldn't reach you. Please reply with your preferred redelivery slot.", vars:["name","order_id"], uses:3100 },
  { id:4, name:"weekend_promo",       category:"MARKETING", status:"PENDING",  lang:"English", body:"Weekend special: {{1}}% off selected products for the next {{2}} hours. Shop now: tapartner.co.za/sale\n\nReply STOP to opt out.", vars:["discount","hours"], uses:0 },
  { id:5, name:"abandoned_cart",      category:"MARKETING", status:"APPROVED", lang:"English", body:"Hey {{1}}, you left something behind. Your cart has {{2}} item(s) worth {{3}}. Complete your order: {{4}}", vars:["name","count","total","link"], uses:5600 },
  { id:6, name:"review_request",      category:"UTILITY",   status:"REJECTED", lang:"English", body:"Hi {{1}}, how was your recent Takealot Partner Store order? Reply 1-5 to share your rating.", vars:["name"], uses:0 },
  { id:7, name:"refund_processed",    category:"UTILITY",   status:"APPROVED", lang:"English", body:"Hi {{1}}, your refund of {{2}} for order #{{3}} has been processed. It will appear in your account within 5-7 business days.", vars:["name","amount","order_id"], uses:1800 },
];

const ANALYTICS_MSGS = [
  {d:"Apr 22",msgs:88400},{d:"Apr 23",msgs:72100},{d:"Apr 24",msgs:91300},{d:"Apr 25",msgs:84600},
  {d:"Apr 26",msgs:62300},{d:"Apr 27",msgs:58900},{d:"Apr 28",msgs:94100},{d:"Apr 29",msgs:89700},
  {d:"Apr 30",msgs:96200},{d:"May 1", msgs:78400},{d:"May 2", msgs:71200},{d:"May 3", msgs:65800},
  {d:"May 4", msgs:97400},{d:"May 5", msgs:91200},{d:"May 6", msgs:88600},{d:"May 7", msgs:93100},
  {d:"May 8", msgs:86400},{d:"May 9", msgs:69300},{d:"May 10",msgs:61200},{d:"May 11",msgs:98400},
  {d:"May 12",msgs:94100},{d:"May 13",msgs:91800},{d:"May 14",msgs:89300},{d:"May 15",msgs:88000},
  {d:"May 16",msgs:85200},{d:"May 17",msgs:72100},{d:"May 18",msgs:68400},{d:"May 19",msgs:99100},
  {d:"May 20",msgs:95600},{d:"May 21",msgs:91400},{d:"May 22",msgs:87200},
];
const TOP_QUESTIONS = [
  { q:"Track my order",        pct:34 },
  { q:"Cancel order",          pct:18 },
  { q:"Return policy",         pct:14 },
  { q:"Delivery areas",        pct:11 },
  { q:"Speak to agent",        pct:9  },
  { q:"Refund status",         pct:7  },
  { q:"Other / Unmatched",     pct:7  },
];
const RESOLUTION = [
  {week:"Apr W3",rate:81},{week:"Apr W4",rate:83},{week:"May W1",rate:85},{week:"May W2",rate:87},{week:"May W3",rate:86},
];

const INIT_BROADCASTS = [
  { id:1, name:"Winter Sale",           template:"weekend_promo",     segment:"All subscribers",  status:"Sent",      sent:18400, delivered:17820, read:9340, scheduled:null,      sentAt:"Apr 8, 2026"  },
  { id:2, name:"Abandoned Cart - May",   template:"abandoned_cart",    segment:"Cart abandoners",  status:"Sent",      sent:4200,  delivered:4120,  read:2890, scheduled:null,      sentAt:"May 15, 2026" },
  { id:3, name:"Payday Promo - 48hr",    template:"weekend_promo",     segment:"VIP customers",    status:"Scheduled", sent:0,     delivered:0,     read:0,    scheduled:"May 25, 2026 9:00 AM", sentAt:null },
  { id:4, name:"Heritage Month Promo",   template:"abandoned_cart",    segment:"All subscribers",  status:"Draft",     sent:0,     delivered:0,     read:0,    scheduled:null,      sentAt:null           },
];

const FLOW_NODES = [
  { id:"start",    type:"start",   label:"User sends message",  content:"",                                      x:40,  y:240, outputs:["menu"]    },
  { id:"menu",     type:"menu",    label:"Main Menu",           content:"Reply with a number:\n1️⃣ Track order\n2️⃣ Returns\n3️⃣ Promotions\n4️⃣ Speak to agent", x:260, y:240, outputs:["track","returns","promo","agent"] },
  { id:"track",    type:"message", label:"Track Order",         content:"Please share your order number and I'll fetch the latest status for you 📦",  x:520, y:80,  outputs:["done1"]   },
  { id:"returns",  type:"message", label:"Return Info",         content:"Returns are accepted within 30 days. Reply 'RETURN' + order number to begin.", x:520, y:200, outputs:["done2"]   },
  { id:"promo",    type:"message", label:"Promotions",          content:"Check our latest deals at tapartner.co.za/offers - new sales every day!",          x:520, y:320, outputs:["done3"]   },
  { id:"agent",    type:"action",  label:"Escalate to Agent",   content:"Connecting you to a live support agent. Average wait: 2 minutes ⏳",           x:520, y:440, outputs:[]          },
  { id:"done1",    type:"end",     label:"Continue / Resolved", content:"",                                      x:740, y:80,  outputs:[]          },
  { id:"done2",    type:"end",     label:"Continue / Resolved", content:"",                                      x:740, y:200, outputs:[]          },
  { id:"done3",    type:"end",     label:"Continue / Resolved", content:"",                                      x:740, y:320, outputs:[]          },
];

const INVOICES = [
  { id:"INV-2026-05", date:"1 May 2026", amount:73500, status:"Paid", plan:"Enterprise" },
  { id:"INV-2026-04", date:"1 Apr 2026", amount:73500, status:"Paid", plan:"Enterprise" },
  { id:"INV-2026-03", date:"1 Mar 2026", amount:73500, status:"Paid", plan:"Enterprise" },
  { id:"INV-2026-02", date:"1 Feb 2026", amount:66500, status:"Paid", plan:"Scale"      },
  { id:"INV-2026-01", date:"1 Jan 2026", amount:66500, status:"Paid", plan:"Scale"      },
];

const STATUS_SERVICES = [
  { name:"WhatsApp API Gateway", uptime:99.97, status:"Operational",   lastCheck:"1 min ago"  },
  { name:"Message Delivery",     uptime:99.94, status:"Operational",   lastCheck:"1 min ago"  },
  { name:"Bot Engine",           uptime:99.99, status:"Operational",   lastCheck:"30 sec ago" },
  { name:"Analytics Pipeline",   uptime:99.82, status:"Operational",   lastCheck:"2 min ago"  },
  { name:"Template API",         uptime:100,   status:"Operational",   lastCheck:"1 min ago"  },
  { name:"Agent Inbox",          uptime:99.91, status:"Operational",   lastCheck:"1 min ago"  },
  { name:"Broadcast Engine",     uptime:99.88, status:"Degraded",      lastCheck:"1 min ago"  },
  { name:"Webhooks",             uptime:99.95, status:"Operational",   lastCheck:"45 sec ago" },
];
const UPTIME_HISTORY = [
  {week:"Apr W3",up:100},{week:"Apr W4",up:99.9},{week:"May W1",up:100},{week:"May W2",up:99.7},{week:"May W3",up:99.9},
];

const ONBOARDING_STEPS = [
  { id:1, title:"Submit logo and brand assets",        desc:"Upload logo, colours, voice notes, and basic company profile for your South African business.", done:true,  icon:"🎨", owner:"Client" },
  { id:2, title:"Confirm WhatsApp number and hours",   desc:"Confirm the WhatsApp number, operating hours, public holiday rules, and handoff contact.",       done:true,  icon:"📱", owner:"Client" },
  { id:3, title:"Upload FAQ, services, and pricing",   desc:"Share your FAQ, service list, Rand pricing, policies, and any escalation rules.",                done:true,  icon:"🧾", owner:"Client" },
  { id:4, title:"Connect Book Now calendar",           desc:"Confirm availability, appointment types, cancellation windows, and SAST booking rules.",         done:false, icon:"📅", owner:"MgucaTECH" },
  { id:5, title:"Approve chatbot conversation flow",   desc:"Review welcome message, Q&A paths, handoff wording, and client-facing tone.",                    done:false, icon:"💬", owner:"Client" },
  { id:6, title:"Approve booking workflow",            desc:"Run a test booking from WhatsApp through Book Now and confirm notifications.",                   done:false, icon:"🧪", owner:"Client" },
  { id:7, title:"Confirm billing and EFT reference",   desc:"Confirm setup fee, monthly support, invoice recipient, and payment reference.",                  done:false, icon:"💳", owner:"Client" },
  { id:8, title:"Go live and review after 14 days",    desc:"Switch the workflow live, monitor conversations, and complete the first post-launch review.",     done:false, icon:"🚀", owner:"MgucaTECH" },
];

/* ─── shared components ───────────────────────────────────── */
function Toast({ msg, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2800); return()=>clearTimeout(t); },[]);
  const col = type==="error" ? T.red : T.accent;
  const bg  = type==="error" ? T.redBg : T.accentBg;
  const bdr = type==="error" ? T.redBdr : T.accentBdr;
  return (
    <div style={{ position:"fixed",bottom:32,right:32,zIndex:9999,background:bg,
      border:`1.5px solid ${bdr}`,borderRadius:8,padding:"14px 22px",fontSize:14,
      fontWeight:600,color:col,boxShadow:T.shadowMd,display:"flex",alignItems:"center",
      gap:10,fontFamily:font,animation:"slideUp .25s ease" }}>
      <span>{type==="error"?"⚠":"✓"}</span> {msg}
    </div>
  );
}

function Btn({ children, variant="primary", onClick, small, danger, style:s={} }) {
  const sz = small ? {padding:"6px 12px",fontSize:12} : {padding:"9px 18px",fontSize:14};
  const v  = danger ? {background:T.redBg,color:T.red,border:`1.5px solid ${T.redBdr}`}
           : variant==="primary" ? {background:T.accent,color:"#fff"}
           : {background:T.surface,color:T.muted,border:`1.5px solid ${T.border}`};
  return (
    <button style={{border:"none",borderRadius:8,cursor:"pointer",fontFamily:font,
      fontWeight:600,transition:"all .15s",display:"inline-flex",alignItems:"center",
      gap:7,...sz,...v,...s}}
      onMouseEnter={e=>{e.currentTarget.style.opacity=".82";e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="";}}
      onClick={onClick}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, multiline, rows=3, style:s={}, type="text" }) {
  const shared = {width:"100%",fontFamily:font,fontSize:14,color:T.text,background:T.bg,
    border:`1.5px solid ${T.border}`,borderRadius:8,padding:"10px 14px",outline:"none",
    resize:"vertical",transition:"border .15s",boxSizing:"border-box",...s};
  const focus=(e)=>e.target.style.borderColor=T.accent;
  const blur =(e)=>e.target.style.borderColor=T.border;
  return multiline
    ? <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder} style={shared} onFocus={focus} onBlur={blur}/>
    : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={shared} onFocus={focus} onBlur={blur}/>;
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{fontFamily:font,fontSize:14,color:T.text,background:T.bg,
        border:`1.5px solid ${T.border}`,borderRadius:8,padding:"10px 14px",
        outline:"none",cursor:"pointer",width:"100%"}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  );
}

function Label({ children, style:s={} }) {
  return <div style={{fontSize:12,fontWeight:700,color:T.muted,letterSpacing:.5,
    textTransform:"uppercase",marginBottom:7,fontFamily:font,...s}}>{children}</div>;
}

function Card({ children, style:s={} }) {
  return <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:8,
    padding:24,boxShadow:T.shadow,...s}}>{children}</div>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,25,23,.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.surface,borderRadius:8,padding:32,width:"100%",
        maxWidth:wide?720:560,boxShadow:T.shadowMd,maxHeight:"90vh",overflowY:"auto",
        animation:"scaleIn .2s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h3 style={{margin:0,fontSize:20,fontFamily:serif,color:T.text}}>{title}</h3>
          <button onClick={onClose} style={{background:T.subtle,border:"none",borderRadius:8,
            width:32,height:32,cursor:"pointer",fontSize:16,color:T.muted,display:"flex",
            alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pill({ label, color, bg, border }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:99,
      fontSize:11,fontWeight:700,letterSpacing:.4,color,background:bg,
      border:border?`1.5px solid ${border}`:undefined}}>
      {label}
    </span>
  );
}

function Avatar({ name, size=36, color=T.accent }) {
  const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:size/2.5,flexShrink:0,
      background:`linear-gradient(135deg,${color}99,${color})`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*.34,fontWeight:700,color:"#fff",fontFamily:font}}>
      {initials}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={()=>onChange(!value)}
      style={{width:40,height:22,borderRadius:99,cursor:"pointer",flexShrink:0,
        background:value?T.accent:T.border,transition:"background .2s",position:"relative"}}>
      <div style={{position:"absolute",top:2.5,left:value?20:2.5,width:17,height:17,
        borderRadius:99,background:"#fff",transition:"left .2s",
        boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
    </div>
  );
}

const CT = { /* custom tooltip */
  content:({ active, payload, label })=>{
    if(!active||!payload?.length) return null;
    const v = payload[0].value;
    return (
      <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:8,
        padding:"8px 14px",fontSize:13,fontFamily:font,boxShadow:T.shadow}}>
        <div style={{color:T.muted,marginBottom:3}}>{label}</div>
        <div style={{color:T.accent,fontWeight:700}}>{typeof v==="number"&&v>999?v.toLocaleString():v}</div>
      </div>
    );
  }
};

/* ─── INBOX ───────────────────────────────────────────────── */
function Inbox({ toast, data }) {
  const source = data?.length ? data : INIT_CONVS;
  const [convs, setConvs] = useState(source);
  const [active, setActive] = useState(source[0]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("All");
  const messagesEndRef = useRef(null);

  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); },[active]);
  useEffect(()=>{ const next = data?.length ? data : INIT_CONVS; setConvs(next); setActive(next[0]); },[data]);

  const filtered = convs.filter(c=>filter==="All"||c.status===filter);

  const sendMsg = () => {
    if(!draft.trim()) return;
    const newMsg = {id:Date.now(),from:"agent",text:draft,time:"Now",agentName:"Dina"};
    setConvs(p=>p.map(c=>c.id===active.id?{...c,messages:[...c.messages,newMsg],status:"Escalated"}:c));
    setActive(p=>({...p,messages:[...p.messages,newMsg],status:"Escalated"}));
    portalAction("send_inbox_message", { conversationId: active.id, text: draft }).catch(()=>{});
    setDraft("");
  };

  const resolve = () => {
    setConvs(p=>p.map(c=>c.id===active.id?{...c,status:"Resolved",unread:0}:c));
    setActive(p=>({...p,status:"Resolved",unread:0}));
    portalAction("resolve_conversation", { conversationId: active.id }).catch(()=>{});
    toast("Conversation resolved");
  };
  const transferToBot = () => {
    const msg = {id:Date.now(),from:"bot",text:"Transferring you back to the automated assistant. Type your question and I'll help right away! 🤖",time:"Now"};
    setConvs(p=>p.map(c=>c.id===active.id?{...c,messages:[...c.messages,msg],status:"Bot"}:c));
    setActive(p=>({...p,messages:[...p.messages,msg],status:"Bot"}));
    toast("Transferred to bot");
  };

  const statusStyle = s => s==="Escalated"?{color:T.red,bg:T.redBg,bdr:T.redBdr}
    :s==="Resolved"?{color:T.accent,bg:T.accentBg,bdr:T.accentBdr}
    :{color:T.blue,bg:T.blueBg,bdr:T.blueBdr};

  return (
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* conversation list */}
      <div style={{width:300,borderRight:`1.5px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${T.border}`}}>
          <Input placeholder="Search…" value="" onChange={()=>{}} style={{fontSize:13,padding:"8px 12px"}}/>
          <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
            {["All","Escalated","Bot","Resolved"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:600,cursor:"pointer",
                  fontFamily:font,border:`1.5px solid ${filter===f?T.accent:T.border}`,
                  background:filter===f?T.accentBg:T.surface,color:filter===f?T.accent:T.muted}}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.map(c=>{
            const ss = statusStyle(c.status);
            const isActive = active?.id===c.id;
            return (
              <div key={c.id} onClick={()=>{setActive(c);setConvs(p=>p.map(x=>x.id===c.id?{...x,unread:0}:x));}}
                style={{padding:"14px 16px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,
                  background:isActive?T.accentBg:"transparent",transition:"background .1s"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <Avatar name={c.name} size={34} color={ss.color}/>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,fontWeight:700,color:T.text,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                      {c.unread>0&&<span style={{background:T.red,color:"#fff",borderRadius:99,
                        fontSize:10,fontWeight:700,padding:"1px 6px",flexShrink:0}}>{c.unread}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.muted,marginTop:1}}>
                      {c.messages[c.messages.length-1]?.text?.slice(0,38)}…
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <Pill label={c.status} color={ss.color} bg={ss.bg} border={ss.bdr}/>
                  <span style={{fontSize:10,color:T.muted}}>{c.messages[c.messages.length-1]?.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* chat panel */}
      {active ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* header */}
          <div style={{padding:"14px 24px",borderBottom:`1.5px solid ${T.border}`,
            display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Avatar name={active.name} size={38}/>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:T.text}}>{active.name}</div>
                <div style={{fontSize:12,color:T.muted}}>{active.phone} · {active.country}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {(() => { const ss=statusStyle(active.status); return <Pill label={active.status} color={ss.color} bg={ss.bg} border={ss.bdr}/>; })()}
              {active.status==="Escalated"&&<Btn small variant="secondary" onClick={transferToBot}>↩ Back to bot</Btn>}
              {active.status!=="Resolved"&&<Btn small onClick={resolve}>✓ Resolve</Btn>}
            </div>
          </div>

          {/* messages */}
          <div style={{flex:1,overflowY:"auto",padding:"24px 24px 12px",background:T.bg}}>
            {active.messages.map(m=>{
              const isUser = m.from==="customer";
              const isBot  = m.from==="bot";
              return (
                <div key={m.id} style={{display:"flex",justifyContent:isUser?"flex-start":"flex-end",
                  marginBottom:12}}>
                  <div style={{maxWidth:"70%"}}>
                    {(m.from==="agent")&&(
                      <div style={{fontSize:11,color:T.muted,marginBottom:3,textAlign:"right",fontWeight:600}}>
                        👤 {m.agentName||"Agent"}
                      </div>
                    )}
                    {isBot&&<div style={{fontSize:11,color:T.muted,marginBottom:3,textAlign:"right"}}>🤖 Bot</div>}
                    <div style={{padding:"10px 14px",borderRadius:isUser?"16px 16px 16px 4px":"16px 16px 4px 16px",
                      background:isUser?T.surface:isBot?"#e7f8ee":T.accent,
                      color:isUser?T.text:isBot?T.text:"#fff",
                      border:isUser?`1.5px solid ${T.border}`:isBot?`1.5px solid ${T.accentBdr}`:"none",
                      fontSize:14,lineHeight:1.6,whiteSpace:"pre-line"}}>
                      {m.text}
                    </div>
                    <div style={{fontSize:11,color:T.muted,marginTop:3,textAlign:isUser?"left":"right"}}>{m.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef}/>
          </div>

          {/* input */}
          <div style={{padding:"12px 24px",borderTop:`1.5px solid ${T.border}`,background:T.surface,
            display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea rows={2} value={draft} onChange={e=>setDraft(e.target.value)}
              placeholder="Reply as agent… (Enter to send)"
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
              style={{flex:1,fontFamily:font,fontSize:14,color:T.text,background:T.bg,
                border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 14px",
                outline:"none",resize:"none",transition:"border .15s"}}
              onFocus={e=>e.target.style.borderColor=T.accent}
              onBlur={e=>e.target.style.borderColor=T.border}/>
            <Btn onClick={sendMsg}>Send ➤</Btn>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted}}>
          Select a conversation
        </div>
      )}
    </div>
  );
}

/* ─── CONTACTS ────────────────────────────────────────────── */
function Contacts({ toast, data }) {
  const [contacts, setContacts] = useState(data?.length ? data : INIT_CONTACTS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(()=>{ if (data?.length) setContacts(data); },[data]);

  const filtered = contacts.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase())||
    c.phone.includes(search)
  );

  const flagOf = cc => ({SA:"🇸🇦",AE:"🇦🇪",LB:"🇱🇧",KW:"🇰🇼",EG:"🇪🇬"}[cc]||"🌍");

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Contacts</div>
          <div style={{color:T.muted,fontSize:14}}>{contacts.filter(c=>c.optIn).length} opted-in · {contacts.length} total</div>
        </div>
        <Btn variant="secondary">⬇ Export CSV</Btn>
      </div>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone…"
        style={{maxWidth:340,marginBottom:20}}/>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1.5px solid ${T.border}`,background:T.bg}}>
              {["Contact","Phone","Country","Opt-in","Tags","Conversations","Last Seen"].map(h=>(
                <th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11,color:T.muted,
                  fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} onClick={()=>setSelected(c)}
                style={{borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.subtle}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{padding:"12px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Avatar name={c.name} size={32}/>
                    <span style={{fontWeight:600,fontSize:14}}>{c.name}</span>
                  </div>
                </td>
                <td style={{padding:"12px 16px",fontSize:13,color:T.muted}}>{c.phone}</td>
                <td style={{padding:"12px 16px",fontSize:16}}>{flagOf(c.country)}</td>
                <td style={{padding:"12px 16px"}}>
                  <Pill label={c.optIn?"Opted In":"Opted Out"} color={c.optIn?T.accent:T.red}
                    bg={c.optIn?T.accentBg:T.redBg} border={c.optIn?T.accentBdr:T.redBdr}/>
                </td>
                <td style={{padding:"12px 16px"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {c.tags.map(t=><Pill key={t} label={t} color={T.muted} bg={T.subtle}/>)}
                  </div>
                </td>
                <td style={{padding:"12px 16px",fontSize:13,color:T.text,fontWeight:600}}>{c.convs}</td>
                <td style={{padding:"12px 16px",fontSize:12,color:T.muted}}>{c.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {selected&&(
        <Modal title={selected.name} onClose={()=>setSelected(null)}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <Avatar name={selected.name} size={56}/>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:T.text}}>{selected.name}</div>
              <div style={{fontSize:13,color:T.muted,marginTop:2}}>{selected.phone}</div>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                {selected.tags.map(t=><Pill key={t} label={t} color={T.muted} bg={T.subtle}/>)}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["Country",{ZA:"South Africa"}[selected.country]||selected.country],
              ["Conversations",selected.convs],["Opt-in Status",selected.optIn?"✓ Opted In":"✗ Opted Out"],
              ["Last Seen",selected.lastSeen]].map(([k,v])=>(
              <div key={k} style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:.4,textTransform:"uppercase",marginBottom:4}}>{k}</div>
                <div style={{fontSize:14,fontWeight:600,color:T.text}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="secondary" small onClick={()=>setSelected(null)}>Close</Btn>
            <Btn small danger>Block Contact</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── TEMPLATES ───────────────────────────────────────────── */
function Templates({ toast, data }) {
  const [items, setItems] = useState(data?.length ? data : INIT_TEMPLATES);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({name:"",category:"UTILITY",body:"",lang:"English"});
  const [nextId, setNextId] = useState(8);

  useEffect(()=>{ if (data?.length) setItems(data); },[data]);

  const statusStyle = s => s==="APPROVED"?{color:T.accent,bg:T.accentBg,bdr:T.accentBdr}
    :s==="PENDING"?{color:T.yellow,bg:T.yellowBg,bdr:T.yellowBdr}
    :{color:T.red,bg:T.redBg,bdr:T.redBdr};

  const submit = () => {
    if(!form.name.trim()||!form.body.trim()) return;
    setItems(p=>[...p,{...form,id:nextId,status:"PENDING",vars:[],uses:0}]);
    portalAction("save_templates", { templates: [...items, {...form,id:nextId,status:"PENDING",vars:[],uses:0}] }).catch(()=>{});
    setNextId(n=>n+1);
    setModal(false);
    toast("Template submitted to Meta for review");
  };

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Message Templates</div>
          <div style={{color:T.muted,fontSize:14}}>Templates must be approved by Meta before sending</div>
        </div>
        <Btn onClick={()=>setModal(true)}>+ New Template</Btn>
      </div>

      <div style={{background:T.yellowBg,border:`1.5px solid ${T.yellowBdr}`,borderRadius:12,
        padding:"12px 18px",marginBottom:24,fontSize:13,color:T.yellow,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:18}}>⚡</span>
        <span><b>Meta review takes 24–48 hours.</b> Templates with restricted content may be rejected. Marketing templates require explicit opt-in from customers.</span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {items.map(t=>{
          const ss=statusStyle(t.status);
          return (
            <Card key={t.id} style={{padding:"18px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                    <code style={{fontSize:13,fontWeight:700,color:T.text,background:T.subtle,
                      padding:"2px 8px",borderRadius:6}}>{t.name}</code>
                    <Pill label={t.category} color={t.category==="MARKETING"?T.purple:T.blue}
                      bg={t.category==="MARKETING"?T.purpleBg:T.blueBg} border={t.category==="MARKETING"?T.purpleBdr:T.blueBdr}/>
                    <Pill label={t.status} color={ss.color} bg={ss.bg} border={ss.bdr}/>
                    <Pill label={t.lang} color={T.muted} bg={T.subtle}/>
                  </div>
                  <div style={{fontSize:14,color:T.muted,lineHeight:1.65,background:T.bg,
                    padding:"10px 14px",borderRadius:10,fontStyle:"italic"}}>{t.body}</div>
                  {t.vars.length>0&&(
                    <div style={{marginTop:8,fontSize:12,color:T.muted}}>
                      Variables: {t.vars.map(v=><code key={v} style={{background:T.subtle,padding:"1px 6px",
                        borderRadius:4,margin:"0 3px"}}>{`{{${v}}}`}</code>)}
                    </div>
                  )}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {t.uses>0&&<div style={{fontSize:13,color:T.muted,marginBottom:4}}>{t.uses.toLocaleString()} sends</div>}
                  {t.status==="REJECTED"&&(
                    <Btn small variant="secondary" onClick={()=>toast("Template resubmitted")}>Resubmit</Btn>
                  )}
                  {t.status==="APPROVED"&&(
                    <Btn small variant="secondary">Use in broadcast</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal&&(
        <Modal title="Submit New Template" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <Label>Template Name (snake_case)</Label>
              <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value.toLowerCase().replace(/\s+/g,"_")}))} placeholder="e.g. order_confirmation"/>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><Label>Category</Label><Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={["UTILITY","MARKETING","AUTHENTICATION"]}/></div>
              <div style={{flex:1}}><Label>Language</Label><Select value={form.lang} onChange={e=>setForm(f=>({...f,lang:e.target.value}))} options={["English","isiXhosa","isiZulu","Afrikaans","Sesotho","Setswana"]}/></div>
            </div>
            <div>
              <Label>Message Body</Label>
              <Input multiline rows={5} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Use {{1}}, {{2}} for dynamic variables…"/>
              <div style={{fontSize:12,color:T.muted,marginTop:6}}>Variables like {"{{1}}"} will be replaced with real values when sent</div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModal(false)}>Cancel</Btn>
              <Btn onClick={submit}>Submit to Meta</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── ANALYTICS ───────────────────────────────────────────── */
function Analytics({ data }) {
  const [range, setRange] = useState("30d");
  const sourceMessages = data?.messages?.length ? data.messages : ANALYTICS_MSGS;
  const sourceQuestions = data?.topQuestions?.length ? data.topQuestions : TOP_QUESTIONS;
  const sourceResolution = data?.resolution?.length ? data.resolution : RESOLUTION;
  const chartData = range==="7d" ? sourceMessages.slice(-7) : range==="14d" ? sourceMessages.slice(-14) : sourceMessages;

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Analytics</div>
          <div style={{color:T.muted,fontSize:14}}>Bot performance for your Takealot Partner Support assistant</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {["7d","14d","30d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)}
              style={{padding:"7px 14px",borderRadius:8,border:`1.5px solid ${range===r?T.accent:T.border}`,
                background:range===r?T.accentBg:T.surface,color:range===r?T.accent:T.muted,
                fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:font}}>
              {r==="7d"?"7 days":r==="14d"?"14 days":"30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:"flex",gap:14,marginBottom:28,flexWrap:"wrap"}}>
        {[
          {label:"Total Messages",    value:"2.71M", delta:"+8.3%", pos:true  },
          {label:"Resolution Rate",   value:"86.4%",  delta:"+2.1%", pos:true  },
          {label:"Escalation Rate",   value:"9.2%",   delta:"-1.4%", pos:true  },
          {label:"Avg Response Time", value:"0.4s",   delta:"-0.1s", pos:true  },
        ].map(k=>(
          <div key={k.label} style={{flex:"1 1 160px",background:T.card,border:`1.5px solid ${T.border}`,
            borderRadius:16,padding:"18px 20px",boxShadow:T.shadow}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:26,fontFamily:serif,color:T.text,lineHeight:1,marginBottom:6}}>{k.value}</div>
            <div style={{fontSize:12,fontWeight:600,color:k.pos?T.accent:T.red}}>{k.delta} vs prev period</div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div style={{display:"flex",gap:20,marginBottom:24,flexWrap:"wrap"}}>
        <Card style={{flex:2,minWidth:300}}>
          <div style={{fontSize:13,color:T.muted,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",marginBottom:20}}>Message Volume</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T.accent} stopOpacity={.2}/>
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="d" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} interval={Math.floor(chartData.length/6)}/>
              <YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={CT.content}/>
              <Area type="monotone" dataKey="msgs" stroke={T.accent} strokeWidth={2.5} fill="url(#msgGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{flex:1,minWidth:240}}>
          <div style={{fontSize:13,color:T.muted,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",marginBottom:20}}>Resolution Rate</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sourceResolution}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="week" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis domain={[75,100]} tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip content={CT.content}/>
              <Line type="monotone" dataKey="rate" stroke={T.accent} strokeWidth={2.5} dot={{fill:T.accent,r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div style={{fontSize:13,color:T.muted,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",marginBottom:20}}>Top Questions</div>
        {sourceQuestions.map(q=>(
          <div key={q.q} style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
            <div style={{fontSize:13,color:T.text,width:180,flexShrink:0}}>{q.q}</div>
            <div style={{flex:1,background:T.bg,borderRadius:99,height:8,overflow:"hidden"}}>
              <div style={{width:`${q.pct}%`,background:q.q==="Other / Unmatched"?T.yellow:T.accent,
                height:"100%",borderRadius:99,transition:"width 1s ease"}}/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:T.text,width:36,textAlign:"right"}}>{q.pct}%</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── FLOW BUILDER ────────────────────────────────────────── */
function FlowBuilder({ toast, data, refreshPortal }) {
  const [nodes, setNodes] = useState(data?.length ? data : FLOW_NODES);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({label:"",content:"",type:"message",outputs:[]});
  const [addModal, setAddModal] = useState(false);
  const [newNode, setNewNode] = useState({label:"",content:"",type:"message",connectFrom:""});
  const [previewInput, setPreviewInput] = useState("");
  const [previewLog, setPreviewLog] = useState([]);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const lastDragMoved = useRef(false);

  const CANVAS_W = 1040;
  const CANVAS_H = 620;
  useEffect(()=>{ if (data?.length) setNodes(data); },[data]);
  const persistFlow = next => {
    setNodes(next);
    portalAction("save_flow", { flowNodes: next }).catch(()=>{});
  };
  const nodeWidth = type => type==="end" ? 128 : 220;
  const nodeHeight = type => type==="end" ? 78 : 116;
  const clampNode = (node, x, y) => ({
    x: Math.max(16, Math.min(CANVAS_W - nodeWidth(node.type) - 16, x)),
    y: Math.max(16, Math.min(CANVAS_H - nodeHeight(node.type) - 16, y)),
  });

  useEffect(()=>{
    const move = e => {
      if(!dragRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      const node = nodes.find(n=>n.id===dragRef.current.id);
      if(!rect || !node) return;
      const pos = clampNode(node, e.clientX - rect.left - dragRef.current.offsetX, e.clientY - rect.top - dragRef.current.offsetY);
      lastDragMoved.current = true;
      setNodes(prev=>prev.map(n=>n.id===node.id?{...n,...pos}:n));
    };
    const up = () => {
      if(!dragRef.current) return;
      const id = dragRef.current.id;
      dragRef.current = null;
      setNodes(prev=>{
        portalAction("save_flow", { flowNodes: prev }).catch(()=>{});
        const node = prev.find(n=>n.id===id);
        if (node) setEditForm({label:node.label || "",content:node.content || "",type:node.type || "message",outputs:node.outputs || []});
        return prev;
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return ()=>{
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [nodes]);

  const nodeStyle = type => ({
    start:    {bg:T.accentBg,border:T.accentBdr,color:T.accent,icon:"▶"},
    message:  {bg:T.blueBg,  border:T.blueBdr,  color:T.blue,  icon:"💬"},
    menu:     {bg:T.yellowBg,border:T.yellowBdr,color:T.yellow,icon:"☰"},
    action:   {bg:T.redBg,   border:T.redBdr,   color:T.red,   icon:"⚡"},
    end:      {bg:T.subtle,  border:T.borderDark,color:T.muted, icon:"●"},
  }[type]||{bg:T.bg,border:T.border,color:T.muted,icon:"?"});

  const openEdit = (n,e) => {
    e.stopPropagation();
    if(lastDragMoved.current) {
      lastDragMoved.current = false;
      return;
    }
    setSelected(n.id);
    setEditForm({label:n.label || "",content:n.content || "",type:n.type || "message",outputs:n.outputs || []});
  };
  const beginDrag = (n,e) => {
    if(e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    setSelected(n.id);
    setEditForm({label:n.label || "",content:n.content || "",type:n.type || "message",outputs:n.outputs || []});
    dragRef.current = { id:n.id, offsetX:e.clientX - rect.left - n.x, offsetY:e.clientY - rect.top - n.y };
  };
  const saveEdit = () => {
    const next = nodes.map(n=>n.id===selected?{...n,...editForm,outputs:editForm.outputs || []}:n);
    persistFlow(next);
    setSelected(null);
    toast("Flow updated");
  };
  const addNode = () => {
    if(!newNode.label.trim()) return;
    const id = `node-${Date.now().toString(36)}`;
    const source = nodes.find(n=>n.id===newNode.connectFrom);
    const pos = source ? clampNode({type:newNode.type}, source.x + 280, source.y + 24) : clampNode({type:newNode.type}, 420, 440);
    const nextNode = {id,type:newNode.type,label:newNode.label.trim(),content:newNode.content.trim(),x:pos.x,y:pos.y,outputs:[]};
    const next = [
      ...nodes.map(n=>n.id===newNode.connectFrom?{...n,outputs:[...new Set([...(n.outputs || []),id])]}:n),
      nextNode,
    ];
    persistFlow(next);
    setNewNode({label:"",content:"",type:"message",connectFrom:""});
    setAddModal(false);
    setSelected(id);
    setEditForm({label:nextNode.label,content:nextNode.content,type:nextNode.type,outputs:[]});
    toast("Node added");
  };
  const deleteNode = () => {
    const selectedNode = nodes.find(n=>n.id===selected);
    if(!selectedNode || selectedNode.type==="start") {
      toast("Start node cannot be deleted", "warning");
      return;
    }
    const next = nodes
      .filter(n=>n.id!==selected)
      .map(n=>({...n,outputs:(n.outputs || []).filter(id=>id!==selected)}));
    persistFlow(next);
    setSelected(null);
    toast("Node deleted");
  };
  const duplicateNode = () => {
    const selectedNode = nodes.find(n=>n.id===selected);
    if(!selectedNode) return;
    const id = `node-${Date.now().toString(36)}`;
    const pos = clampNode(selectedNode, selectedNode.x + 28, selectedNode.y + 28);
    const duplicate = {...selectedNode,id,label:`${selectedNode.label} copy`,x:pos.x,y:pos.y,outputs:[]};
    persistFlow([...nodes, duplicate]);
    setSelected(id);
    setEditForm({label:duplicate.label,content:duplicate.content || "",type:duplicate.type || "message",outputs:[]});
    toast("Node duplicated");
  };
  const autoLayout = () => {
    const start = nodes.find(n=>n.type==="start") || nodes[0];
    if(!start) return;
    const levels = new Map([[start.id,0]]);
    const queue = [start.id];
    while(queue.length) {
      const id = queue.shift();
      const node = nodes.find(n=>n.id===id);
      (node?.outputs || []).forEach(out=>{
        if(!levels.has(out)) {
          levels.set(out, (levels.get(id) || 0) + 1);
          queue.push(out);
        }
      });
    }
    const buckets = {};
    nodes.forEach(n=>{
      const level = levels.has(n.id) ? levels.get(n.id) : 3;
      buckets[level] = [...(buckets[level] || []), n.id];
    });
    const next = nodes.map(n=>{
      const level = levels.has(n.id) ? levels.get(n.id) : 3;
      const group = buckets[level] || [];
      const index = group.indexOf(n.id);
      const count = group.length || 1;
      const pos = clampNode(n, 48 + level * 260, Math.max(28, (CANVAS_H / 2) - ((count - 1) * 72) + index * 144));
      return {...n,...pos};
    });
    persistFlow(next);
    toast("Flow laid out");
  };
  const resetFlow = () => {
    persistFlow(FLOW_NODES.map(n=>({...n})));
    setSelected(null);
    setPreviewLog([]);
    toast("Flow reset to default");
  };
  const validateFlow = () => {
    const warnings = [];
    const ids = new Set(nodes.map(n=>n.id));
    const start = nodes.find(n=>n.type==="start");
    if(!start) warnings.push("Add one Start node.");
    nodes.forEach(n=>{
      if(!String(n.label || "").trim()) warnings.push(`${n.id} needs a label.`);
      if(n.type!=="start" && n.type!=="end" && !String(n.content || "").trim()) warnings.push(`${n.label || n.id} needs message content.`);
      (n.outputs || []).forEach(out=>{ if(!ids.has(out)) warnings.push(`${n.label || n.id} connects to a missing node.`); });
    });
    if(start) {
      const reached = new Set([start.id]);
      const queue = [start.id];
      while(queue.length) {
        const node = nodes.find(n=>n.id===queue.shift());
        (node?.outputs || []).forEach(out=>{
          if(ids.has(out) && !reached.has(out)) {
            reached.add(out);
            queue.push(out);
          }
        });
      }
      nodes.filter(n=>!reached.has(n.id)).forEach(n=>warnings.push(`${n.label || n.id} is not connected to the Start path.`));
    }
    return warnings;
  };
  const flowWarnings = validateFlow();
  const runPreview = () => {
    const start = nodes.find(n=>n.type==="start") || nodes[0];
    if(!start) return toast("Add a start node first", "warning");
    const trail = [];
    let current = start;
    const seen = new Set();
    const input = previewInput.trim().toLowerCase();
    for(let i=0;i<8 && current && !seen.has(current.id);i+=1) {
      seen.add(current.id);
      trail.push(current);
      const outputs = current.outputs || [];
      if(!outputs.length) break;
      let nextId = outputs[0];
      if(current.type==="menu" && input) {
        const numeric = input.match(/\d+/)?.[0];
        if(numeric && outputs[Number(numeric)-1]) nextId = outputs[Number(numeric)-1];
        if(input.includes("agent")) nextId = outputs.find(id=>nodes.find(n=>n.id===id)?.type==="action") || nextId;
        if(input.includes("book")) nextId = outputs.find(id=>/book/i.test(nodes.find(n=>n.id===id)?.label || "")) || nextId;
        if(input.includes("faq")) nextId = outputs.find(id=>/faq/i.test(nodes.find(n=>n.id===id)?.label || "")) || nextId;
      }
      current = nodes.find(n=>n.id===nextId);
    }
    setPreviewLog(trail);
  };
  const publishFlow = async () => {
    if(flowWarnings.length) {
      toast(`Fix ${flowWarnings.length} flow issue${flowWarnings.length===1?"":"s"} before publishing`, "warning");
      return;
    }
    try {
      const response = await portalAction("publish_flow", { flowNodes: nodes });
      const requestNumber = response?.workspace?.lastPublishedFlow?.requestNumber;
      await refreshPortal?.();
      toast(requestNumber ? `Flow sent to CRM for approval: ${requestNumber}` : "Flow sent to CRM for approval");
    } catch (error) {
      toast(error.message || "Could not publish flow", "warning");
    }
  };

  // build SVG paths between nodes
  const paths = [];
  nodes.forEach(src=>{
    (src.outputs || []).forEach(tgtId=>{
      const tgt = nodes.find(n=>n.id===tgtId);
      if(!tgt) return;
      const x1=src.x+nodeWidth(src.type), y1=src.y+Math.round(nodeHeight(src.type)/2), x2=tgt.x, y2=tgt.y+Math.round(nodeHeight(tgt.type)/2);
      const mx=(x1+x2)/2;
      paths.push(<path key={`${src.id}-${tgtId}`}
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
        fill="none" stroke={T.borderDark} strokeWidth={1.5} strokeDasharray="none"
        markerEnd="url(#arrow)"/>);
    });
  });

  const selectedNode = nodes.find(n=>n.id===selected);

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Flow Builder</div>
          <div style={{color:T.muted,fontSize:14}}>Click a node to edit its message content</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" small onClick={autoLayout}>Auto layout</Btn>
          <Btn variant="secondary" small onClick={resetFlow}>Reset</Btn>
          <Btn variant="secondary" small onClick={()=>setAddModal(true)}>+ Add node</Btn>
          <Btn small onClick={publishFlow} style={flowWarnings.length?{opacity:.6}:{}}>Publish Flow</Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(280px,1.1fr) minmax(260px,.9fr)",gap:16,marginBottom:18}}>
        <Card style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,color:T.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:.5}}>Publish readiness</div>
              <div style={{fontSize:20,fontWeight:800,color:flowWarnings.length?T.yellow:T.teal,marginTop:4}}>
                {flowWarnings.length ? `${flowWarnings.length} item${flowWarnings.length===1?"":"s"} to fix` : "Ready for CRM approval"}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:800,color:T.text,background:T.bg,border:`1px solid ${T.border}`,borderRadius:99,padding:"6px 10px"}}>{nodes.length} nodes</span>
              <span style={{fontSize:12,fontWeight:800,color:T.text,background:T.bg,border:`1px solid ${T.border}`,borderRadius:99,padding:"6px 10px"}}>{nodes.reduce((sum,n)=>sum+(n.outputs || []).length,0)} links</span>
            </div>
          </div>
          {flowWarnings.length>0&&(
            <div style={{display:"grid",gap:6,marginTop:12}}>
              {flowWarnings.slice(0,4).map(w=><div key={w} style={{fontSize:12,color:T.yellow,fontWeight:700}}>- {w}</div>)}
              {flowWarnings.length>4&&<div style={{fontSize:12,color:T.muted}}>+ {flowWarnings.length-4} more</div>}
            </div>
          )}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:12,color:T.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Test path</div>
          <div style={{display:"flex",gap:8}}>
            <Input value={previewInput} onChange={e=>setPreviewInput(e.target.value)} placeholder="Try: 1, book, faq, agent" style={{padding:"8px 10px",fontSize:13}}/>
            <Btn small onClick={runPreview}>Run</Btn>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
            {(previewLog.length ? previewLog : [nodes.find(n=>n.type==="start")].filter(Boolean)).map(n=>(
              <span key={n.id} style={{fontSize:11,fontWeight:800,color:T.teal,background:T.blueBg,border:`1px solid ${T.blueBdr}`,borderRadius:99,padding:"5px 8px"}}>{n.label}</span>
            ))}
          </div>
        </Card>
      </div>

      {/* legend */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        {[["start","Start"],["menu","Menu"],["message","Message"],["action","Action"],["end","End"]].map(([type,label])=>{
          const s=nodeStyle(type);
          return (
            <div key={type} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:12,height:12,borderRadius:3,background:s.bg,border:`1.5px solid ${s.border}`}}/>
              <span style={{fontSize:12,color:T.muted,fontWeight:500}}>{label}</span>
            </div>
          );
        })}
      </div>

      <Card style={{padding:0,overflow:"auto"}}>
        <div ref={canvasRef} style={{position:"relative",width:CANVAS_W,height:CANVAS_H,minWidth:CANVAS_W}}>
          {/* SVG connections */}
          <svg style={{position:"absolute",top:0,left:0,width:CANVAS_W,height:CANVAS_H,pointerEvents:"none"}}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={T.borderDark}/>
              </marker>
            </defs>
            {paths}
          </svg>

          {/* nodes */}
          {nodes.map(n=>{
            const s=nodeStyle(n.type);
            const isSel=selected===n.id;
            if(n.type==="end") return (
              <div key={n.id} onMouseDown={e=>beginDrag(n,e)} onClick={e=>openEdit(n,e)} style={{position:"absolute",left:n.x,top:n.y,width:128,
                height:72,borderRadius:12,background:s.bg,border:`1.5px solid ${isSel?T.accent:s.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                boxShadow:isSel?`0 0 0 3px ${T.accentBg}`:T.shadow}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16}}>{s.icon}</div>
                  <div style={{fontSize:11,color:s.color,fontWeight:600,marginTop:4}}>{n.label}</div>
                </div>
              </div>
            );
            return (
              <div key={n.id} onMouseDown={e=>beginDrag(n,e)} onClick={e=>openEdit(n,e)}
                style={{position:"absolute",left:n.x,top:n.y,width:220,
                  borderRadius:14,background:s.bg,border:`1.5px solid ${isSel?T.accent:s.border}`,
                  padding:"12px 14px",cursor:"pointer",transition:"all .15s",
                  boxShadow:isSel?`0 0 0 3px ${T.accentBg}`:T.shadow}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=T.shadowMd;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=isSel?`0 0 0 3px ${T.accentBg}`:T.shadow;}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:14}}>{s.icon}</span>
                  <span style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:.4}}>{n.type}</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:n.content?6:0}}>{n.label}</div>
                {n.content&&<div style={{fontSize:11,color:T.muted,lineHeight:1.5,overflow:"hidden",
                  display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{n.content}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {selected&&selectedNode&&(
        <Modal title={`Edit: ${selectedNode.label}`} onClose={()=>setSelected(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div><Label>Node Label</Label><Input value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))}/></div>
            <div><Label>Node Type</Label><Select value={editForm.type} onChange={e=>setEditForm(f=>({...f,type:e.target.value}))} options={["start","menu","message","action","end"]}/></div>
            <div><Label>Message Content</Label><Input multiline rows={5} value={editForm.content} onChange={e=>setEditForm(f=>({...f,content:e.target.value}))} placeholder="What the bot says at this step…"/></div>
            <div>
              <Label>Connect To</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {nodes.filter(n=>n.id!==selected).map(n=>(
                  <label key={n.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:13,color:T.text,background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px"}}>
                    <input type="checkbox" checked={(editForm.outputs || []).includes(n.id)}
                      onChange={e=>setEditForm(f=>({...f,outputs:e.target.checked?[...(f.outputs || []),n.id]:(f.outputs || []).filter(id=>id!==n.id)}))}/>
                    {n.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Btn variant="secondary" onClick={duplicateNode}>Duplicate</Btn>
                <Btn danger onClick={deleteNode}>Delete Node</Btn>
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn variant="secondary" onClick={()=>setSelected(null)}>Cancel</Btn>
                <Btn onClick={saveEdit}>Save Node</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {addModal&&(
        <Modal title="Add Flow Node" onClose={()=>setAddModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div><Label>Node Label</Label><Input value={newNode.label} onChange={e=>setNewNode(f=>({...f,label:e.target.value}))} placeholder="Example: Booking menu"/></div>
            <div><Label>Node Type</Label><Select value={newNode.type} onChange={e=>setNewNode(f=>({...f,type:e.target.value}))} options={["menu","message","action","end"]}/></div>
            <div><Label>Message Content</Label><Input multiline rows={4} value={newNode.content} onChange={e=>setNewNode(f=>({...f,content:e.target.value}))} placeholder="What this node should say or do..."/></div>
            <div><Label>Connect From</Label><Select value={newNode.connectFrom} onChange={e=>setNewNode(f=>({...f,connectFrom:e.target.value}))} options={["",...nodes.map(n=>n.id)]}/></div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setAddModal(false)}>Cancel</Btn>
              <Btn onClick={addNode}>Add Node</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── BROADCASTS ──────────────────────────────────────────── */
function Broadcasts({ toast, data }) {
  const [campaigns, setCampaigns] = useState(data?.length ? data : INIT_BROADCASTS);
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({name:"",template:"order_confirmed",segment:"All subscribers",date:"",time:""});
  const [nextId, setNextId] = useState(5);

  useEffect(()=>{ if (data?.length) setCampaigns(data); },[data]);

  const statusStyle = s => s==="Sent"?{color:T.accent,bg:T.accentBg,bdr:T.accentBdr}
    :s==="Scheduled"?{color:T.blue,bg:T.blueBg,bdr:T.blueBdr}
    :{color:T.muted,bg:T.subtle,bdr:T.borderDark};

  const create = () => {
    setCampaigns(p=>[...p,{...form,id:nextId,status:"Scheduled",sent:0,delivered:0,read:0,
      scheduled:`${form.date} ${form.time}`,sentAt:null}]);
    portalAction("save_broadcasts", { broadcasts: [...campaigns,{...form,id:nextId,status:"Scheduled",sent:0,delivered:0,read:0,scheduled:`${form.date} ${form.time}`,sentAt:null}] }).catch(()=>{});
    setNextId(n=>n+1);
    setModal(false); setStep(1);
    setForm({name:"",template:"order_confirmed",segment:"All subscribers",date:"",time:""});
    toast("Campaign scheduled!");
  };

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Broadcasts</div>
          <div style={{color:T.muted,fontSize:14}}>Send outbound WhatsApp messages to opted-in subscribers</div>
        </div>
        <Btn onClick={()=>setModal(true)}>+ New Campaign</Btn>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {campaigns.map(c=>{
          const ss=statusStyle(c.status);
          const delivRate = c.sent>0 ? Math.round(c.delivered/c.sent*100) : null;
          const readRate  = c.delivered>0 ? Math.round(c.read/c.delivered*100) : null;
          return (
            <Card key={c.id} style={{padding:"20px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:16,fontWeight:700,color:T.text}}>{c.name}</span>
                    <Pill label={c.status} color={ss.color} bg={ss.bg} border={ss.bdr}/>
                  </div>
                  <div style={{fontSize:13,color:T.muted,marginBottom:c.status!=="Draft"?12:0}}>
                    Template: <code style={{background:T.subtle,padding:"1px 6px",borderRadius:4}}>{c.template}</code>
                    {" · "}{c.segment}
                    {c.sentAt&&` · Sent ${c.sentAt}`}
                    {c.scheduled&&!c.sentAt&&` · Scheduled ${c.scheduled}`}
                  </div>
                  {c.status==="Sent"&&(
                    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                      {[["📤 Sent",c.sent.toLocaleString()],["✓ Delivered",`${c.delivered.toLocaleString()} (${delivRate}%)`],["👁 Read",`${c.read.toLocaleString()} (${readRate}%)`]].map(([k,v])=>(
                        <div key={k}>
                          <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:.3}}>{k}</div>
                          <div style={{fontSize:15,fontWeight:700,color:T.text}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {c.status==="Draft"&&<Btn small onClick={()=>setModal(true)}>Continue →</Btn>}
              </div>
            </Card>
          );
        })}
      </div>

      {modal&&(
        <Modal title="New Broadcast Campaign" onClose={()=>{setModal(false);setStep(1);}}>
          {/* step indicator */}
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            {["Select Template","Audience","Schedule"].map((s,i)=>(
              <div key={s} style={{flex:1,textAlign:"center"}}>
                <div style={{width:28,height:28,borderRadius:99,margin:"0 auto 6px",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,
                  background:step===i+1?T.accent:step>i+1?T.accentBg:T.subtle,
                  color:step===i+1?"#fff":step>i+1?T.accent:T.muted,
                  border:`1.5px solid ${step>=i+1?T.accent:T.border}`}}>
                  {step>i+1?"✓":i+1}
                </div>
                <div style={{fontSize:11,color:step===i+1?T.accent:T.muted,fontWeight:600}}>{s}</div>
              </div>
            ))}
          </div>

          {step===1&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div><Label>Campaign Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Eid Mubarak Sale"/></div>
              <div><Label>Template</Label>
                <Select value={form.template} onChange={e=>setForm(f=>({...f,template:e.target.value}))}
                  options={INIT_TEMPLATES.filter(t=>t.status==="APPROVED").map(t=>({value:t.name,label:t.name}))}/>
              </div>
              <div style={{background:T.accentBg,border:`1.5px solid ${T.accentBdr}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:T.muted}}>
                {INIT_TEMPLATES.find(t=>t.name===form.template)?.body}
              </div>
            </div>
          )}
          {step===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div><Label>Audience Segment</Label>
                <Select value={form.segment} onChange={e=>setForm(f=>({...f,segment:e.target.value}))}
                  options={["All subscribers","VIP customers","Cart abandoners","Inactive (30+ days)","South Africa only","Western Cape only"]}/>
              </div>
              <div style={{background:T.accentBg,border:`1.5px solid ${T.accentBdr}`,borderRadius:10,padding:"14px"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.accent,marginBottom:4}}>Estimated reach</div>
                <div style={{fontSize:24,fontFamily:serif,color:T.text}}>{form.segment==="VIP customers"?"3,840":form.segment==="Cart abandoners"?"4,120":"18,230"}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>opted-in contacts</div>
              </div>
            </div>
          )}
          {step===3&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",gap:12}}>
                <div style={{flex:1}}><Label>Send Date</Label><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
                <div style={{flex:1}}><Label>Send Time (SAST)</Label><Input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
              </div>
              <div style={{background:T.yellowBg,border:`1.5px solid ${T.yellowBdr}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:T.yellow}}>
                ⚠ Scheduled sends can't be cancelled within 30 minutes of delivery time.
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}>
            {step>1&&<Btn variant="secondary" onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
            {step<3?<Btn onClick={()=>setStep(s=>s+1)} style={{opacity:(!form.name&&step===1)?0.5:1}}>Next →</Btn>
            :<Btn onClick={create}>Schedule Campaign</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── BILLING ──────────────────────────────────────────────── */
function Billing({ toast }) {
  const usage = [{label:"Messages",used:2710000,limit:5000000},{label:"Bots",used:6,limit:10},{label:"Contacts",used:10,limit:50000},{label:"Team seats",used:3,limit:10}];
  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Billing &amp; Plan</div>
      <div style={{color:T.muted,fontSize:14,marginBottom:28}}>Manage your subscription and usage</div>

      <div style={{display:"flex",gap:20,marginBottom:24,flexWrap:"wrap"}}>
        <Card style={{flex:2,minWidth:280}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:11,color:T.muted,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>Current Plan</div>
              <div style={{fontFamily:serif,fontSize:28,color:T.text,lineHeight:1}}>Enterprise</div>
              <div style={{fontSize:14,color:T.muted,marginTop:6}}>R73,500 / month · Renews 1 Jun 2026</div>
            </div>
            <Btn small variant="secondary">Manage plan</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {usage.map(u=>{
              const pct=Math.round(u.used/u.limit*100);
              const col=pct>85?T.red:pct>65?T.yellow:T.accent;
              return (
                <div key={u.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
                    <span style={{fontWeight:600,color:T.text}}>{u.label}</span>
                    <span style={{color:T.muted}}>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</span>
                  </div>
                  <div style={{background:T.bg,borderRadius:99,height:8}}>
                    <div style={{width:`${pct}%`,background:col,borderRadius:99,height:"100%",transition:"width 1s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{flex:1,minWidth:220}}>
          <div style={{fontFamily:serif,fontSize:18,color:T.text,marginBottom:16}}>Upgrade options</div>
          {[{name:"Scale",price:"R28,000",msgs:"1M msgs",bots:3},{name:"Enterprise+",price:"R150,000",msgs:"Unlimited",bots:"Unlimited"}].map(p=>(
            <div key={p.name} style={{border:`1.5px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:4}}>{p.name}</div>
              <div style={{fontSize:13,color:T.muted,marginBottom:10}}>{p.msgs} · {p.bots} bots</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:16,fontWeight:700,color:T.accent}}>{p.price}/mo</span>
                <Btn small onClick={()=>toast(`Contact sales to upgrade to ${p.name}`)}>Upgrade</Btn>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <div style={{fontFamily:serif,fontSize:20,color:T.text,marginBottom:16}}>Invoice History</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1.5px solid ${T.border}`}}>
              {["Invoice","Date","Plan","Amount","Status",""].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:T.muted,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv,i)=>(
              <tr key={inv.id} style={{borderBottom:i<INVOICES.length-1?`1px solid ${T.border}`:"none"}}>
                <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:T.text}}><code style={{background:T.subtle,padding:"2px 7px",borderRadius:6}}>{inv.id}</code></td>
                <td style={{padding:"12px 14px",fontSize:13,color:T.muted}}>{inv.date}</td>
                <td style={{padding:"12px 14px",fontSize:13,color:T.muted}}>{inv.plan}</td>
                <td style={{padding:"12px 14px",fontSize:14,fontWeight:700,color:T.text}}>{fmtRand(inv.amount)}</td>
                <td style={{padding:"12px 14px"}}><Pill label={inv.status} color={T.accent} bg={T.accentBg} border={T.accentBdr}/></td>
                <td style={{padding:"12px 14px"}}><button onClick={()=>toast("Invoice downloaded")} style={{background:T.subtle,border:"none",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,color:T.muted,cursor:"pointer"}}>⬇ PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ─── SIMULATOR ────────────────────────────────────────────── */
function Simulator() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hello! Welcome to Takealot Partner Support.\n\nHow can I help you today?\n\n1. Track my order\n2. Returns & refunds\n3. Speak to an agent" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);

  const send = async () => {
    if(!input.trim()||loading) return;
    const userText = input;
    setInput("");
    const newMessages = [...messages, {role:"user",content:userText}];
    setMessages(newMessages);
    setLoading(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:`You are "Takealot Partner Support", a WhatsApp customer service bot for Takealot Partner Store, a South African e-commerce operation. Respond exactly as a WhatsApp bot would: short, friendly, and practical. Max 3-4 sentences unless listing steps.\n\nYour knowledge base:\n${INIT_QA.filter(q=>q.active).map(q=>`Q: ${q.question}\nA: ${q.answer}`).join("\n\n")}\n\nIf the user asks something outside your knowledge, offer to connect them with a human agent. Never break character.`,
          messages:newMessages
        })
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      setMessages(p=>[...p,{role:"assistant",content:text}]);
    } catch(e) {
      setMessages(p=>[...p,{role:"assistant",content:"⚠️ Error reaching bot. Please try again."}]);
    } finally { setLoading(false); }
  };

  const reset = () => setMessages([{role:"assistant",content:"Hello! Welcome to Takealot Partner Support.\n\nHow can I help you today?\n\n1. Track my order\n2. Returns & refunds\n3. Speak to an agent"}]);

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1,display:"flex",gap:32,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div style={{flex:1,minWidth:280}}>
        <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Bot Simulator</div>
        <div style={{color:T.muted,fontSize:14,marginBottom:24}}>Test your bot before going live — powered by your actual Q&A configuration</div>
        <Card style={{marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}}>📋 Current Configuration</div>
          <div style={{fontSize:13,color:T.muted,lineHeight:1.8}}>
            <div><b style={{color:T.text}}>Bot name:</b> Takealot Partner Support</div>
            <div><b style={{color:T.text}}>Language:</b> English</div>
            <div><b style={{color:T.text}}>Tone:</b> Friendly</div>
            <div><b style={{color:T.text}}>Active Q&As:</b> {INIT_QA.filter(q=>q.active).length} responses</div>
            <div><b style={{color:T.text}}>Escalation:</b> +27 83 456 7890</div>
          </div>
        </Card>
        <Card>
          <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:10}}>💡 Try asking:</div>
          {["Track order ZA-45892","What's your return policy?","Do you deliver to Durban?","I want a refund","AGENT"].map(s=>(
            <div key={s} onClick={()=>{setInput(s);}} style={{padding:"7px 12px",background:T.bg,
              border:`1.5px solid ${T.border}`,borderRadius:8,fontSize:13,color:T.muted,
              cursor:"pointer",marginBottom:6,transition:"all .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.text;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>
              {s}
            </div>
          ))}
        </Card>
      </div>

      {/* phone mockup */}
      <div style={{flexShrink:0,width:320}}>
        <div style={{background:"#111",borderRadius:40,padding:"14px 10px",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{background:"#1e2a1e",borderRadius:30,overflow:"hidden"}}>
            {/* phone header */}
            <div style={{background:"#075e54",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:99,background:T.accentLt,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🛍</div>
              <div>
                <div style={{color:"#fff",fontWeight:700,fontSize:14,fontFamily:font}}>Takealot Partner Support</div>
                <div style={{color:"rgba(255,255,255,.65)",fontSize:11,fontFamily:font}}>
                  {loading?"typing…":"online"}
                </div>
              </div>
            </div>
            {/* messages */}
            <div style={{height:480,overflowY:"auto",padding:"12px",background:"#0a1209",
              backgroundImage:"radial-gradient(circle at 20% 80%, rgba(18,140,74,.08) 0%, transparent 50%)"}}>
              {messages.map((m,i)=>{
                const isUser=m.role==="user";
                return (
                  <div key={i} style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",marginBottom:8}}>
                    <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:isUser?"12px 12px 2px 12px":"12px 12px 12px 2px",
                      background:isUser?"#005c4b":"#1f2b1f",
                      color:"#e8f5e9",fontSize:13,fontFamily:font,lineHeight:1.6,whiteSpace:"pre-line"}}>
                      {m.content}
                      <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:4,textAlign:"right"}}>
                        {new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                        {isUser&&" ✓✓"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {loading&&(
                <div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}>
                  <div style={{background:"#1f2b1f",padding:"10px 14px",borderRadius:"12px 12px 12px 2px",display:"flex",gap:4,alignItems:"center"}}>
                    {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:99,background:T.accentLt,animation:`bounce .8s ${i*.2}s infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>
            {/* input */}
            <div style={{background:"#1a2318",padding:"8px 10px",display:"flex",gap:8,alignItems:"center"}}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")send();}}
                placeholder="Message…"
                style={{flex:1,background:"#2a3528",border:"none",borderRadius:20,padding:"9px 14px",
                  color:"#e8f5e9",fontSize:13,fontFamily:font,outline:"none"}}/>
              <div onClick={send}
                style={{width:36,height:36,borderRadius:99,background:T.accentLt,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>
                ➤
              </div>
            </div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:12}}>
          <button onClick={reset} style={{background:T.subtle,border:"none",borderRadius:8,
            padding:"7px 16px",fontSize:12,fontWeight:600,color:T.muted,cursor:"pointer",fontFamily:font}}>
            ↺ Reset conversation
          </button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

/* ─── STATUS ───────────────────────────────────────────────── */
function Status() {
  const overall = STATUS_SERVICES.every(s=>s.status==="Operational");
  const degraded = STATUS_SERVICES.some(s=>s.status==="Degraded");
  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>System Status</div>
      <div style={{color:T.muted,fontSize:14,marginBottom:28}}>Real-time health of all MgucaTECH services</div>

      <div style={{borderRadius:16,padding:"20px 24px",marginBottom:28,
        background:degraded?T.yellowBg:T.accentBg,
        border:`1.5px solid ${degraded?T.yellowBdr:T.accentBdr}`}}>
        <div style={{fontSize:18,fontWeight:700,color:degraded?T.yellow:T.accent,marginBottom:4}}>
          {degraded?"⚠ Partial Degradation":"✓ All Systems Operational"}
        </div>
        <div style={{fontSize:14,color:T.muted}}>
          {degraded?"Broadcast Engine is experiencing elevated latency. All other services normal.":"No incidents reported in the past 24 hours."}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
        {STATUS_SERVICES.map(s=>{
          const col = s.status==="Operational"?T.accent:s.status==="Degraded"?T.yellow:T.red;
          return (
            <div key={s.name} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,
              padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,boxShadow:T.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:10,height:10,borderRadius:99,background:col,flexShrink:0,
                  boxShadow:`0 0 6px ${col}`}}/>
                <span style={{fontSize:14,fontWeight:600,color:T.text}}>{s.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:T.muted}}>Checked {s.lastCheck}</span>
                <span style={{fontWeight:700,fontSize:13,color:T.accent}}>{s.uptime}% uptime</span>
                <Pill label={s.status} color={col}
                  bg={s.status==="Operational"?T.accentBg:s.status==="Degraded"?T.yellowBg:T.redBg}
                  border={s.status==="Operational"?T.accentBdr:s.status==="Degraded"?T.yellowBdr:T.redBdr}/>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <div style={{fontFamily:serif,fontSize:20,color:T.text,marginBottom:16}}>Uptime — Last 5 Weeks</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={UPTIME_HISTORY} barSize={32}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="week" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis domain={[99,100]} tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
            <Tooltip content={CT.content}/>
            <Bar dataKey="up" fill={T.accent} radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ─── ONBOARDING ───────────────────────────────────────────── */
function Onboarding({ toast, user }) {
  const [steps, setSteps] = useState(ONBOARDING_STEPS);
  const done = steps.filter(s=>s.done).length;
  const pct = Math.round(done/steps.length*100);
  const clientOpen = steps.filter(s=>!s.done && s.owner==="Client").length;
  const mgucaOpen = steps.filter(s=>!s.done && s.owner==="MgucaTECH").length;

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Setup Checklist</div>
      <div style={{color:T.muted,fontSize:14,marginBottom:28}}>Complete your WhatsApp, Book Now, and portal launch steps in South African time.</div>

      <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:20,padding:28,marginBottom:28,boxShadow:T.shadow,maxWidth:640}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:15,color:T.text}}>{done} of {steps.length} complete</div>
          <div style={{fontFamily:serif,fontSize:22,color:T.accent}}>{pct}%</div>
        </div>
        <div style={{background:T.bg,borderRadius:99,height:10,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,background:`linear-gradient(90deg,${T.accent},${T.accentLt})`,
            height:"100%",borderRadius:99,transition:"width 1s ease"}}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(160px,1fr))",gap:12,maxWidth:760,marginBottom:18}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Client actions</div>
          <div style={{fontSize:26,fontWeight:800,color:T.accent}}>{clientOpen}</div>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>MgucaTECH actions</div>
          <div style={{fontSize:26,fontWeight:800,color:T.blue}}>{mgucaOpen}</div>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Bookings</div>
            <Btn small onClick={()=>openBookNow(user)}>Open Book Now</Btn>
        </Card>
      </div>

      <div style={{background:T.blueBg,border:`1.5px solid ${T.blueBdr}`,borderRadius:12,padding:"14px 18px",maxWidth:760,marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:700,color:T.blue,marginBottom:4}}>South African launch defaults</div>
        <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>Currency: Rand (R) · Timezone: SAST / Africa/Johannesburg · Support: admin@mgucatech.com · WhatsApp: +27 76 047 0141</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:760}}>
        {steps.map(s=>(
          <div key={s.id} style={{background:T.card,border:`1.5px solid ${s.done?T.accentBdr:T.border}`,
            borderRadius:14,padding:"16px 20px",display:"flex",gap:16,alignItems:"center",
            boxShadow:T.shadow,opacity:s.done?1:1}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:s.done?T.accentBg:T.subtle,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              {s.done?"✅":s.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{fontSize:15,fontWeight:700,color:s.done?T.text:T.text,
                  textDecoration:s.done?"line-through":undefined,textDecorationColor:T.muted}}>{s.title}</div>
                <Pill label={s.owner} color={s.owner==="Client"?T.accent:T.blue} bg={s.owner==="Client"?T.accentBg:T.blueBg} border={s.owner==="Client"?T.accentBdr:T.blueBdr}/>
              </div>
              <div style={{fontSize:13,color:T.muted,marginTop:3}}>{s.desc}</div>
            </div>
            {!s.done&&(
              <Btn small onClick={()=>{setSteps(p=>p.map(x=>x.id===s.id?{...x,done:true}:x));toast(`"${s.title}" marked complete`);}}>
                Mark done
              </Btn>
            )}
          </div>
        ))}
      </div>

      {pct===100&&(
        <div style={{marginTop:24,background:T.accentBg,border:`1.5px solid ${T.accentBdr}`,
          borderRadius:16,padding:"20px 24px",maxWidth:640,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>🚀</div>
          <div style={{fontFamily:serif,fontSize:22,color:T.accent,marginBottom:6}}>You're live!</div>
          <div style={{fontSize:14,color:T.muted}}>Your bot is fully configured and running in production.</div>
        </div>
      )}
    </div>
  );
}

/* ─── EXISTING VIEWS (compact) ────────────────────────────── */
function ClientRequests({ portalData, portalLoading, portalError, refreshPortal, toast }) {
  const [form, setForm] = useState({ subject:"", category:"Operations", priority:"Medium", dueDate:"", description:"" });
  const [saving, setSaving] = useState(false);
  const requests = portalData?.requests || [];
  const set = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));
  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast("Subject and details are required", "error");
      return;
    }
    setSaving(true);
    try {
      const data = await portalFetch("/api/client-portal", {
        method: "POST",
        body: JSON.stringify({ action: "create_request", ...form }),
      });
      setForm({ subject:"", category:"Operations", priority:"Medium", dueDate:"", description:"" });
      toast(`Service request ${data.request?.requestNumber || ""} created`);
      refreshPortal();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:26}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Service Requests</div>
          <div style={{color:T.muted,fontSize:14}}>Create and track requests synced to the MgucaTECH CRM.</div>
        </div>
        <Btn variant="secondary" onClick={refreshPortal}>{portalLoading ? "Refreshing..." : "Refresh"}</Btn>
      </div>

      {portalError&&(
        <div style={{background:T.redBg,border:`1.5px solid ${T.redBdr}`,borderRadius:12,padding:"12px 16px",color:T.red,fontSize:13,fontWeight:700,marginBottom:18}}>
          {portalError}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"minmax(320px,420px) minmax(360px,1fr)",gap:20,alignItems:"start"}}>
        <Card>
          <div style={{fontFamily:serif,fontSize:20,color:T.text,marginBottom:16}}>New request</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><Label>Subject</Label><Input value={form.subject} onChange={set("subject")} placeholder="What do you need help with?"/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Label>Category</Label><Select value={form.category} onChange={set("category")} options={["Operations","Onboarding","Booking","WhatsApp Bot","Billing","Support"]}/></div>
              <div><Label>Priority</Label><Select value={form.priority} onChange={set("priority")} options={["Low","Medium","High","Critical"]}/></div>
            </div>
            <div><Label>Target date</Label><Input type="date" value={form.dueDate} onChange={set("dueDate")}/></div>
            <div><Label>Details</Label><Input multiline rows={5} value={form.description} onChange={set("description")} placeholder="Add the full context, links, examples, or customer impact."/></div>
            <Btn onClick={submit} style={{justifyContent:"center"}}>{saving ? "Creating..." : "Create service request"}</Btn>
          </div>
        </Card>

        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
            <div>
              <div style={{fontFamily:serif,fontSize:20,color:T.text}}>Request history</div>
              <div style={{fontSize:12,color:T.muted,marginTop:2}}>{requests.length} synced records</div>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{textAlign:"left",color:T.muted,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>
                  {["SR Number","Subject","Status","Priority","Due"].map(header=>(
                    <th key={header} style={{padding:"9px 8px",borderBottom:`1.5px solid ${T.border}`}}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(request=>(
                  <tr key={request.requestNumber || request.id}>
                    <td style={{padding:"11px 8px",borderBottom:`1px solid ${T.border}`,fontWeight:800,color:T.blue,whiteSpace:"nowrap"}}>{request.requestNumber}</td>
                    <td style={{padding:"11px 8px",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{fontWeight:700,color:T.text}}>{request.subject}</div>
                      <div style={{color:T.muted,fontSize:12,marginTop:2,maxWidth:360,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{request.description || request.category}</div>
                    </td>
                    <td style={{padding:"11px 8px",borderBottom:`1px solid ${T.border}`}}><Pill label={request.status} color={T.blue} bg={T.blueBg} border={T.blueBdr}/></td>
                    <td style={{padding:"11px 8px",borderBottom:`1px solid ${T.border}`}}>{request.priority}</td>
                    <td style={{padding:"11px 8px",borderBottom:`1px solid ${T.border}`,color:T.muted,whiteSpace:"nowrap"}}>{request.dueDate || "Not set"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length===0&&(
              <div style={{padding:"24px 8px",color:T.muted,fontSize:14}}>No service requests found for this portal account yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PrivateClients({ toast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);

  const loadPrivateClients = useCallback(async () => {
    if (!privateClientToken()) return;
    setLoading(true);
    setError("");
    try {
      const data = await privateClientFetch();
      setSession(data.user || null);
      setClients(data.clients || []);
    } catch (err) {
      localStorage.removeItem(PRIVATE_CLIENT_TOKEN_KEY);
      setSession(null);
      setClients([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrivateClients(); }, [loadPrivateClients]);

  const unlock = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Private client email and password are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await privateClientFetch({
        method: "POST",
        body: JSON.stringify({ action:"private_login", email, password }),
      });
      localStorage.setItem(PRIVATE_CLIENT_TOKEN_KEY, data.accessToken);
      setSession(data.user || null);
      setClients(data.clients || []);
      setPassword("");
      toast("Private clients unlocked");
    } catch (err) {
      setError(err.message);
      toast(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  const lock = () => {
    localStorage.removeItem(PRIVATE_CLIENT_TOKEN_KEY);
    setSession(null);
    setClients([]);
    setError("");
    toast("Private clients locked");
  };

  const sensitivityStyle = level => level === "Critical"
    ? { color:T.red, bg:T.redBg, border:T.redBdr }
    : { color:T.yellow, bg:T.yellowBg, border:T.yellowBdr };

  if (!session) {
    return (
      <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
        <Card style={{maxWidth:760}}>
          <div style={{fontSize:11,color:T.accent,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Private Access</div>
          <div style={{fontFamily:serif,fontSize:34,color:T.text,marginBottom:8}}>Private Clients</div>
          <div style={{color:T.muted,fontSize:15,lineHeight:1.65,marginBottom:22}}>
            This area is separate from the normal client workspace. Unlock it with approved private-client credentials before viewing restricted records.
          </div>
          <div style={{background:T.yellowBg,border:`1.5px solid ${T.yellowBdr}`,borderRadius:10,padding:"12px 14px",color:T.yellow,fontSize:13,lineHeight:1.5,marginBottom:20}}>
            Staff or normal portal access does not automatically unlock these records. Use the approved private-client account only.
          </div>
          <div style={{display:"grid",gap:16}}>
            <div><Label>Private Client Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="private@example.com"/></div>
            <div><Label>Private Client Password</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/></div>
            {error&&<div style={{color:T.red,fontSize:13,fontWeight:700}}>{error}</div>}
            <div><Btn onClick={unlock} style={{opacity:loading?.7:1}}>{loading ? "Unlocking..." : "Unlock Private Clients"}</Btn></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:28}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Private Clients</div>
          <div style={{color:T.muted,fontSize:14}}>{clients.length} restricted records · unlocked as {session.email}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn variant="secondary" onClick={loadPrivateClients}>{loading ? "Refreshing..." : "Refresh"}</Btn>
          <Btn danger onClick={lock}>Lock</Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:22}}>
        {clients.map(client=>{
          const tone=sensitivityStyle(client.sensitivity);
          return (
            <Card key={client.id} style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:12}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client.name}</div>
                  <div style={{fontSize:13,color:T.muted}}>{client.contact} · {client.sector}</div>
                </div>
                <Pill label={client.sensitivity} color={tone.color} bg={tone.bg} border={tone.border}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[
                  ["Status",client.status],
                  ["Plan",client.plan],
                  ["Owner",client.owner],
                  ["NDA",client.nda],
                  ["Review",client.nextReview],
                  ["Phone",client.phone],
                ].map(([label,value])=>(
                  <div key={label} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:T.muted,fontWeight:800,letterSpacing:.5,textTransform:"uppercase",marginBottom:3}}>{label}</div>
                    <div style={{fontSize:12,color:T.text,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value || "-"}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:13,color:T.muted,lineHeight:1.55,borderTop:`1px solid ${T.border}`,paddingTop:12}}>{client.notes}</div>
            </Card>
          );
        })}
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:T.dark,color:"#fff"}}>
              {["Client","Contact","Email","Sector","Plan","Sensitivity","Next Review"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"11px 14px",fontSize:10,letterSpacing:.6,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client,index)=>(
              <tr key={client.id} style={{background:index%2?T.bg:T.card}}>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,fontWeight:800}}>{client.name}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.contact}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.email}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.sector}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.plan}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.sensitivity}</td>
                <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>{client.nextReview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const DAYS_CAL=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],MONTHS_CAL=["January","February","March","April","May","June","July","August","September","October","November","December"];
function buildCalDays(y,m){const f=new Date(y,m,1).getDay(),t=new Date(y,m+1,0).getDate(),c=[];for(let i=0;i<f;i++)c.push(null);for(let d=1;d<=t;d++)c.push(d);return c;}

function QAView({ toast, data }) {
  const [items, setItems] = useState(data?.length ? data : INIT_QA);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({question:"",answer:"",category:"Support",active:true});
  const [nextId, setNextId] = useState(9);
  const cats=["Orders","Returns","Support","Products","Shipping","Payments","Other"];
  const catColors={Orders:"#2563eb",Returns:"#7c3aed",Support:T.accent,Products:"#d97706",Shipping:"#0891b2",Payments:"#db2777",Other:T.muted};
  useEffect(()=>{ if (data?.length) setItems(data); },[data]);
  const filtered=items.filter(i=>i.question.toLowerCase().includes(search.toLowerCase())||i.answer.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{
    if(!form.question.trim()||!form.answer.trim())return;
    if(modal.mode==="add"){
      const next=[...items,{...form,id:nextId}];
      setItems(next);setNextId(n=>n+1);portalAction("save_qa",{qa:next}).catch(()=>{});toast("Response added");
    }
    else{
      const next=items.map(i=>i.id===modal.item.id?{...i,...form}:i);
      setItems(next);portalAction("save_qa",{qa:next}).catch(()=>{});toast("Response updated");
    }
    setModal(null);
  };
  return(
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div><div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Q&amp;A Responses</div><div style={{color:T.muted,fontSize:14}}>{items.filter(i=>i.active).length} active</div></div>
        <Btn onClick={()=>{setForm({question:"",answer:"",category:"Support",active:true});setModal({mode:"add"});}}>+ Add Response</Btn>
      </div>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{maxWidth:300,marginBottom:20}}/>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(item=>(
          <div key={item.id} style={{background:item.active?T.card:T.bg,border:`1.5px solid ${T.border}`,borderLeft:`4px solid ${catColors[item.category]||T.accent}`,borderRadius:14,padding:"16px 20px",boxShadow:item.active?T.shadow:"none",opacity:item.active?1:.6}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,color:"#fff",background:catColors[item.category]||T.muted}}>{item.category}</span>
                  {!item.active&&<Pill label="DISABLED" color={T.muted} bg={T.subtle}/>}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:5}}>{item.question}</div>
                <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{item.answer}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>{const next=items.map(i=>i.id===item.id?{...i,active:!i.active}:i);setItems(next);portalAction("save_qa",{qa:next}).catch(()=>{});}} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:T.surface,cursor:"pointer",fontSize:13}}>{item.active?"⏸":"▶"}</button>
                <button onClick={()=>{setForm({question:item.question,answer:item.answer,category:item.category,active:item.active});setModal({mode:"edit",item});}} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:T.surface,cursor:"pointer",fontSize:13}}>✏️</button>
                <button onClick={()=>{const next=items.filter(i=>i.id!==item.id);setItems(next);portalAction("save_qa",{qa:next}).catch(()=>{});toast("Deleted");}} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.redBdr}`,background:T.redBg,cursor:"pointer",fontSize:13}}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <Modal title={modal.mode==="add"?"Add Response":"Edit Response"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div><Label>Category</Label><Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={cats}/></div>
            <div><Label>Question</Label><Input value={form.question} onChange={e=>setForm(f=>({...f,question:e.target.value}))} placeholder="Trigger phrase…"/></div>
            <div><Label>Response</Label><Input multiline rows={4} value={form.answer} onChange={e=>setForm(f=>({...f,answer:e.target.value}))} placeholder="Bot reply…"/></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}><Toggle value={form.active} onChange={v=>setForm(f=>({...f,active:v}))}/><span style={{fontSize:14,color:T.muted}}>{form.active?"Active":"Disabled"}</span></div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setModal(null)}>Cancel</Btn><Btn onClick={save}>{modal.mode==="add"?"Add":"Save"}</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CalendarView({ toast, user, data }) {
  const defaultHours={Sun:{open:false,from:"09:00",to:"18:00"},Mon:{open:true,from:"09:00",to:"18:00"},Tue:{open:true,from:"09:00",to:"18:00"},Wed:{open:true,from:"09:00",to:"18:00"},Thu:{open:true,from:"09:00",to:"18:00"},Fri:{open:false,from:"09:00",to:"18:00"},Sat:{open:false,from:"09:00",to:"14:00"}};
  const [year,setYear]=useState(data?.year || 2026);const [month,setMonth]=useState(data?.month ?? 4);
  const [marked,setMarked]=useState(data?.marked || {"2026-5-1":"holiday","2026-5-8":"special","2026-5-15":"holiday"});
  const [hours,setHours]=useState(data?.hours || defaultHours);
  const [selDay,setSelDay]=useState(null);const [modal,setModal]=useState(false);
  const cells=buildCalDays(year,month);
  const key=d=>`${year}-${month+1}-${d}`;
  const ts={holiday:{bg:"#fee2e2",border:"#fca5a5",color:T.red},special:{bg:"#fef3c7",border:"#fcd34d",color:T.yellow}};
  const prev=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const next=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  useEffect(()=>{ if(data){setYear(data.year || 2026);setMonth(data.month ?? 4);setMarked(data.marked || {});setHours(data.hours || defaultHours);} },[data]);
  const saveCalendar=()=>{portalAction("save_calendar",{calendar:{year,month,marked,hours}}).catch(()=>{});toast("Calendar saved");};
  return(
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:28}}>
        <div>
          <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Calendar &amp; Hours</div>
          <div style={{color:T.muted,fontSize:14}}>Mark holidays, manage business hours, and open the live booking app.</div>
        </div>
        <Btn onClick={()=>openBookNow(user)}>Open Book Now</Btn>
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
        <Card style={{flex:"1 1 320px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <button onClick={prev} style={{background:T.subtle,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:15}}>‹</button>
            <div style={{fontFamily:serif,fontSize:18,color:T.text}}>{MONTHS_CAL[month]} {year}</div>
            <button onClick={next} style={{background:T.subtle,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:15}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
            {DAYS_CAL.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.muted,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {cells.map((d,i)=>{
              if(!d)return<div key={i}/>;
              const k=key(d),mk=marked[k],style=mk?ts[mk]:null;
              const isToday=d===22&&month===4&&year===2026;
              return(
                <div key={i} onClick={()=>{setSelDay(d);setModal(true);}}
                  style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:isToday?700:500,background:mk?style.bg:isToday?T.accentBg:"transparent",color:mk?style.color:isToday?T.accent:T.text,border:`1.5px solid ${mk?style.border:isToday?T.accentBdr:"transparent"}`,transition:"all .1s"}}
                  onMouseEnter={e=>{if(!mk&&!isToday)e.currentTarget.style.background=T.subtle;}}
                  onMouseLeave={e=>{if(!mk&&!isToday)e.currentTarget.style.background="transparent";}}>
                  {d}
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{flex:"1 1 280px"}}>
          <div style={{fontFamily:serif,fontSize:18,color:T.text,marginBottom:16}}>Business Hours</div>
          {Object.entries(hours).map(([day,h])=>(
            <div key={day} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:32,fontSize:12,fontWeight:700,color:h.open?T.text:T.muted}}>{day}</div>
              <Toggle value={h.open} onChange={v=>setHours(p=>({...p,[day]:{...h,open:v}}))}/>
              {h.open?(<div style={{display:"flex",gap:6,flex:1}}>
                <input type="time" value={h.from} onChange={e=>setHours(p=>({...p,[day]:{...h,from:e.target.value}}))} style={{flex:1,padding:"5px 7px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12,color:T.text,background:T.bg,fontFamily:font,outline:"none"}}/>
                <span style={{color:T.muted,alignSelf:"center",fontSize:11}}>–</span>
                <input type="time" value={h.to} onChange={e=>setHours(p=>({...p,[day]:{...h,to:e.target.value}}))} style={{flex:1,padding:"5px 7px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:12,color:T.text,background:T.bg,fontFamily:font,outline:"none"}}/>
              </div>):(<span style={{fontSize:12,color:T.muted}}>Closed</span>)}
            </div>
          ))}
          <Btn onClick={saveCalendar} style={{marginTop:8}}>Save Hours</Btn>
        </Card>
        <Card style={{flex:"1 1 280px"}}>
          <div style={{fontFamily:serif,fontSize:18,color:T.text,marginBottom:8}}>Book Now App</div>
          <div style={{color:T.muted,fontSize:13,lineHeight:1.6,marginBottom:16}}>
            Share this live booking link with customers or open it to test the client-facing booking flow.
          </div>
          <Input value={bookingUrlFor(user)} onChange={()=>{}} style={{fontSize:12,marginBottom:12}} />
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>openBookNow(user)}>Open booking app</Btn>
            <Btn variant="secondary" onClick={()=>{navigator.clipboard?.writeText(bookingUrlFor(user));toast("Booking link copied");}}>Copy link</Btn>
          </div>
        </Card>
      </div>
      {modal&&selDay&&(
        <Modal title={`${MONTHS_CAL[month]} ${selDay}, ${year}`} onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{type:"holiday",icon:"🚫",label:"Mark as Closed / Holiday"},{type:"special",icon:"⏰",label:"Mark as Special Hours"},{type:"clear",icon:"✅",label:"Normal working day"}].map(o=>(
              <div key={o.type} onClick={()=>{o.type==="clear"?setMarked(m=>{const n={...m};delete n[key(selDay)];return n;}):setMarked(m=>({...m,[key(selDay)]:o.type}));setModal(false);}}
                style={{padding:"12px 16px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${T.border}`,display:"flex",gap:10,alignItems:"center",transition:"border .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <span style={{fontSize:20}}>{o.icon}</span>
                <span style={{fontSize:14,fontWeight:600,color:T.text}}>{o.label}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BotSettings({ toast, data }) {
  const defaultSettings={botName:"Takealot Partner Support",welcomeMsg:"Hello! Welcome to Takealot Partner Support. How can I help you today?\n\n1. Track my order\n2. Returns & refunds\n3. Speak to an agent",fallbackMsg:"I'm sorry, I didn't understand that. Please reply with a number, or type 'AGENT'.",language:"English",tone:"Friendly",escalation:"+27 83 456 7890",escalationEmail:"support@tapartner.co.za",typingDelay:"1.5",autoClose:"24"};
  const [s,setS]=useState(data || defaultSettings);
  const [tab,setTab]=useState("messages");
  useEffect(()=>{ if (data) setS(data); },[data]);
  const set=k=>e=>setS(p=>({...p,[k]:e.target.value}));
  return(
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Bot Settings</div>
      <div style={{color:T.muted,fontSize:14,marginBottom:24}}>Configure how your bot behaves</div>
      <div style={{display:"flex",gap:8,marginBottom:24}}>
        {["messages","behaviour","escalation"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:font,fontSize:14,fontWeight:600,transition:"all .15s",background:tab===t?T.accent:T.surface,color:tab===t?"#fff":T.muted,boxShadow:tab===t?"none":T.shadow,textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>
      <Card style={{maxWidth:600}}>
        {tab==="messages"&&(<div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div><Label>Bot Display Name</Label><Input value={s.botName} onChange={set("botName")}/></div>
          <div><Label>Welcome Message</Label><Input multiline rows={5} value={s.welcomeMsg} onChange={set("welcomeMsg")}/></div>
          <div><Label>Fallback Message</Label><Input multiline rows={3} value={s.fallbackMsg} onChange={set("fallbackMsg")}/></div>
        </div>)}
        {tab==="behaviour"&&(<div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div><Label>Language</Label><Select value={s.language} onChange={set("language")} options={["English","isiXhosa","isiZulu","Afrikaans","Sesotho","Setswana"]}/></div>
          <div><Label>Tone</Label><Select value={s.tone} onChange={set("tone")} options={["Friendly","Professional","Formal","Casual","Concise"]}/></div>
          <div><Label>Typing delay (seconds)</Label><Input value={s.typingDelay} onChange={set("typingDelay")}/></div>
          <div><Label>Auto-close after (hours)</Label><Input value={s.autoClose} onChange={set("autoClose")}/></div>
        </div>)}
        {tab==="escalation"&&(<div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div><Label>Escalation WhatsApp Number</Label><Input value={s.escalation} onChange={set("escalation")}/></div>
          <div><Label>Escalation Email</Label><Input value={s.escalationEmail} onChange={set("escalationEmail")}/></div>
        </div>)}
        <div style={{marginTop:24,paddingTop:16,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn variant="secondary" onClick={()=>setS(data || defaultSettings)}>Reset</Btn>
          <Btn onClick={()=>{portalAction("save_settings",{settings:s}).catch(()=>{});toast("Settings saved");}}>Save Settings</Btn>
        </div>
      </Card>
    </div>
  );
}

function Team({ toast }) {
  const [members,setMembers]=useState([{id:1,name:"Ayesha Jacobs",email:"ayesha@tapartner.co.za",role:"Admin",notify:["escalations","reports"]},{id:2,name:"Owen Petersen",email:"owen@tapartner.co.za",role:"Manager",notify:["escalations"]},{id:3,name:"Naledi Dlamini",email:"naledi@tapartner.co.za",role:"Viewer",notify:[]}]);
  const [modal,setModal]=useState(false);const[form,setForm]=useState({name:"",email:"",role:"Viewer",notify:[]});const[nextId,setNextId]=useState(4);
  const rCol={Admin:T.accent,Manager:"#7c3aed",Viewer:T.muted};
  const invite=()=>{if(!form.name.trim()||!form.email.trim())return;setMembers(p=>[...p,{...form,id:nextId}]);setNextId(n=>n+1);setModal(false);setForm({name:"",email:"",role:"Viewer",notify:[]});toast("Invite sent to "+form.email);};
  return(
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div><div style={{fontFamily:serif,fontSize:30,color:T.text,marginBottom:4}}>Team &amp; Notifications</div><div style={{color:T.muted,fontSize:14}}>{members.length} members</div></div>
        <Btn onClick={()=>setModal(true)}>+ Invite</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:640}}>
        {members.map(m=>(
          <Card key={m.id} style={{padding:"16px 20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <Avatar name={m.name} size={42} color={rCol[m.role]||T.muted}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:T.text}}>{m.name}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{m.email}</div>
                {m.notify.length>0&&<div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap"}}>{m.notify.map(n=><Pill key={n} label={n} color={T.accent} bg={T.accentBg} border={T.accentBdr}/>)}</div>}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Pill label={m.role} color={rCol[m.role]||T.muted} bg={`${rCol[m.role]||T.muted}18`}/>
                {m.role!=="Admin"&&<button onClick={()=>{setMembers(p=>p.filter(x=>x.id!==m.id));toast("Removed");}} style={{width:30,height:30,borderRadius:8,border:`1.5px solid ${T.redBdr}`,background:T.redBg,cursor:"pointer",color:T.red,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title="Invite Team Member" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div><Label>Full Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
            <div><Label>Role</Label><Select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} options={["Admin","Manager","Viewer"]}/></div>
            <div style={{display:"flex",gap:8,marginTop:4,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setModal(false)}>Cancel</Btn><Btn onClick={invite}>Send Invite</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Overview({ setView, user, portalData, portalLoading, portalError, refreshPortal }) {
  const stats=[{label:"Active Responses",value:INIT_QA.filter(q=>q.active).length,icon:"💬",color:T.accent},{label:"Open Escalations",value:2,icon:"🔥",color:T.red},{label:"Approved Templates",value:INIT_TEMPLATES.filter(t=>t.status==="APPROVED").length,icon:"📝",color:T.blue},{label:"Opted-in Contacts",value:"10",icon:"👥",color:"#7c3aed"}];
  const firstName = (user?.name || "there").split(" ")[0];
  const portalRequests = portalData?.requests || [];
  const activePortalRequest = portalRequests.find(r=>!["Closed","Completed","Resolved"].includes(r.status)) || portalRequests[0];
  return(
    <div style={{padding:"36px 40px",overflowY:"auto",flex:1}}>
      <div style={{fontFamily:serif,fontSize:32,color:T.text,marginBottom:6}}>Good morning, {firstName} 👋</div>
      <div style={{color:T.muted,fontSize:15,marginBottom:28}}>Your bot is live and running from South Africa.</div>
      <Card style={{marginBottom:24,padding:18,borderColor:portalError?T.redBdr:T.border}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Client portal backend</div>
            <div style={{fontSize:18,fontWeight:800,color:T.text}}>
              {portalLoading ? "Syncing portal data..." : portalError ? "Backend needs attention" : portalData?.status?.label || "Active"}
            </div>
            <div style={{fontSize:13,color:T.muted,marginTop:6,lineHeight:1.55}}>
              {portalError || portalData?.status?.nextStep || "Your authenticated portal workspace is ready."}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {activePortalRequest?.requestNumber&&<Pill label={activePortalRequest.requestNumber} color={T.blue} bg={T.blueBg} border={T.blueBdr}/>}
            <Btn small variant="secondary" onClick={refreshPortal}>Refresh</Btn>
            <Btn small onClick={()=>setView("requests")}>Service requests</Btn>
          </div>
        </div>
      </Card>
      <div style={{display:"flex",gap:14,marginBottom:28,flexWrap:"wrap"}}>
        {stats.map(s=>(
          <div key={s.label} style={{flex:"1 1 150px",background:T.card,border:`1.5px solid ${T.border}`,borderRadius:16,padding:"18px 20px",boxShadow:T.shadow}}>
            <div style={{fontSize:24,marginBottom:10}}>{s.icon}</div>
            <div style={{fontSize:26,fontFamily:serif,color:s.color,lineHeight:1,marginBottom:5}}>{s.value}</div>
            <div style={{fontSize:11,color:T.muted,fontWeight:700,letterSpacing:.4,textTransform:"uppercase"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        <Card style={{flex:2,minWidth:280}}>
          <div style={{fontFamily:serif,fontSize:20,color:T.text,marginBottom:16}}>Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
            {[{icon:"↗",label:"Open Book Now",external:true},{icon:"💬",label:"Add Q&A response",view:"qa"},{icon:"📅",label:"Update hours",view:"calendar"},{icon:"🤖",label:"Test your bot",view:"simulator"},{icon:"📣",label:"New broadcast",view:"broadcasts"},{icon:"📝",label:"Submit template",view:"templates"},{icon:"📊",label:"View analytics",view:"analytics"}].map(a=>(
              <div key={a.label} onClick={()=>a.external ? openBookNow(user) : setView(a.view)} style={{padding:"14px",background:T.bg,borderRadius:12,cursor:"pointer",border:`1.5px solid ${T.border}`,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.background=T.accentBg;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.bg;}}>
                <div style={{fontSize:20,marginBottom:8}}>{a.icon}</div>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{a.label}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{flex:1,minWidth:220}}>
          <div style={{fontFamily:serif,fontSize:20,color:T.text,marginBottom:16}}>Inbox Preview</div>
          {INIT_CONVS.filter(c=>c.status==="Escalated").map(c=>(
            <div key={c.id} onClick={()=>setView("inbox")} style={{display:"flex",gap:10,marginBottom:14,cursor:"pointer",padding:"8px",borderRadius:10,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.subtle}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <Avatar name={c.name} size={32} color={T.red}/>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>{c.name}</div>
                <div style={{fontSize:12,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.messages[c.messages.length-1].text}</div>
              </div>
              <Pill label="Escalated" color={T.red} bg={T.redBg} border={T.redBdr}/>
            </div>
          ))}
          <button onClick={()=>setView("inbox")} style={{background:"none",border:`1.5px solid ${T.border}`,borderRadius:9,padding:"7px 14px",fontSize:13,fontWeight:600,color:T.muted,cursor:"pointer",fontFamily:font,width:"100%",marginTop:4}}>Open Inbox →</button>
        </Card>
      </div>
    </div>
  );
}

/* ─── APP ──────────────────────────────────────────────────── */
export default function App({ user = null, onLogout = null }) {
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);
  const [portalData, setPortalData] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const showToast = useCallback((msg,type="success")=>setToast({msg,type}),[]);
  const refreshPortal = useCallback(async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      setPortalData(await portalFetch("/api/client-portal"));
    } catch (error) {
      setPortalError(error.message);
    } finally {
      setPortalLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPortal();
  }, [refreshPortal]);
  const workspace = portalData?.workspace || {};

  const NAV = [
    { id:"overview",   icon:"⬡", label:"Overview"      },
    { group:"Bot Management" },
    { id:"qa",         icon:"💬", label:"Q&A Responses" },
    { id:"flows",      icon:"⬗", label:"Flow Builder"  },
    { id:"simulator",  icon:"🧪", label:"Simulator"     },
    { id:"settings",   icon:"⚙️", label:"Bot Settings"  },
    { group:"Communicate" },
    { id:"inbox",      icon:"📥", label:"Inbox",        badge:2 },
    { id:"templates",  icon:"📝", label:"Templates"    },
    { id:"broadcasts", icon:"📣", label:"Broadcasts"   },
    { group:"Data & Analytics" },
    { id:"contacts",   icon:"👥", label:"Contacts"     },
    { id:"analytics",  icon:"📊", label:"Analytics"    },
    { group:"Operations" },
    { id:"requests",   icon:"📋", label:"Service Requests" },
    { id:"private-clients", icon:"P", label:"Private Clients" },
    { id:"book-now",   icon:"↗", label:"Book Now", external:true },
    { id:"calendar",   icon:"📅", label:"Calendar"     },
    { id:"team",       icon:"🫂", label:"Team"          },
    { id:"billing",    icon:"💳", label:"Billing"       },
    { id:"status",     icon:"🔋", label:"Status"        },
    { id:"onboarding", icon:"🚀", label:"Setup Checklist"},
  ];

  return (
    <div style={{fontFamily:font,background:T.bg,color:T.text,minHeight:"100vh",display:"flex"}}>
      <style>{`
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.borderDark};border-radius:99px;}
        @keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
        @keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:none;opacity:1}}
      `}</style>

      {/* sidebar */}
      <div style={{width:230,background:T.dark,borderRight:"1.5px solid rgba(255,255,255,.08)",
        display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"2px 0 12px rgba(26,26,26,.08)",overflowY:"auto"}}>
        <div style={{padding:"20px 18px 14px",borderBottom:"1.5px solid rgba(255,255,255,.08)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:36,height:36,borderRadius:11,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💬</div>
            <div><div style={{fontSize:18,fontFamily:serif,color:"#fff",lineHeight:1.05,fontWeight:700}}>MgucaTECH</div><div style={{fontSize:10,color:"rgba(255,255,255,.42)",letterSpacing:1,textTransform:"uppercase"}}>Client Portal</div></div>
          </div>
          <div style={{background:"rgba(232,86,26,.12)",border:"1.5px solid rgba(232,86,26,.28)",borderRadius:8,padding:"9px 12px"}}>
            <div style={{fontSize:13,fontWeight:700,color:T.accent}}>{user?.clientName || "Client Workspace"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.48)",marginTop:1}}>Enterprise · 6 bots active</div>
          </div>
        </div>

        <nav style={{padding:"10px 10px",flex:1}}>
          {NAV.map((item,i)=>{
            if(item.group) return (
              <div key={i} style={{fontSize:10,fontWeight:800,color:T.muted,letterSpacing:.8,
                textTransform:"uppercase",padding:"12px 10px 5px"}}>{item.group}</div>
            );
            const active=view===item.id;
            return (
              <button key={item.id} onClick={()=>item.external ? openBookNow(user) : setView(item.id)}
                style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",
                  background:active?"rgba(232,86,26,.14)":"transparent",
                  color:active?T.accent:"rgba(255,255,255,.58)",
                  fontSize:13,fontWeight:active?600:500,marginBottom:1,textAlign:"left",
                  transition:"all .12s",fontFamily:font}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,width:18,textAlign:"center"}}>{item.icon}</span>
                  {item.label}
                </div>
                {item.badge&&<span style={{background:active?"rgba(255,255,255,.3)":T.red,color:active?"#fff":"#fff",borderRadius:99,fontSize:10,fontWeight:700,padding:"1px 7px",minWidth:18,textAlign:"center"}}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{padding:"12px 16px",borderTop:"1.5px solid rgba(255,255,255,.08)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={user?.name || "Client User"} size={32}/>
            <div><div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{user?.name || "Client User"}</div><div style={{fontSize:11,color:"rgba(255,255,255,.48)"}}>{user?.role?.replace("client_", "") || "Admin"}</div></div>
          </div>
          <button type="button" onClick={onLogout}
            style={{width:"100%",marginTop:10,border:"1.5px solid rgba(255,255,255,.12)",borderRadius:8,
              background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.58)",padding:"8px 10px",fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:font}}>
            Sign out
          </button>
        </div>
      </div>

      {/* main */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {view==="overview"   && <Overview setView={setView} user={user} portalData={portalData} portalLoading={portalLoading} portalError={portalError} refreshPortal={refreshPortal}/>}
        {view==="qa"         && <QAView toast={showToast} data={workspace.qa}/>}
        {view==="flows"      && <FlowBuilder toast={showToast} data={workspace.flowNodes} refreshPortal={refreshPortal}/>}
        {view==="simulator"  && <Simulator/>}
        {view==="settings"   && <BotSettings toast={showToast} data={workspace.settings}/>}
        {view==="inbox"      && <Inbox toast={showToast} data={workspace.inbox}/>}
        {view==="templates"  && <Templates toast={showToast} data={workspace.templates}/>}
        {view==="broadcasts" && <Broadcasts toast={showToast} data={workspace.broadcasts}/>}
        {view==="contacts"   && <Contacts toast={showToast} data={workspace.contacts}/>}
        {view==="analytics"  && <Analytics data={workspace.analytics}/>}
        {view==="requests"   && <ClientRequests portalData={portalData} portalLoading={portalLoading} portalError={portalError} refreshPortal={refreshPortal} toast={showToast}/>}
        {view==="private-clients" && <PrivateClients toast={showToast}/>}
        {view==="calendar"   && <CalendarView toast={showToast} user={user} data={workspace.calendar}/>}
        {view==="team"       && <Team toast={showToast}/>}
        {view==="billing"    && <Billing toast={showToast}/>}
        {view==="status"     && <Status/>}
        {view==="onboarding" && <Onboarding toast={showToast} user={user}/>}
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
