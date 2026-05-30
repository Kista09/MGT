export const C = {
  bg:       "#F8F4EF",
  surface:  "#FFFFFF",
  card:     "#FFFFFF",
  border:   "#E8E2DA",
  accent:   "#E8561A",
  accentDim:"#B84618",
  accentBg: "#FDF0EB",
  red:      "#B42318",
  redBg:    "#FFF1F0",
  yellow:   "#A16207",
  yellowBg: "#FEF3C7",
  blue:     "#0C4A4A",
  blueBg:   "#E4F2F2",
  purple:   "#6B4E71",
  purpleBg: "#F3EEF5",
  text:     "#1A1A1A",
  muted:    "#6F6258",
  subtle:   "#F3ECE3",
  slate:    "#EFE7DC",
  success:  "#0C4A4A",
  successBg:"#E4F2F2",
  dark:     "#1A1A1A",
  teal:     "#0C4A4A",
  cream:    "#F8F4EF",
};

export const PLAN_COLORS = {
  Enterprise: { color: "#fff", bg: "#7c3aed" },
  Scale:      { color: "#fff", bg: "#2563eb" },
  Growth:     { color: "#fff", bg: "#1a9948" },
};

export const TYPE_COLORS = {
  Support:   "#60a5fa",
  Ops:       "#a855f7",
  Marketing: "#fbbf24",
  Sales:     "#25d366",
};

export const STAGE_CONFIG = {
  Origination:   { color: "#94a3b8", bg: "#1a1f2e", probability: 5,  phase: "Source" },
  Qualification: { color: "#a3bffa", bg: "#101a2d", probability: 15, phase: "Source" },
  Discovery:     { color: "#f6c453", bg: "#29210d", probability: 25, phase: "Assess" },
  Diligence:     { color: "#fb923c", bg: "#2a190d", probability: 40, phase: "Assess" },
  "IC Review":   { color: "#b99cff", bg: "#1d1630", probability: 55, phase: "Approve" },
  Proposal:      { color: "#7aa7ff", bg: "#101a2d", probability: 70, phase: "Approve" },
  Negotiation:   { color: "#d6b86a", bg: "#261f10", probability: 85, phase: "Close" },
  Closing:       { color: "#5ee0a0", bg: "#0d251a", probability: 95, phase: "Close" },
  "Closed Won":  { color: "#22c55e", bg: "#0d2918", probability: 100, phase: "Closed" },
  "Closed Lost": { color: "#f87171", bg: "#2a1114", probability: 0, phase: "Closed" },
};

export const NAV_ITEMS = [
  { id: "today",     icon: "T",  label: "Today" },
  { id: "dashboard", icon: "D",  label: "Executive" },
  { id: "clients",   icon: "R",  label: "Relationships" },
  { id: "pipeline",  icon: "M",  label: "Mandates" },
  { id: "onboarding", icon: "N", label: "Onboarding" },
  { id: "requests",  icon: "Q",  label: "Requests" },
  { id: "followups", icon: "!",  label: "Follow-ups" },
  { id: "bots",      icon: "O",  label: "Operations" },
  { id: "flow-builder", icon: "F", label: "Flow Builder" },
  { id: "presentations", icon: "P", label: "Presentations" },
  { id: "private-clients", icon: "P", label: "Private Clients" },
  { id: "analytics",    icon: "A",  label: "Analytics" },
  { id: "client-admin", icon: "C",  label: "Client Admin" },
  { id: "internal-forms", icon: "F", label: "Internal Forms" },
  { id: "settings",     icon: "S",  label: "Settings"  },
];

export const NAV_GROUPS = [
  {
    label: "Workspace",
    items: NAV_ITEMS.filter(item => ["today", "dashboard", "clients", "pipeline"].includes(item.id)),
  },
  {
    label: "Consultant",
    items: NAV_ITEMS.filter(item => ["onboarding", "requests", "followups", "bots", "flow-builder"].includes(item.id)),
  },
  {
    label: "Admin",
    items: NAV_ITEMS.filter(item => ["presentations", "private-clients", "analytics", "client-admin", "internal-forms", "settings"].includes(item.id)),
  },
];

export const PLANS      = ["Enterprise", "Scale", "Growth"];
export const STATUSES   = ["Active", "Trial", "Churned"];
export const BOT_TYPES  = ["Support", "Ops", "Marketing", "Sales"];
export const BOT_STATUSES = ["Online", "Warning", "Offline", "Trial"];
export const LANGUAGES  = ["English", "isiXhosa", "isiZulu", "Afrikaans", "Sesotho", "Setswana"];
export const TASK_PRIORITIES = ["High", "Medium", "Low"];
export const TASK_STATUSES = ["Open", "In Progress", "Done"];
export const REQUEST_CATEGORIES = ["Reporting", "Portfolio Review", "Compliance", "Operations", "Billing", "Technical", "Other"];
export const REQUEST_PRIORITIES = ["Critical", "High", "Medium", "Low"];
export const REQUEST_STATUSES = [
  "New",
  "Qualified",
  "Proposal Sent",
  "Approved",
  "In Setup",
  "Build",
  "Testing",
  "Live",
  "Support",
  "Needs Attention",
  "Triaged",
  "In Progress",
  "Waiting on Client",
  "Resolved",
  "Closed",
];

export const SERVICE_LIFECYCLE = [
  "New",
  "Qualified",
  "Proposal Sent",
  "Approved",
  "In Setup",
  "Build",
  "Testing",
  "Live",
  "Support",
];

export const SERVICE_PACKAGES = [
  { name:"Starter", setup:3500, monthly:1470, fit:"Launch WhatsApp, booking workflow, and client portal basics." },
  { name:"Growth", setup:9500, monthly:4500, fit:"Adds richer automation, analytics, handoff rules, and campaign support." },
  { name:"Scale", setup:18500, monthly:9500, fit:"Multi-flow operations, advanced reporting, SLA monitoring, and integrations." },
  { name:"Custom", setup:0, monthly:0, fit:"Scoped case-by-case for larger South African operations." },
];

export const CONSULTANT_ROLES = [
  { name:"Executive", focus:"Revenue, approvals, risk, and strategic relationships." },
  { name:"Consultant", focus:"Requests, follow-ups, onboarding capture, and client communication." },
  { name:"Operations", focus:"Bot incidents, booking setup, runbooks, and go-live readiness." },
  { name:"Admin", focus:"Pricing, billing, users, exports, and audit readiness." },
  { name:"Private Client Access", focus:"Restricted private-client records and approvals only." },
  { name:"Read-only", focus:"View CRM records without changing operational data." },
];
export const INDUSTRIES = [
  "Retail","Grocery","Sports","E-Commerce","Financial Services",
  "Logistics","Transport","Banking","Healthcare","SaaS","Hospitality",
];

export const pill = (color, bg) => ({
  display:"inline-flex", alignItems:"center",
  padding:"2px 10px", borderRadius:99,
  fontSize:11, fontWeight:600, letterSpacing:.4,
  color, background:bg, whiteSpace:"nowrap",
});

export const statusPill = (s) => {
  if (s === "Active"  || s === "Online")  return pill(C.success, C.successBg);
  if (s === "Trial")                       return pill(C.yellow, C.yellowBg);
  if (s === "Churned" || s === "Offline") return pill(C.red, C.redBg);
  if (s === "Warning")                     return pill(C.yellow, C.yellowBg);
  return pill(C.muted, C.subtle);
};

export const font = {
  body: "'DM Sans', sans-serif",
  mono: "'DM Sans', sans-serif",
  display: "'Cormorant Garamond', Georgia, serif",
};
