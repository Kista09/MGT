import { useState, useRef, useEffect } from "react";
import { C } from "../constants";
import { useApp } from "../context";

export default function NotificationBell() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const unread = state.notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8,
          width:36, height:36, cursor:"pointer", color:C.muted, fontSize:16,
          display:"flex", alignItems:"center", justifyContent:"center", position:"relative",
          transition:"all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
        !
        {unread > 0 && (
          <span style={{ position:"absolute", top:-4, right:-4, background:C.red, color:"#fff",
            borderRadius:99, fontSize:9, fontWeight:700, minWidth:16, height:16,
            display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:"absolute", top:44, right:0, width:320, background:C.card,
          border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 16px 48px rgba(0,0,0,0.5)",
          zIndex:200, overflow:"hidden" }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:14, fontWeight:600 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={() => dispatch({ type:"CLEAR_NOTIFICATIONS" })}
                style={{ background:"transparent", border:"none", cursor:"pointer",
                  fontSize:11, color:C.muted, fontWeight:500 }}>Mark all read</button>
            )}
          </div>

          <div style={{ maxHeight:340, overflowY:"auto" }}>
            {state.notifications.length === 0 && (
              <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>All caught up!</div>
            )}
            {state.notifications.map(n => (
              <div key={n.id}
                onClick={() => dispatch({ type:"MARK_NOTIFICATION_READ", id:n.id })}
                style={{ display:"flex", gap:12, padding:"12px 16px", cursor:"pointer",
                  background: n.read ? "transparent" : `${C.accent}08`,
                  borderBottom:`1px solid ${C.border}`, transition:"background .1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : `${C.accent}08`; }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color: n.read ? C.muted : C.text, lineHeight:1.4 }}>{n.text}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{n.time}</div>
                </div>
                {!n.read && (
                  <div style={{ width:6, height:6, borderRadius:99, background:C.accent, flexShrink:0, marginTop:4 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
