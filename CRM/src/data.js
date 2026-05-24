export const INITIAL_CLIENTS = [
  { id:1, name:"Cape Wellness Clinic", contact:"Lerato Mokoena", email:"lerato@capewellness.co.za", phone:"+27 82 123 4567", website:"capewellness.co.za", plan:"Enterprise", status:"Active", mrr:42000, joined:"2024-03", tag:"Healthcare", notes:[{ id:"n1", text:"Interested in expanding to 6 WhatsApp workflows by Q2.", author:"Admin", createdAt:"2025-04-10T09:00:00Z" }] },
  { id:2, name:"Mzansi Fresh Market", contact:"Thabo Nkosi", email:"thabo@mzansifresh.co.za", phone:"+27 73 234 5678", website:"mzansifresh.co.za", plan:"Growth", status:"Active", mrr:18500, joined:"2024-07", tag:"Grocery", notes:[] },
  { id:3, name:"Ubuntu FC", contact:"Nandi Dlamini", email:"nandi@ubuntufc.co.za", phone:"+27 71 345 6789", website:"ubuntufc.co.za", plan:"Enterprise", status:"Active", mrr:32000, joined:"2023-11", tag:"Sports", notes:[] },
  { id:4, name:"Takealot Partner Store", contact:"Ayesha Jacobs", email:"ayesha@tapartner.co.za", phone:"+27 83 456 7890", website:"tapartner.co.za", plan:"Scale", status:"Active", mrr:73500, joined:"2023-08", tag:"E-Commerce", notes:[{ id:"n2", text:"Debit order enabled. Review contract renewal in August.", author:"Admin", createdAt:"2025-03-01T11:30:00Z" }] },
  { id:5, name:"KasiPay", contact:"Sibusiso Khumalo", email:"sibusiso@kasipay.co.za", phone:"+27 76 567 8901", website:"kasipay.co.za", plan:"Enterprise", status:"Active", mrr:64000, joined:"2023-05", tag:"Financial Services", notes:[] },
  { id:6, name:"Book Circle SA", contact:"Megan Naidoo", email:"megan@bookcircle.co.za", phone:"+27 74 678 9012", website:"bookcircle.co.za", plan:"Growth", status:"Trial", mrr:0, joined:"2025-01", tag:"Retail", notes:[{ id:"n3", text:"Trial ends 2025-03-01. Follow up about Rand pricing.", author:"Admin", createdAt:"2025-01-15T08:00:00Z" }] },
  { id:7, name:"FastRoute Logistics", contact:"Owen Petersen", email:"owen@fastroute.co.za", phone:"+27 72 789 0123", website:"fastroute.co.za", plan:"Scale", status:"Active", mrr:28500, joined:"2024-04", tag:"Logistics", notes:[] },
  { id:8, name:"MamaCare Baby Store", contact:"Mpho Molefe", email:"mpho@mamacare.co.za", phone:"+27 81 890 1234", website:"mamacare.co.za", plan:"Growth", status:"Churned", mrr:0, joined:"2024-01", tag:"Retail", notes:[{ id:"n4", text:"Churned due to budget cuts. Check back in Q4 2026.", author:"Admin", createdAt:"2025-02-10T10:00:00Z" }] },
  { id:9, name:"CityRide Cape Town", contact:"Yusuf Daniels", email:"yusuf@cityride.co.za", phone:"+27 79 901 2345", website:"cityride.co.za", plan:"Enterprise", status:"Active", mrr:89500, joined:"2023-02", tag:"Transport", notes:[] },
  { id:10, name:"FinWise SA", contact:"Rina Botha", email:"rina@finwise.co.za", phone:"+27 82 012 3456", website:"finwise.co.za", plan:"Scale", status:"Trial", mrr:0, joined:"2025-02", tag:"Financial Services", notes:[] },
];

