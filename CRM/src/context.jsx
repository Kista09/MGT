import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { INITIAL_STATE } from "./data";
import { STAGE_CONFIG } from "./constants";
import { generateId } from "./utils";

const STORAGE_KEY = "mgucatech_crm_v2";
const SR_PREFIX = "MGT-SR-0000-";
const SR_SHORT_RE = /^MGT-SR-0000-[0-9A-Z]{8}$/i;
const STAGE_ALIASES = {
  Lead: "Origination",
  Demo: "Discovery",
  Closed: "Closed Won",
};

function normalizePipeline(pipeline = {}) {
  const next = Object.fromEntries(Object.keys(STAGE_CONFIG).map(stage => [stage, []]));

  for (const [stage, deals] of Object.entries(pipeline)) {
    const normalizedStage = STAGE_ALIASES[stage] ?? stage;
    const targetStage = next[normalizedStage] ? normalizedStage : "Origination";
    next[targetStage].push(...(deals ?? []).map(deal => ({
      ...deal,
      probability: STAGE_CONFIG[targetStage].probability,
    })));
  }

  return next;
}

function getInitial() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      // always reset transient UI state
      return {
        ...INITIAL_STATE,
        ...parsed,
        user: INITIAL_STATE.user,
        pipeline: normalizePipeline(parsed.pipeline ?? INITIAL_STATE.pipeline),
        tasks: parsed.tasks ?? INITIAL_STATE.tasks,
        serviceRequests: migrateServiceRequests(parsed.serviceRequests ?? INITIAL_STATE.serviceRequests),
        emailLogs: parsed.emailLogs ?? INITIAL_STATE.emailLogs,
        portalUsers: parsed.portalUsers ?? INITIAL_STATE.portalUsers,
        consultants: parsed.consultants ?? INITIAL_STATE.consultants,
        onboardingChecklist: parsed.onboardingChecklist ?? INITIAL_STATE.onboardingChecklist,
        billing: parsed.billing ?? INITIAL_STATE.billing,
        auditLog: parsed.auditLog ?? INITIAL_STATE.auditLog,
        settings: {
          ...INITIAL_STATE.settings,
          ...(parsed.settings ?? {}),
          notifications: {
            ...INITIAL_STATE.settings.notifications,
            ...(parsed.settings?.notifications ?? {}),
          },
        },
        toasts: [],
        nav: { view: "dashboard", clientId: null },
        commandPaletteOpen: false,
      };
    }
  } catch {}
  return { ...INITIAL_STATE, pipeline: normalizePipeline(INITIAL_STATE.pipeline) };
}

function addToActivity(activity, item) {
  return [{ id: generateId(), ...item }, ...activity].slice(0, 60);
}

function auditItem(state, action, target, actor = state.user?.name ?? "System") {
  return {
    id: generateId(),
    time: new Date().toISOString(),
    actor,
    action,
    target,
  };
}

function addAudit(state, action, target) {
  return [auditItem(state, action, target), ...(state.auditLog ?? [])].slice(0, 120);
}

function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function requestFollowUp(request, owner = "Admin") {
  const urgent = request.priority === "Critical" || request.priority === "High" || request.onboarding?.timeline === "As soon as possible";
  const srNumber = request.requestNumber || request.id;
  return {
    id: `t${generateId()}`,
    clientId: Number(request.clientId || 0),
    title: `Follow up: ${request.company ?? request.subject}`,
    owner: request.owner || owner,
    dueDate: urgent ? addDaysISO(1) : addDaysISO(3),
    priority: urgent ? "High" : "Medium",
    status: "Open",
    notes: `Auto-created from service request ${srNumber}. Confirm next action, billing status, and onboarding blockers.`,
    requestId: srNumber,
  };
}

function shortIdFromNumber(value) {
  const suffix = String(Math.max(1, Number(value) || 1).toString(16)).toUpperCase().padStart(8, "0").slice(-8);
  return `${SR_PREFIX}${suffix}`;
}

function makeUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function makeServiceRequestNumber(existingRequests = []) {
  const existing = new Set(existingRequests.map(request => normalizeServiceRequestNumber(request.requestNumber || request.id)).filter(Boolean));
  let requestNumber;
  do {
    requestNumber = `${SR_PREFIX}${makeUuid().replace(/-/g, "").slice(-8).toUpperCase()}`;
  } while (existing.has(requestNumber));
  return requestNumber;
}

