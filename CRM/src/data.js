export const INITIAL_CLIENTS = [
  { id:1,  name:"Zara Fashion ME",    contact:"Sara Al-Mansouri", email:"sara@zarame.com",      phone:"+971 50 123 4567", website:"zarame.com",       plan:"Enterprise", status:"Active",  mrr:2400, joined:"2024-03", tag:"Retail",    notes:[ { id:"n1", text:"Interested in expanding to 6 bots by Q2.", author:"Admin", createdAt:"2025-04-10T09:00:00Z" } ] },
  { id:2,  name:"TamimiMarkets",      contact:"Khalid Tamimi",    email:"k@tamimi.sa",          phone:"+966 11 234 5678", website:"tamimi.sa",         plan:"Growth",     status:"Active",  mrr:980,  joined:"2024-07", tag:"Grocery",   notes:[] },
  { id:3,  name:"AlAhli FC",          contact:"Nasser Ibrahim",   email:"n@alahlifc.com",       phone:"+966 55 987 6543", website:"alahlifc.com",      plan:"Enterprise", status:"Active",  mrr:1800, joined:"2023-11", tag:"Sports",    notes:[] },
  { id:4,  name:"Noon.com",           contact:"Dina Khalil",      email:"dina@noon.com",        phone:"+971 4 567 8901",  website:"noon.com",          plan:"Scale",      status:"Active",  mrr:4200, joined:"2023-08", tag:"E-Commerce",notes:[ { id:"n2", text:"Invoice auto-pay enabled. Review contract renewal in Aug.", author:"Admin", createdAt:"2025-03-01T11:30:00Z" } ] },
  { id:5,  name:"STC Pay",            contact:"Faisal Al-Otaibi", email:"f@stcpay.com.sa",      phone:"+966 11 456 7890", website:"stcpay.com.sa",     plan:"Enterprise", status:"Active",  mrr:3600, joined:"2023-05", tag:"Fintech",   notes:[] },
  { id:6,  name:"Jarir Bookstore",    contact:"Ahmed Jarir",      email:"a@jarir.com",          phone:"+966 11 765 4321", website:"jarir.com",         plan:"Growth",     status:"Trial",   mrr:0,    joined:"2025-01", tag:"Retail",    notes:[ { id:"n3", text:"Trial ends 2025-03-01. Follow up with Ahmed re: pricing.", author:"Admin", createdAt:"2025-01-15T08:00:00Z" } ] },
  { id:7,  name:"Fetchr Logistics",   contact:"Omar Farouk",      email:"omar@fetchr.us",       phone:"+971 4 234 5678",  website:"fetchr.us",         plan:"Scale",      status:"Active",  mrr:1600, joined:"2024-04", tag:"Logistics", notes:[] },
  { id:8,  name:"Mumzworld",          contact:"Mona Al-Hakami",   email:"mona@mumzworld.com",   phone:"+971 4 345 6789",  website:"mumzworld.com",     plan:"Growth",     status:"Churned", mrr:0,    joined:"2024-01", tag:"Retail",    notes:[ { id:"n4", text:"Churned due to budget cuts. Check back in Q4 2025.", author:"Admin", createdAt:"2025-02-10T10:00:00Z" } ] },
  { id:9,  name:"Careem",             contact:"Yusuf Hamid",      email:"y@careem.com",         phone:"+971 4 456 7890",  website:"careem.com",        plan:"Enterprise", status:"Active",  mrr:5100, joined:"2023-02", tag:"Transport", notes:[] },
  { id:10, name:"Tabby Finance",      contact:"Rima Nasser",      email:"rima@tabby.ai",        phone:"+971 4 567 8902",  website:"tabby.ai",          plan:"Scale",      status:"Trial",   mrr:0,    joined:"2025-02", tag:"Fintech",   notes:[] },
];

export const INITIAL_PIPELINE = {
  Lead: [
    { id:"d1", company:"MaxAB Egypt",      value:3200, age:3,  contact:"Ali Hassan",  probability:10, closeDate:"2025-08-01", notes:"" },
    { id:"d2", company:"Almarai",          value:4800, age:7,  contact:"Sara Noor",   probability:10, closeDate:"2025-09-01", notes:"Initial call scheduled" },
    { id:"d3", company:"Talabat",          value:2100, age:1,  contact:"Reem Jaber",  probability:10, closeDate:"2025-07-15", notes:"" },
  ],
  Demo: [
    { id:"d4", company:"Majid Al Futtaim", value:6000, age:5,  contact:"Walid Khoury",probability:30, closeDate:"2025-07-01", notes:"Demo scheduled for Thursday" },
    { id:"d5", company:"Saudia Airlines",  value:8500, age:12, contact:"Hind Al-Saud",probability:30, closeDate:"2025-08-15", notes:"Needs Arabic-first bot" },
  ],
  Proposal: [
    { id:"d6", company:"Aramex",           value:3400, age:9,  contact:"Tariq Salim", probability:60, closeDate:"2025-06-30", notes:"Proposal sent — awaiting legal review" },
    { id:"d7", company:"ADCB Bank",        value:7200, age:4,  contact:"Layla Awad",  probability:60, closeDate:"2025-07-10", notes:"" },
  ],
  Closed: [
    { id:"d8", company:"Noon.com",         value:4200, age:0,  contact:"Dina Khalil", probability:100,closeDate:"2025-05-10", notes:"" },
    { id:"d9", company:"Careem",           value:5100, age:0,  contact:"Yusuf Hamid", probability:100,closeDate:"2025-04-28", notes:"" },
  ],
};