export const INITIAL_PIPELINE = {
  Lead: [
    { id:"d1", company:"Soweto Home Care", value:36000, age:3, contact:"Palesa Maseko", probability:10, closeDate:"2025-08-01", notes:"" },
    { id:"d2", company:"Durban Foods Co", value:52000, age:7, contact:"Sipho Zulu", probability:10, closeDate:"2025-09-01", notes:"Initial call scheduled" },
    { id:"d3", company:"Garden Route Stays", value:26000, age:1, contact:"Carla Meyer", probability:10, closeDate:"2025-07-15", notes:"" },
  ],
  Demo: [
    { id:"d4", company:"V&A Retail Group", value:69000, age:5, contact:"Nicole Adams", probability:30, closeDate:"2025-07-01", notes:"Demo scheduled for Thursday" },
    { id:"d5", company:"FlyMzansi", value:94000, age:12, contact:"Bongani Sithole", probability:30, closeDate:"2025-08-15", notes:"Needs English and isiZulu bot flows" },
  ],
  Proposal: [
    { id:"d6", company:"Courier SA", value:38500, age:9, contact:"Jason Pillay", probability:60, closeDate:"2025-06-30", notes:"Proposal sent - awaiting legal review" },
    { id:"d7", company:"Cape Mutual Bank", value:82000, age:4, contact:"Lindiwe Ndlovu", probability:60, closeDate:"2025-07-10", notes:"" },
  ],
  Closed: [
    { id:"d8", company:"Takealot Partner Store", value:73500, age:0, contact:"Ayesha Jacobs", probability:100, closeDate:"2025-05-10", notes:"" },
    { id:"d9", company:"CityRide Cape Town", value:89500, age:0, contact:"Yusuf Daniels", probability:100, closeDate:"2025-04-28", notes:"" },
  ],
};

export const INITIAL_BOTS = [
  { id:"b1", name:"Customer Support", client:"Takealot Partner Store", msgs:14200, uptime:99.8, status:"Online", lang:"English", type:"Support", deployedAt:"2023-09-01", avgResponseMs:245, errorRate:0.02 },
  { id:"b2", name:"Order Tracker", client:"Takealot Partner Store", msgs:8900, uptime:99.9, status:"Online", lang:"English", type:"Ops", deployedAt:"2023-09-05", avgResponseMs:312, errorRate:0.01 },
  { id:"b3", name:"Loyalty Assistant", client:"Takealot Partner Store", msgs:3100, uptime:97.2, status:"Online", lang:"English", type:"Marketing", deployedAt:"2024-01-10", avgResponseMs:420, errorRate:0.08 },
  { id:"b4", name:"Ride Support", client:"CityRide Cape Town", msgs:22400, uptime:99.7, status:"Online", lang:"English", type:"Support", deployedAt:"2023-03-15", avgResponseMs:198, errorRate:0.01 },
  { id:"b5", name:"Driver Ops", client:"CityRide Cape Town", msgs:11300, uptime:99.5, status:"Online", lang:"isiXhosa", type:"Ops", deployedAt:"2023-04-01", avgResponseMs:267, errorRate:0.02 },
  { id:"b6", name:"Promo Bot", client:"CityRide Cape Town", msgs:5600, uptime:98.1, status:"Online", lang:"English", type:"Marketing", deployedAt:"2024-02-20", avgResponseMs:389, errorRate:0.05 },
  { id:"b7", name:"Pay Assistant", client:"KasiPay", msgs:18700, uptime:99.9, status:"Online", lang:"English", type:"Support", deployedAt:"2023-06-01", avgResponseMs:221, errorRate:0.01 },
  { id:"b8", name:"FICA Helper", client:"KasiPay", msgs:4300, uptime:99.2, status:"Warning", lang:"English", type:"Ops", deployedAt:"2023-08-15", avgResponseMs:534, errorRate:0.14 },
  { id:"b9", name:"Fashion Advisor", client:"Cape Wellness Clinic", msgs:6100, uptime:98.9, status:"Online", lang:"English", type:"Sales", deployedAt:"2024-04-01", avgResponseMs:302, errorRate:0.03 },
  { id:"b10", name:"Fan Engagement", client:"Ubuntu FC", msgs:9800, uptime:99.4, status:"Online", lang:"isiZulu", type:"Marketing", deployedAt:"2023-12-01", avgResponseMs:288, errorRate:0.02 },
  { id:"b11", name:"Store Locator", client:"Book Circle SA", msgs:210, uptime:100, status:"Trial", lang:"English", type:"Support", deployedAt:"2025-01-20", avgResponseMs:410, errorRate:0.00 },
  { id:"b12", name:"Pickup Scheduler", client:"FastRoute Logistics", msgs:7700, uptime:98.6, status:"Online", lang:"Afrikaans", type:"Ops", deployedAt:"2024-05-01", avgResponseMs:356, errorRate:0.04 },
];

export const MRR_DATA = [
  { m:"Aug", mrr:171500 }, { m:"Sep", mrr:196000 }, { m:"Oct", mrr:229250 },
  { m:"Nov", mrr:255500 }, { m:"Dec", mrr:276500 }, { m:"Jan", mrr:301000 },
  { m:"Feb", mrr:322000 }, { m:"Mar", mrr:344750 }, { m:"Apr", mrr:365750 },
  { m:"May", mrr:387500 },
];