function normalizeServiceRequestNumber(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (SR_SHORT_RE.test(str)) return str.toUpperCase();
  const prefixed = str.match(/^MGT-SR-0000-([0-9A-Z-]{9,})$/i);
  if (prefixed) {
    const compact = prefixed[1].replace(/-/g, "").toUpperCase();
    if (compact) return `${SR_PREFIX}${compact.slice(-8).padStart(8, "0")}`;
  }
  const numbered = str.match(/^MGT-SR-(\d+)$/i);
  if (numbered) return shortIdFromNumber(numbered[1]);
  const longMatch = str.match(/^MGT-SR-0{3,}-0*(\d+)$/i);
  if (longMatch) return shortIdFromNumber(longMatch[1]);
  return null;
}

function normalizeServiceRequest(request) {
  const requestNumber = normalizeServiceRequestNumber(request.requestNumber);
  if (!requestNumber) return request;
  return {
    ...request,
    id: requestNumber,
    requestNumber,
  };
}

function migrateServiceRequests(requests) {
  const pool = [];
  const seen = new Set();
  return requests.map(request => {
    const normalized = normalizeServiceRequest(request);
    const id = normalized.requestNumber;
    const valid = id && SR_SHORT_RE.test(id) && !seen.has(id);
    if (valid) {
      seen.add(id);
      pool.push(normalized);
      return normalized;
    }
    const requestNumber = makeServiceRequestNumber(pool);
    seen.add(requestNumber);
    const fixed = { ...normalized, id: requestNumber, requestNumber };
    pool.push(fixed);
    return fixed;
  });
}

function requestIdentity(request = {}) {
  return normalizeServiceRequestNumber(request.requestNumber) || normalizeServiceRequestNumber(request.id) || request.externalId;
}

const REQUEST_AUDIT_FIELDS = {
  requester: "Requester",
  email: "Requester email",
  category: "Category",
  priority: "Priority",
  status: "Status",
  subject: "Subject",
  description: "Request details",
  dueDate: "Target response date",
  owner: "Owner",
  channel: "Channel",
  notes: "Internal notes",
  clientId: "Relationship",
  onboarding: "Onboarding details",
  portalGranted: "Portal access",
  portalUser: "Portal user",
  approvedAt: "Approved at",
  approvedBy: "Approved by",
};

function auditValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "").trim();
}

function requestChanges(before = {}, after = {}) {
  return Object.entries(REQUEST_AUDIT_FIELDS)
    .filter(([field]) => auditValue(before[field]) !== auditValue(after[field]))
    .map(([field, label]) => ({
      field,
      label,
      before: auditValue(before[field]) || "Blank",
      after: auditValue(after[field]) || "Blank",
    }));
}

function requestConsultant(state) {
  return {
    name: state.user?.name ?? "System",
    email: state.user?.email ?? "",
    role: state.user?.role ?? "Internal CRM",
  };
}

function requestEvent(state, type, detail, extra = {}) {
  return {
    id: generateId(),
    time: new Date().toISOString(),
    type,
    detail,
    actor: state.user?.name ?? "System",
    actorEmail: state.user?.email ?? "",
    ...extra,
  };
}

