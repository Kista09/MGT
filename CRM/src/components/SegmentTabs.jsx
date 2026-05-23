import { C, font } from "../constants";

export default function SegmentTabs({ tabs, value, onChange, compact = false }) {
  return (
    <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:10 }}>
      {tabs.map(tab => {
        const active = value === tab.id;
        return (
          <button key={tab.id} type="button" onClick={() => onChange(tab.id)}
            style={{ flex:"0 0 auto", display:"flex", alignItems:"center", gap:10,
              background: active ? C.accentBg : C.card,
              border:`1px solid ${active ? C.accent : C.border}`,
              borderRadius:8, color: active ? C.accent : C.muted,
              cursor:"pointer", padding: compact ? "7px 10px" : "10px 14px",
              fontSize:12, fontWeight:700 }}>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span style={{ fontFamily:font.mono, fontSize:11, color:active ? C.accent : C.text,
                background:active ? "rgba(214,184,106,.12)" : C.subtle,
                borderRadius:99, padding:"1px 7px" }}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
