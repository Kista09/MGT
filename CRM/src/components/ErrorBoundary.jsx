import { Component } from "react";
import { C, font } from "../constants";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("MgucaTECH CRM crashed", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: C.bg,
          color: C.text,
          fontFamily: font.body,
          padding: 24,
        }}
      >
        <section
          style={{
            width: "min(520px, 100%)",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 24,
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: C.red,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Application error
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: 24, lineHeight: 1.2 }}>
            MgucaTECH could not render this view.
          </h1>
          <p style={{ margin: "0 0 18px", color: C.muted, lineHeight: 1.5 }}>
            Refresh the page to return to a clean session. Your CRM data is stored
            locally in this browser.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: C.accent,
              border: "none",
              borderRadius: 8,
              color: "#000",
              cursor: "pointer",
              fontWeight: 700,
              padding: "10px 16px",
            }}
          >
            Refresh
          </button>
        </section>
      </main>
    );
  }
}
