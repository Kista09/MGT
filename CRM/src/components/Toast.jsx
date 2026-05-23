import { useEffect } from "react";
import { C } from "../constants";
import { useApp } from "../context";

function ToastItem({ toast }) {
  const { dispatch } = useApp();

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: "REMOVE_TOAST", id: toast.id }), 4000);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  const colors = {
    success: { bg: C.accentBg,  border: C.accentDim, text: C.accent },
    error:   { bg: C.redBg,     border: C.red,        text: C.red    },
    warning: { bg: C.yellowBg,  border: C.yellow,     text: C.yellow },
    info:    { bg: C.blueBg,    border: C.blue,       text: C.blue   },
  };
  const col = colors[toast.toastType] ?? colors.success;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
      background:col.bg, border:`1px solid ${col.border}`, borderRadius:10,
      minWidth:280, maxWidth:380, boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
      animation:"toast-slide-in .2s ease" }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{toast.icon}</span>
      <span style={{ flex:1, fontSize:13, color:col.text, fontWeight:500 }}>{toast.message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={() => dispatch({ type: "REMOVE_TOAST", id: toast.id })}
        style={{ background:"transparent", border:"none", cursor:"pointer", color:col.text,
          fontSize:16, lineHeight:1, padding:"0 2px", opacity:.7 }}>x</button>
    </div>
  );
}

export default function Toasts() {
  const { state } = useApp();
  if (!state.toasts.length) return null;

  return (
      <div style={{ position:"fixed", bottom:24, right:24, display:"flex",
        flexDirection:"column-reverse", gap:8, zIndex:1000 }}>
        {state.toasts.map(t => <ToastItem key={t.id} toast={t} />)}
      </div>
  );
}
