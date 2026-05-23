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
        pipeline: normalizePipeline(parsed.pipeline ?? INITIAL_STATE.pipeline),
        tasks: parsed.tasks ?? INITIAL_STATE.tasks,
        serviceRequests: parsed.serviceRequests ?? INITIAL_STATE.serviceRequests,
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
      };
    }
    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map(c => c.id === action.client.id ? { ...c, ...action.client } : c),
        activity: addToActivity(state.activity, { time: "Just now", icon: "✏️", text: `Client updated — ${action.client.name}` }),
      };
    case "DELETE_CLIENT": {
      const c = state.clients.find(x => x.id === action.id);
      return {
        ...state,
        clients: state.clients.filter(x => x.id !== action.id),
        tasks: state.tasks.filter(t => t.clientId !== action.id),
        serviceRequests: state.serviceRequests.filter(request => request.clientId !== action.id),
        activity: addToActivity(state.activity, { time: "Just now", icon: "🗑️", text: `Client removed — ${c?.name ?? ""}` }),
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
      return {
        ...state,
        serviceRequests: [request, ...state.serviceRequests],
        notifications: [{
          id: generateId(),
          icon: "!",
          text: `Service request received - ${client?.name ?? request.requester}`,
          time: "Just now",
          read: false,
        }, ...state.notifications].slice(0, 50),
        activity: addToActivity(state.activity, { time: "Just now", icon: "!", text: `Service request received - ${request.subject}` }),
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
      };
    }
    case "UPDATE_SERVICE_REQUEST":
      return {
        ...state,
        serviceRequests: state.serviceRequests.map(request =>
          request.id === action.request.id ? { ...request, ...action.request } : request
        ),
      };
    case "DELETE_SERVICE_REQUEST":
      return {
        ...state,
        serviceRequests: state.serviceRequests.filter(request => request.id !== action.id),
      };

    case "ADD_BOT": {
      const bot = { ...action.bot, id: `b${generateId()}`, msgs: 0, uptime: 100, errorRate: 0, avgResponseMs: 210, deployedAt: new Date().toISOString().slice(0, 10) };
      return {
        ...state,
        bots: [...state.bots, bot],
        activity: addToActivity(state.activity, { time: "Just now", icon: "🤖", text: `Bot deployed — ${bot.name} (${bot.client})` }),
      };
    }
    case "UPDATE_BOT":
      return { ...state, bots: state.bots.map(b => b.id === action.bot.id ? { ...b, ...action.bot } : b) };
    case "DELETE_BOT": {
      const b = state.bots.find(x => x.id === action.id);
      return {
        ...state,
        bots: state.bots.filter(x => x.id !== action.id),
        activity: addToActivity(state.activity, { time: "Just now", icon: "🗑️", text: `Bot removed — ${b?.name ?? ""}` }),
      };
    }

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
