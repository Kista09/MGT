import { C, font } from "../constants";

export default function MetricCard({ label, value, sub, color, trend }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
      padding:"18px 20px", flex:1, minWidth:180, boxShadow:"0 18px 42px rgba(26,26,26,0.08)" }}>
      <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.7,
        textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:700, color: color || C.text,
        fontFamily:font.display, lineHeight:.95 }}>{value}</div>
      {sub && (
        <div style={{ fontSize:12, color: trend === "up" ? C.accent : trend === "down" ? C.red : C.muted, marginTop:6 }}>
          {trend === "up" ? "+ " : trend === "down" ? "- " : ""}{sub}
        </div>
      )}
    </div>
  );
}
