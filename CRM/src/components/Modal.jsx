import { useEffect } from "react";
import { createPortal } from "react-dom";
import { C, font } from "../constants";

export default function Modal({ title, children, onClose, onSave, saveLabel = "Save", danger = false, size = "md" }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const widths = { sm: 420, md: 560, lg: 720 };

  return createPortal(
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:900,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
        width:"100%", maxWidth:widths[size], maxHeight:"90vh", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"20px 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:700, fontFamily:font.body }}>{title}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", cursor:"pointer",
            color:C.muted, fontSize:20, lineHeight:1, padding:"0 4px" }}>×</button>
        </div>

        {/* body */}
        <div style={{ padding:"24px", overflowY:"auto", flex:1 }}>{children}</div>

        {/* footer */}
        {onSave && (
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10,
            padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            <button onClick={onClose}
              style={{ background:C.subtle, border:"none", borderRadius:8, padding:"9px 20px",
                fontSize:13, fontWeight:600, cursor:"pointer", color:C.muted }}>Cancel</button>
            <button onClick={onSave}
              style={{ background: danger ? C.red : C.accent, border:"none", borderRadius:8,
                padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
                color: danger ? "#fff" : "#000" }}>{saveLabel}</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function FormRow({ label, error, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted,
        letterSpacing:.5, textTransform:"uppercase", marginBottom:6 }}>{label}</label>
      {children}
      {error && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{error}</div>}
    </div>
  );
}

export const inputStyle = {
  width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
  color:C.text, padding:"9px 14px", fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box",
  caretColor:C.accent,
};

export const selectStyle = {
  ...inputStyle, cursor:"pointer",
};
