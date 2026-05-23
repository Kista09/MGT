import { C, font } from "../constants";

export default function CustomTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
      padding:"8px 14px", fontSize:13, fontFamily:font.mono }}>
      <div style={{ color:C.muted, marginBottom:4 }}>{label}</div>
      <div style={{ color:C.accent, fontWeight:700 }}>
        {prefix}{typeof val === "number" ? val.toLocaleString() : val}{suffix}
      </div>
    </div>
  );
}