export const INITIAL_BOTS = [
  { id:"b1",  name:"Customer Support",  client:"Noon.com",          msgs:14200, uptime:99.8, status:"Online",  lang:"AR/EN", type:"Support",   deployedAt:"2023-09-01", avgResponseMs:245, errorRate:0.02 },
  { id:"b2",  name:"Order Tracker",     client:"Noon.com",          msgs:8900,  uptime:99.9, status:"Online",  lang:"AR/EN", type:"Ops",       deployedAt:"2023-09-05", avgResponseMs:312, errorRate:0.01 },
  { id:"b3",  name:"Loyalty Assistant", client:"Noon.com",          msgs:3100,  uptime:97.2, status:"Online",  lang:"EN",    type:"Marketing", deployedAt:"2024-01-10", avgResponseMs:420, errorRate:0.08 },
  { id:"b4",  name:"Ride Support",      client:"Careem",            msgs:22400, uptime:99.7, status:"Online",  lang:"AR/EN", type:"Support",   deployedAt:"2023-03-15", avgResponseMs:198, errorRate:0.01 },
  { id:"b5",  name:"Driver Ops",        client:"Careem",            msgs:11300, uptime:99.5, status:"Online",  lang:"AR/EN", type:"Ops",       deployedAt:"2023-04-01", avgResponseMs:267, errorRate:0.02 },
  { id:"b6",  name:"Promo Bot",         client:"Careem",            msgs:5600,  uptime:98.1, status:"Online",  lang:"EN",    type:"Marketing", deployedAt:"2024-02-20", avgResponseMs:389, errorRate:0.05 },
  { id:"b7",  name:"Pay Assistant",     client:"STC Pay",           msgs:18700, uptime:99.9, status:"Online",  lang:"AR",    type:"Support",   deployedAt:"2023-06-01", avgResponseMs:221, errorRate:0.01 },
  { id:"b8",  name:"KYC Helper",        client:"STC Pay",           msgs:4300,  uptime:99.2, status:"Warning", lang:"AR/EN", type:"Ops",       deployedAt:"2023-08-15", avgResponseMs:534, errorRate:0.14 },
  { id:"b9",  name:"Fashion Advisor",   client:"Zara Fashion ME",   msgs:6100,  uptime:98.9, status:"Online",  lang:"AR/EN", type:"Sales",     deployedAt:"2024-04-01", avgResponseMs:302, errorRate:0.03 },
  { id:"b10", name:"Fan Engagement",    client:"AlAhli FC",         msgs:9800,  uptime:99.4, status:"Online",  lang:"AR",    type:"Marketing", deployedAt:"2023-12-01", avgResponseMs:288, errorRate:0.02 },
  { id:"b11", name:"Store Locator",     client:"Jarir Bookstore",   msgs:210,   uptime:100,  status:"Trial",   lang:"AR/EN", type:"Support",   deployedAt:"2025-01-20", avgResponseMs:410, errorRate:0.00 },
  { id:"b12", name:"Pickup Scheduler",  client:"Fetchr Logistics",  msgs:7700,  uptime:98.6, status:"Online",  lang:"EN",    type:"Ops",       deployedAt:"2024-05-01", avgResponseMs:356, errorRate:0.04 },
];

export const MRR_DATA = [
  { m:"Aug", mrr:9800  }, { m:"Sep", mrr:11200 }, { m:"Oct", mrr:13100 },
  { m:"Nov", mrr:14600 }, { m:"Dec", mrr:15800 }, { m:"Jan", mrr:17200 },
  { m:"Feb", mrr:18400 }, { m:"Mar", mrr:19700 }, { m:"Apr", mrr:20900 },
  { m:"May", mrr:22160 },
];

export const MSG_DATA = [
  { d:"Mon", msgs:84200 }, { d:"Tue", msgs:91000 }, { d:"Wed", msgs:88400 },
  { d:"Thu", msgs:95600 }, { d:"Fri", msgs:78900 }, { d:"Sat", msgs:62100 },
  { d:"Sun", msgs:58300 },
];