export const MSG_DATA = [
  { d:"Mon", msgs:84200 }, { d:"Tue", msgs:91000 }, { d:"Wed", msgs:88400 },
  { d:"Thu", msgs:95600 }, { d:"Fri", msgs:78900 }, { d:"Sat", msgs:62100 },
  { d:"Sun", msgs:58300 },
];

export const INITIAL_ACTIVITY = [
  { id:"a1", time:"2 min ago", icon:"B", text:"CityRide Cape Town - Ride Support hit 500k messages milestone" },
  { id:"a2", time:"18 min ago", icon:"Q", text:"New demo booked - V&A Retail Group (Nicole Adams)" },
  { id:"a3", time:"1 hr ago", icon:"!", text:"KasiPay - FICA Helper latency spike detected" },
  { id:"a4", time:"3 hr ago", icon:"Y", text:"FinWise SA trial activated (2 seats)" },
  { id:"a5", time:"5 hr ago", icon:"R", text:"Invoice paid - Takealot Partner Store R73,500 MRR" },
  { id:"a6", time:"Yesterday", icon:"L", text:"Book Circle SA bot deployed to production" },
  { id:"a7", time:"2 days ago", icon:"C", text:"New contact added - Rina Botha (FinWise SA)" },
  { id:"a8", time:"3 days ago", icon:"M", text:"Deal moved - Cape Mutual Bank to Proposal" },
];

export const INITIAL_NOTIFICATIONS = [
  { id:"notif1", icon:"!", text:"KasiPay - FICA Helper latency spike", time:"1 hr ago", read:false },
  { id:"notif2", icon:"R", text:"Invoice paid - Takealot Partner Store R73,500 MRR", time:"5 hr ago", read:false },
  { id:"notif3", icon:"B", text:"Ride Support hit 500k messages milestone", time:"2 hr ago", read:false },
  { id:"notif4", icon:"Y", text:"FinWise SA trial activated", time:"3 hr ago", read:true },
  { id:"notif5", icon:"M", text:"Deal moved: Cape Mutual Bank to Proposal", time:"3 days ago", read:true },
];

export const INITIAL_TASKS = [
  { id:"t1", clientId:6, title:"Convert Book Circle SA trial before renewal call", owner:"Admin", dueDate:"2026-05-24", priority:"High", status:"Open", notes:"Prepare Growth-to-Scale upgrade options." },
  { id:"t2", clientId:10, title:"Send FinWise SA onboarding health report", owner:"Admin", dueDate:"2026-05-27", priority:"Medium", status:"In Progress", notes:"Include first-week activation metrics." },
  { id:"t3", clientId:5, title:"Review FICA Helper latency incident", owner:"Admin", dueDate:"2026-05-22", priority:"High", status:"Open", notes:"Check response-time trend and escalation notes." },
  { id:"t4", clientId:4, title:"Confirm Takealot Partner Store renewal timeline", owner:"Admin", dueDate:"2026-06-03", priority:"Low", status:"Open", notes:"Legal review expected in June." },
  { id:"t5", clientId:10, title:"Confirm Book Now calendar rules and operating hours", owner:"Operations", dueDate:"2026-05-25", priority:"High", status:"Open", notes:"South African public holidays and SAST slots must be checked before go-live." },
];

export const INITIAL_SERVICE_REQUESTS = [
  { id:"sr1", requestNumber:"MGT-SR-0001", clientId:4, requester:"Ayesha Jacobs", email:"ayesha@tapartner.co.za", category:"Reporting", priority:"High", status:"New", subject:"Monthly board pack with operational KPIs", description:"Please prepare the May board pack with revenue trend, mandate status, and bot workload exceptions.", receivedAt:"2026-05-22T07:35:00Z", dueDate:"2026-05-24", owner:"Admin", channel:"Client Portal", notes:"Route to partner review after analyst draft." },
  { id:"sr2", requestNumber:"MGT-SR-0002", clientId:5, requester:"Sibusiso Khumalo", email:"sibusiso@kasipay.co.za", category:"Operations", priority:"Critical", status:"Triaged", subject:"FICA Helper latency investigation", description:"Client needs incident summary and remediation plan for elevated response times.", receivedAt:"2026-05-22T08:10:00Z", dueDate:"2026-05-22", owner:"Admin", channel:"Email", notes:"Coordinate with operations before sending response." },
  { id:"sr3", requestNumber:"MGT-SR-0003", clientId:10, requester:"Rina Botha", email:"rina@finwise.co.za", category:"Portfolio Review", priority:"Medium", status:"In Progress", subject:"Trial onboarding review session", description:"Requesting a 30-minute review of first-week adoption and next actions.", receivedAt:"2026-05-21T13:20:00Z", dueDate:"2026-05-27", owner:"Admin", channel:"Client Portal", notes:"Attach activation metrics." },
];

