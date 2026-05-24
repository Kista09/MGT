import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { INITIAL_STATE } from "./data";
import { STAGE_CONFIG } from "./constants";
import { generateId } from "./utils";

const STORAGE_KEY = "mgucatech_crm_v1";
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
        serviceRequests: parsed.serviceRequests ?? INITIAL_STATE.serviceRequests,
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
  return {
    id: `t${generateId()}`,
    clientId: Number(request.clientId || 0),
    title: `Follow up: ${request.company ?? request.subject}`,
    owner: request.owner || owner,
    dueDate: urgent ? addDaysISO(1) : addDaysISO(3),
    priority: urgent ? "High" : "Medium",
    status: "Open",
    notes: `Auto-created from service request ${request.id}. Confirm next action, billing status, and onboarding blockers.`,
    requestId: request.id,
  };
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
      const request = {
        ...action.request,
        id: `sr${generateId()}`,
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
      const existingIds = new Set(state.serviceRequests.map(request => request.externalId ?? request.id));
      const imported = (action.requests ?? [])
        .filter(request => !existingIds.has(request.externalId ?? request.id))
        .map(request => ({
          ...request,
          imported: true,
          status: request.status ?? "New",
          clientId: request.clientId ?? null,
        }));

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
          if (request.id !== action.request.id) return request;
          const updated = { ...request, ...action.request };
          const changes = requestChanges(request, updated);
          if (!changes.length) return updated;
          const consultant = requestConsultant(state);
          return {
            ...updated,
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
    case "DELETE_SERVICE_REQUEST":
      return {
        ...state,
        serviceRequests: state.serviceRequests.filter(request => request.id !== action.id),
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