export const INITIAL_ACTIVITY = [
  { id:"a1", time:"2 min ago",  icon:"🤖", text:"Careem — Ride Support hit 500k messages milestone" },
  { id:"a2", time:"18 min ago", icon:"💬", text:"New demo booked — Majid Al Futtaim (Walid Khoury)"  },
  { id:"a3", time:"1 hr ago",   icon:"⚠️", text:"STC Pay — KYC Helper latency spike detected"         },
  { id:"a4", time:"3 hr ago",   icon:"✅", text:"Tabby Finance trial activated (2 seats)"              },
  { id:"a5", time:"5 hr ago",   icon:"💰", text:"Invoice paid — Noon.com $4,200 MRR"                  },
  { id:"a6", time:"Yesterday",  icon:"🚀", text:"Jarir Bookstore bot deployed to production"           },
  { id:"a7", time:"2 days ago", icon:"👤", text:"New contact added — Rima Nasser (Tabby Finance)"     },
  { id:"a8", time:"3 days ago", icon:"📦", text:"Deal moved — ADCB Bank → Proposal"                  },
];

export const INITIAL_NOTIFICATIONS = [
  { id:"notif1", icon:"⚠️", text:"STC Pay — KYC Helper latency spike",       time:"1 hr ago",  read:false },
  { id:"notif2", icon:"💰", text:"Invoice paid — Noon.com $4,200 MRR",       time:"5 hr ago",  read:false },
  { id:"notif3", icon:"🤖", text:"Ride Support hit 500k messages milestone",  time:"2 hr ago",  read:false },
  { id:"notif4", icon:"✅", text:"Tabby Finance trial activated",             time:"3 hr ago",  read:true  },
  { id:"notif5", icon:"📦", text:"Deal moved: ADCB Bank → Proposal",         time:"3 days ago",read:true  },
];

export const INITIAL_TASKS = [
  { id:"t1", clientId:6, title:"Convert Jarir trial before renewal call", owner:"Admin", dueDate:"2026-05-24", priority:"High", status:"Open", notes:"Prepare Growth-to-Scale upgrade options." },
  { id:"t2", clientId:10, title:"Send Tabby onboarding health report", owner:"Admin", dueDate:"2026-05-27", priority:"Medium", status:"In Progress", notes:"Include first-week activation metrics." },
  { id:"t3", clientId:5, title:"Review KYC Helper latency incident", owner:"Admin", dueDate:"2026-05-22", priority:"High", status:"Open", notes:"Check response-time trend and escalation notes." },
  { id:"t4", clientId:4, title:"Confirm Noon renewal timeline", owner:"Admin", dueDate:"2026-06-03", priority:"Low", status:"Open", notes:"Legal review expected in June." },
];

export const INITIAL_SERVICE_REQUESTS = [
  { id:"sr1", clientId:4, requester:"Dina Khalil", email:"dina@noon.com", category:"Reporting", priority:"High", status:"New", subject:"Monthly board pack with operational KPIs", description:"Please prepare the May board pack with revenue trend, mandate status, and bot workload exceptions.", receivedAt:"2026-05-22T07:35:00Z", dueDate:"2026-05-24", owner:"Admin", channel:"Client Portal", notes:"Route to partner review after analyst draft." },
  { id:"sr2", clientId:5, requester:"Faisal Al-Otaibi", email:"f@stcpay.com.sa", category:"Operations", priority:"Critical", status:"Triaged", subject:"KYC Helper latency investigation", description:"Client needs incident summary and remediation plan for elevated response times.", receivedAt:"2026-05-22T08:10:00Z", dueDate:"2026-05-22", owner:"Admin", channel:"Email", notes:"Coordinate with operations before sending response." },
  { id:"sr3", clientId:10, requester:"Rima Nasser", email:"rima@tabby.ai", category:"Portfolio Review", priority:"Medium", status:"In Progress", subject:"Trial onboarding review session", description:"Requesting a 30-minute review of first-week adoption and next actions.", receivedAt:"2026-05-21T13:20:00Z", dueDate:"2026-05-27", owner:"Admin", channel:"Client Portal", notes:"Attach activation metrics." },
];

export const INITIAL_SETTINGS = {
  currency: "USD",
  timezone: "UTC+3",
  language: "English",
  companyName: "MgucaTECH",
  notifications: {
    botAlerts:    true,
    dealUpdates:  true,
    invoices:     true,
    weeklyReport: false,
  },
};

export const INITIAL_USER = {
  name:   "Admin",
  email:  "admin@mgucatech.com",
  role:   "Internal CRM",
  avatar: "M",
};

export const INITIAL_STATE = {
  clients:      INITIAL_CLIENTS,
  pipeline:     INITIAL_PIPELINE,
  bots:         INITIAL_BOTS,
  mrrData:      MRR_DATA,
  msgData:      MSG_DATA,
  activity:     INITIAL_ACTIVITY,
  notifications:INITIAL_NOTIFICATIONS,
  tasks:        INITIAL_TASKS,
  serviceRequests: INITIAL_SERVICE_REQUESTS,
  toasts:       [],
  settings:     INITIAL_SETTINGS,
  user:         INITIAL_USER,
  nav:          { view: "dashboard", clientId: null },
  commandPaletteOpen: false,
};