export const INITIAL_BILLING = [
  { id:"inv1", clientId:4, type:"Monthly retainer", amount:73500, status:"Paid", dueDate:"2026-05-25", paidAt:"2026-05-22", reference:"MGT-2026-051" },
  { id:"inv2", clientId:5, type:"Monthly retainer", amount:64000, status:"Due", dueDate:"2026-05-24", paidAt:null, reference:"MGT-2026-052" },
  { id:"inv3", clientId:10, type:"Setup fee", amount:3500, status:"Overdue", dueDate:"2026-05-20", paidAt:null, reference:"MGT-2026-053" },
  { id:"inv4", clientId:6, type:"Trial conversion", amount:18500, status:"Draft", dueDate:"2026-05-28", paidAt:null, reference:"MGT-2026-054" },
];

export const INITIAL_AUDIT_LOG = [
  { id:"audit1", time:"2026-05-22T08:10:00Z", actor:"Admin", action:"Service request imported", target:"KasiPay - FICA Helper latency investigation" },
  { id:"audit2", time:"2026-05-22T09:30:00Z", actor:"Admin", action:"Follow-up created", target:"Review FICA Helper latency incident" },
  { id:"audit3", time:"2026-05-22T10:15:00Z", actor:"System", action:"Operations alert raised", target:"KasiPay - FICA Helper" },
];

export const INITIAL_SETTINGS = {
  currency: "ZAR",
  timezone: "Africa/Johannesburg",
  language: "English",
  companyName: "MgucaTECH",
  country: "South Africa",
  vatNumber: "",
  supportEmail: "admin@mgucatech.com",
  supportWhatsApp: "+27 76 047 0141",
  bookNowUrl: "https://mgtchat-20260516-1916.vercel.app/#book",
  banking: {
    accountName: "MgucaTech Solutions",
    bank: "South African bank",
    referencePrefix: "MGT",
  },
  serviceDefaults: {
    setupFee: 3500,
    monthlySupport: 1470,
    paymentTerms: "EFT, due on receipt unless otherwise agreed",
  },
  notifications: {
    botAlerts: true,
    dealUpdates: true,
    invoices: true,
    weeklyReport: false,
    serviceRequests: true,
    followUps: true,
  },
};

export const INITIAL_CONSULTANTS = [
  { id:"consultant-1", name:"Bakhokhele Mguca", email:"admin@mgucatech.com", role:"Executive", active:true, focus:"Approvals, proposals, and escalations" },
  { id:"consultant-2", name:"K Consultant", email:"admin@mgucatech.com", role:"Consultant", active:true, focus:"Onboarding capture and follow-ups" },
  { id:"consultant-3", name:"Operations Desk", email:"admin@mgucatech.com", role:"Operations", active:true, focus:"Go-live readiness, incidents, and Book Now setup" },
];

export const INITIAL_ONBOARDING_CHECKLIST = [
  "Submit logo, brand colours, and business profile",
  "Confirm WhatsApp number, operating hours, and handoff contact",
  "Upload FAQ, pricing, service list, and booking rules",
  "Connect Book Now calendar and South African availability",
  "Approve chatbot flow and first booking workflow",
  "Run test conversation and booking simulation",
  "Confirm billing, EFT reference, and go-live date",
];

export const INITIAL_USER = {
  name: "Admin",
  email: "admin@mgucatech.com",
  role: "Internal CRM",
  avatar: "M",
};

export const INITIAL_STATE = {
  clients: INITIAL_CLIENTS,
  pipeline: INITIAL_PIPELINE,
  bots: INITIAL_BOTS,
  mrrData: MRR_DATA,
  msgData: MSG_DATA,
  activity: INITIAL_ACTIVITY,
  notifications: INITIAL_NOTIFICATIONS,
  billing: INITIAL_BILLING,
  consultants: INITIAL_CONSULTANTS,
  onboardingChecklist: INITIAL_ONBOARDING_CHECKLIST,
  auditLog: INITIAL_AUDIT_LOG,
  tasks: INITIAL_TASKS,
  serviceRequests: INITIAL_SERVICE_REQUESTS,
  toasts: [],
  settings: INITIAL_SETTINGS,
  user: INITIAL_USER,
  nav: { view: "dashboard", clientId: null },
  commandPaletteOpen: false,
};
