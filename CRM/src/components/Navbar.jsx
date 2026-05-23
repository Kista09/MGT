import { C, NAV_ITEMS, font } from "../constants";
import { useApp } from "../context";
import NotificationBell from "./NotificationBell";

function getPageTitle(view, clientId, clients) {
  if (view === "client-detail") {
    const client = clients.find(item => item.id === clientId);
    return {
      title: client?.name ?? "Client Detail",
      eyebrow: "Relationship dossier",
    };
  }

  const item = NAV_ITEMS.find(navItem => navItem.id === view);
  return {
    title: item?.label ?? "Dashboard",
    eyebrow: view === "dashboard" ? "Investment command center" : "Institutional workspace",
  };
}

export default function Navbar() {
  const { state, dispatch, navigate } = useApp();
  const { view, clientId } = state.nav;
  const page = getPageTitle(view, clientId, state.clients);
  const openTasks = state.tasks.filter(task => task.status !== "Done").length;
  const warningBots = state.bots.filter(bot => bot.status === "Warning").length;
  const activeClients = state.clients.filter(client => client.status === "Active").length;
  const openRequests = (state.serviceRequests ?? []).filter(request => !["Resolved", "Closed"].includes(request.status)).length;

  return (
    <header
      style={{
        height: 76,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "0 28px",
        background: "rgba(248,244,239,0.92)",
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 120,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: C.muted,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 3,
          }}
        >
          {page.eyebrow}
        </div>
        <div
          style={{
            color: C.text,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: font.display,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {page.title}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 220,
        }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_COMMAND_PALETTE" })}
          style={{
            width: "min(460px, 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.muted,
            cursor: "pointer",
            padding: "9px 12px",
            fontSize: 13,
          }}
        >
          <span>Search relationships, mandates, operations...</span>
          <kbd
            style={{
              background: C.subtle,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.muted,
              fontFamily: font.mono,
              fontSize: 10,
              padding: "2px 6px",
            }}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      <nav style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate("clients")}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          {activeClients} active relationships
        </button>
        <button
          type="button"
          onClick={() => navigate("requests")}
          style={{
            background: openRequests ? C.redBg : C.card,
            border: `1px solid ${openRequests ? C.red : C.border}`,
            borderRadius: 6,
            color: openRequests ? C.red : C.muted,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          {openRequests} requests
        </button>
        <button
          type="button"
          onClick={() => navigate("followups")}
          style={{
            background: openTasks ? C.yellowBg : C.card,
            border: `1px solid ${openTasks ? C.yellow : C.border}`,
            borderRadius: 6,
            color: openTasks ? C.yellow : C.muted,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          {openTasks} follow-ups
        </button>
        <button
          type="button"
          onClick={() => navigate("bots")}
          style={{
            background: warningBots ? C.redBg : C.card,
            border: `1px solid ${warningBots ? C.red : C.border}`,
            borderRadius: 6,
            color: warningBots ? C.red : C.muted,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          {warningBots} risk alerts
        </button>
        <NotificationBell />
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 99,
            background: C.teal,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
          }}
          title={`${state.user.name} - ${state.user.role}`}
        >
          {state.user.avatar}
        </div>
      </nav>
    </header>
  );
}
