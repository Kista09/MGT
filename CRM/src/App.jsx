import { useEffect } from "react";
import { AppProvider, useApp } from "./context";
import InternalAuthGate from "./auth";
import { C, font } from "./constants";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Toasts from "./components/Toast";
import CommandPalette from "./components/CommandPalette";
import Today       from "./views/Today";
import Dashboard   from "./views/Dashboard";
import Clients     from "./views/Clients";
import ClientDetail from "./views/ClientDetail";
import Pipeline    from "./views/Pipeline";
import Onboarding  from "./views/Onboarding";
import ServiceRequests from "./views/ServiceRequests";
import FollowUps   from "./views/FollowUps";
import Bots        from "./views/Bots";
import FlowBuilder  from "./views/FlowBuilder";
import PrivateClients from "./views/ConfidentialClients";
import Presentations from "./views/Presentations";
import Analytics   from "./views/Analytics";
import Settings    from "./views/Settings";

function canAccessPrivateClients(user) {
  const email = (user?.email ?? "").toLowerCase();
  return email.endsWith("@mgucatech.com")
    || ["admin", "consultant", "support", "owner", "superadmin"].includes(user?.accessRole);
}

function AppInner({ onLogout }) {
  const { state, dispatch } = useApp();
  const { view, clientId } = state.nav;
  const privateAccess = canAccessPrivateClients(state.user);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_COMMAND_PALETTE" });
      }
      if (e.key === "Escape") {
        dispatch({ type: "CLOSE_COMMAND_PALETTE" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  useEffect(() => {
    if (!privateAccess && view === "private-clients") {
      dispatch({ type: "NAVIGATE", view: "clients" });
    }
  }, [dispatch, privateAccess, view]);

  const views = {
    today:          <Today />,
    dashboard:      <Dashboard />,
    clients:        <Clients />,
    "client-detail":<ClientDetail clientId={clientId} />,
    pipeline:       <Pipeline />,
    onboarding:     <Onboarding />,
    requests:       <ServiceRequests />,
    followups:      <FollowUps />,
    bots:           <Bots />,
    "flow-builder": <FlowBuilder />,
    presentations:  <Presentations />,
    "private-clients": privateAccess ? <PrivateClients /> : <Clients />,
    analytics:      <Analytics />,
    settings:       <Settings />,
  };

  return (
    <div style={{ fontFamily:font.body, background:C.bg, color:C.text,
      minHeight:"100vh", display:"flex", overflowX:"hidden" }}>
      <Sidebar />
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <Navbar />
        {views[view] ?? <Dashboard />}
      </div>
      <Toasts />
      <button
        type="button"
        onClick={onLogout}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 300,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: C.card,
          color: C.muted,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 10px",
        }}
      >
        Sign out
      </button>
      {state.commandPaletteOpen && <CommandPalette />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <InternalAuthGate>
        {({ user, logout }) => (
          <AppProvider authenticatedUser={user}>
            <AppInner onLogout={logout} />
          </AppProvider>
        )}
      </InternalAuthGate>
    </ErrorBoundary>
  );
}