function reducer(state, action) {
  switch (action.type) {

    /* ── Navigation ─────────────────────────────────────────── */
    case "NAVIGATE":
      return { ...state, nav: { view: action.view, clientId: action.clientId ?? null }, commandPaletteOpen: false };

    case "TOGGLE_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };

    case "CLOSE_COMMAND_PALETTE":
      return { ...state, commandPaletteOpen: false };

    /* ── Clients ─────────────────────────────────────────────── */
    case "ADD_CLIENT": {
      const client = { ...action.client, id: Date.now(), notes: [] };
      return {
        ...state,
        clients: [...state.clients, client],
        activity: addToActivity(state.activity, { time: "Just now", icon: "👤", text: `New client added — ${client.name}` }),
        auditLog: addAudit(state, "Client created", client.name),
      };
    }
    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map(c => c.id === action.client.id ? { ...c, ...action.client } : c),
        activity: addToActivity(state.activity, { time: "Just now", icon: "✏️", text: `Client updated — ${action.client.name}` }),
        auditLog: addAudit(state, "Client updated", action.client.name),
      };
    case "DELETE_CLIENT": {
      const c = state.clients.find(x => x.id === action.id);
      return {
        ...state,
        clients: state.clients.filter(x => x.id !== action.id),
        tasks: state.tasks.filter(t => t.clientId !== action.id),
        serviceRequests: state.serviceRequests.filter(request => request.clientId !== action.id),
        activity: addToActivity(state.activity, { time: "Just now", icon: "🗑️", text: `Client removed — ${c?.name ?? ""}` }),
        auditLog: addAudit(state, "Client deleted", c?.name ?? String(action.id)),
      };
    }
    case "ADD_CLIENT_NOTE":
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.clientId
            ? { ...c, notes: [...c.notes, { id: generateId(), ...action.note }] }
            : c
        ),
      };
    case "DELETE_CLIENT_NOTE":
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.clientId
            ? { ...c, notes: c.notes.filter(n => n.id !== action.noteId) }
            : c
        ),
      };

    /* ── Pipeline ────────────────────────────────────────────── */
    case "ADD_DEAL": {
      const deal = { ...action.deal, id: `d${generateId()}`, probability: STAGE_CONFIG[action.stage].probability };
      return {
        ...state,
        pipeline: { ...state.pipeline, [action.stage]: [...(state.pipeline[action.stage] ?? []), deal] },
        activity: addToActivity(state.activity, { time: "Just now", icon: "💼", text: `New deal added — ${deal.company}` }),
      };
    }
    case "UPDATE_DEAL": {
      const pipe = {};
      for (const [stage, deals] of Object.entries(state.pipeline)) {
        pipe[stage] = deals.map(d => d.id === action.deal.id ? { ...d, ...action.deal } : d);
      }
      return { ...state, pipeline: pipe };
    }
    case "DELETE_DEAL": {
      const pipe = {};
      for (const [stage, deals] of Object.entries(state.pipeline)) {
        pipe[stage] = deals.filter(d => d.id !== action.id);
      }
      return { ...state, pipeline: pipe };
    }
    case "MOVE_DEAL": {
      const { deal, fromStage, toStage } = action;
      if (fromStage === toStage) return state;
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [fromStage]: (state.pipeline[fromStage] ?? []).filter(d => d.id !== deal.id),
          [toStage]:   [...(state.pipeline[toStage] ?? []), { ...deal, probability: STAGE_CONFIG[toStage].probability }],
        },
        activity: addToActivity(state.activity, { time: "Just now", icon: "📦", text: `Deal moved — ${deal.company} → ${toStage}` }),
      };
    }

    case "ADD_TASK": {
      const task = { ...action.task, id: `t${generateId()}` };
      const client = state.clients.find(c => c.id === task.clientId);
      return {
        ...state,
        tasks: [task, ...state.tasks],
        activity: addToActivity(state.activity, { time: "Just now", icon: "!", text: `Follow-up added — ${client?.name ?? task.title}` }),
        auditLog: addAudit(state, "Follow-up created", task.title),
      };
    }
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.task.id ? { ...t, ...action.task } : t),
      };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
      };
    case "COMPLETE_TASK": {
      const task = state.tasks.find(t => t.id === action.id);
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.id ? { ...t, status: "Done" } : t),
        activity: addToActivity(state.activity, { time: "Just now", icon: "✓", text: `Follow-up completed — ${task?.title ?? ""}` }),
        auditLog: addAudit(state, "Follow-up completed", task?.title ?? String(action.id)),
      };
    }

    /* ── Bots ────────────────────────────────────────────────── */
    case "ADD_SERVICE_REQUEST": {
      const requestNumber = normalizeServiceRequestNumber(action.request.requestNumber) ?? makeServiceRequestNumber(state.serviceRequests);
      const request = {
        ...action.request,
        id: requestNumber,
        requestNumber,
        receivedAt: new Date().toISOString(),
        status: action.request.status ?? "New",
      };
      const client = state.clients.find(c => c.id === request.clientId);
      const followUp = requestFollowUp(request, state.user?.name);
      return {
        ...state,
        serviceRequests: [request, ...state.serviceRequests],
        tasks: [followUp, ...state.tasks],
        notifications: [{
          id: generateId(),
          icon: "!",
          text: `Service request received - ${client?.name ?? request.requester}`,
          time: "Just now",
          read: false,
        }, ...state.notifications].slice(0, 50),
        activity: addToActivity(state.activity, { time: "Just now", icon: "!", text: `Service request received - ${request.subject}` }),
        auditLog: addAudit(state, "Service request received", request.subject),
      };
    }
    case "IMPORT_SERVICE_REQUESTS": {
      const existingIds = new Set(state.serviceRequests.flatMap(request => [
        request.externalId,
        normalizeServiceRequestNumber(request.requestNumber),
        normalizeServiceRequestNumber(request.id),
      ].filter(Boolean)));
      let pool = [...state.serviceRequests];
      const imported = (action.requests ?? [])
        .filter(request => !existingIds.has(request.externalId ?? normalizeServiceRequestNumber(request.requestNumber) ?? normalizeServiceRequestNumber(request.id)))
        .map(request => {
          const requestNumber = normalizeServiceRequestNumber(request.requestNumber) ?? makeServiceRequestNumber(pool);
          const record = {
            ...request,
            id: requestNumber,
            requestNumber,
            imported: true,
            status: request.status ?? "New",
            clientId: request.clientId ?? null,
          };
          pool = [record, ...pool];
          return record;
        });

      if (!imported.length) return state;

      return {
        ...state,
        serviceRequests: [...imported, ...state.serviceRequests],
        tasks: [
          ...imported.map(request => requestFollowUp(request, request.owner ?? state.user?.name)),
          ...state.tasks,
        ],
        notifications: imported.map(request => ({
          id: generateId(),
          icon: "!",
          text: `Onboarding request received - ${request.company ?? request.requester}`,
          time: "Just now",
          read: false,
        })).concat(state.notifications).slice(0, 50),
        activity: imported.reduce((activity, request) => addToActivity(activity, {
          time: "Just now",
          icon: "!",
          text: `Onboarding request imported - ${request.company ?? request.subject}`,
        }), state.activity),
        auditLog: imported.reduce((auditLog, request) => [
          auditItem(state, "Onboarding request imported", request.company ?? request.subject),
          ...auditLog,
        ], state.auditLog ?? []).slice(0, 120),
      };
    }
    case "UPDATE_SERVICE_REQUEST":
      return {
        ...state,
        serviceRequests: state.serviceRequests.map(request => {
          if (requestIdentity(request) !== requestIdentity(action.request)) return request;
          const updated = { ...request, ...action.request };
          const changes = requestChanges(request, updated);
          if (!changes.length) return updated;
          const consultant = requestConsultant(state);
          return {
            ...updated,
            timeline: [
              requestEvent(state, "edited", `${consultant.name} amended ${changes.map(change => change.label).join(", ")}`),
              ...(request.timeline ?? []),
            ].slice(0, 40),
            auditTrail: [{
              id: generateId(),
              time: new Date().toISOString(),
              consultantName: consultant.name,
              consultantEmail: consultant.email,
              consultantRole: consultant.role,
              amendedBy: consultant.name,
              amendedByEmail: consultant.email,
              actor: consultant.name,
              actorEmail: consultant.email,
              changes,
            }, ...(request.auditTrail ?? [])].slice(0, 25),
          };
        }),
        auditLog: addAudit(state, `Service request set to ${action.request.status ?? "updated"}`, action.request.subject ?? action.request.id),
      };
    case "ADD_REQUEST_TIMELINE_EVENT":
      return {
        ...state,
        serviceRequests: state.serviceRequests.map(request =>
          requestIdentity(request) === action.id
            ? { ...request, timeline: [requestEvent(state, action.eventType, action.detail, action.extra), ...(request.timeline ?? [])].slice(0, 40) }
            : request
        ),
      };
    case "SET_EMAIL_LOGS":
      return { ...state, emailLogs: action.logs ?? [] };
    case "ADD_EMAIL_LOG":
      return { ...state, emailLogs: [action.log, ...(state.emailLogs ?? []).filter(item => item.id !== action.log.id)].slice(0, 200) };
    case "SET_PORTAL_USERS":
      return { ...state, portalUsers: action.users ?? [] };
    case "ADD_PORTAL_USER":
      return { ...state, portalUsers: [action.user, ...(state.portalUsers ?? []).filter(item => item.email !== action.user.email)].slice(0, 200) };
    case "MERGE_CLIENTS": {
      const source = state.clients.find(client => client.id === action.sourceId);
      const target = state.clients.find(client => client.id === action.targetId);
      if (!source || !target || source.id === target.id) return state;
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== source.id).map(client =>
          client.id === target.id
            ? { ...client, notes: [...(client.notes ?? []), ...(source.notes ?? [])] }
            : client
        ),
        serviceRequests: state.serviceRequests.map(request => request.clientId === source.id ? { ...request, clientId: target.id } : request),
        tasks: state.tasks.map(task => task.clientId === source.id ? { ...task, clientId: target.id } : task),
        billing: state.billing.map(invoice => invoice.clientId === source.id ? { ...invoice, clientId: target.id } : invoice),
        auditLog: addAudit(state, "Clients merged", `${source.name} -> ${target.name}`),
      };
    }
    case "ARCHIVE_TEST_RECORDS":
      return {
        ...state,
        serviceRequests: state.serviceRequests.map(request => /test|demo/i.test(`${request.subject} ${request.requester} ${request.email}`) ? { ...request, status:"Closed", archived:true } : request),
        clients: state.clients.map(client => /test|demo/i.test(`${client.name} ${client.email}`) ? { ...client, status:"Churned", archived:true } : client),
        auditLog: addAudit(state, "Test records archived", "Detected records containing test/demo"),
      };
    case "DELETE_SERVICE_REQUEST":
      return {
        ...state,
        serviceRequests: state.serviceRequests.filter(request => requestIdentity(request) !== action.id),
        auditLog: addAudit(state, "Service request deleted", String(action.id)),
      };

    case "ADD_BOT": {
      const bot = { ...action.bot, id: `b${generateId()}`, msgs: 0, uptime: 100, errorRate: 0, avgResponseMs: 210, deployedAt: new Date().toISOString().slice(0, 10) };
      return {
        ...state,
        bots: [...state.bots, bot],
        activity: addToActivity(state.activity, { time: "Just now", icon: "🤖", text: `Bot deployed — ${bot.name} (${bot.client})` }),
        auditLog: addAudit(state, "Bot deployed", `${bot.client} - ${bot.name}`),
      };
    }
    case "UPDATE_BOT":
      return {
        ...state,
        bots: state.bots.map(b => b.id === action.bot.id ? { ...b, ...action.bot } : b),
        auditLog: addAudit(state, "Bot updated", `${action.bot.client} - ${action.bot.name}`),
      };
    case "DELETE_BOT": {
      const b = state.bots.find(x => x.id === action.id);
      return {
        ...state,
        bots: state.bots.filter(x => x.id !== action.id),
        activity: addToActivity(state.activity, { time: "Just now", icon: "🗑️", text: `Bot removed — ${b?.name ?? ""}` }),
        auditLog: addAudit(state, "Bot removed", b?.name ?? String(action.id)),
      };
    }

    case "UPDATE_BILLING":
      return {
        ...state,
        billing: state.billing.map(invoice => invoice.id === action.invoice.id ? { ...invoice, ...action.invoice } : invoice),
        auditLog: addAudit(state, `Invoice set to ${action.invoice.status}`, action.invoice.reference ?? action.invoice.id),
      };

    case "ADD_CONSULTANT":
      return {
        ...state,
        consultants: [{ ...action.consultant, id: `consultant-${generateId()}`, active: true }, ...(state.consultants ?? [])],
        auditLog: addAudit(state, "Consultant added", action.consultant.email),
      };
    case "UPDATE_CONSULTANT":
      return {
        ...state,
        consultants: (state.consultants ?? []).map(item => item.id === action.consultant.id ? { ...item, ...action.consultant } : item),
        auditLog: addAudit(state, "Consultant updated", action.consultant.email),
      };

    /* ── Toasts ──────────────────────────────────────────────── */
    case "ADD_TOAST":
      return { ...state, toasts: [{ id: generateId(), message: action.message, toastType: action.toastType ?? "success", icon: action.icon ?? "✓" }, ...state.toasts] };
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    /* ── Notifications ───────────────────────────────────────── */
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [{ id: generateId(), read: false, ...action.notification }, ...state.notifications].slice(0, 50) };
    case "MARK_NOTIFICATION_READ":
      return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) };
    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };

    /* ── Settings / User ─────────────────────────────────────── */
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.user } };

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children, authenticatedUser = null }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitial);

  useEffect(() => {
    if (authenticatedUser) {
      dispatch({ type: "UPDATE_USER", user: authenticatedUser });
    }
  }, [authenticatedUser]);

  useEffect(() => {
    try {
      const { toasts, commandPaletteOpen, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {}
  }, [state]);

  const toast = useCallback((message, icon = "✓", toastType = "success") => {
    dispatch({ type: "ADD_TOAST", message, icon, toastType });
  }, []);

  const navigate = useCallback((view, clientId = null) => {
    dispatch({ type: "NAVIGATE", view, clientId });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, toast, navigate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
