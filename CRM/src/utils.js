export const fmt$ = (v) =>
  v > 0 ? `R${Number(v).toLocaleString("en-ZA")}` : "—";

export const fmtRandK = (v) =>
  `R${(Number(v) / 1000).toFixed(0)}k`;

export const fmtK = (v) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const formatJoined = (ym) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

export const todayISO = () =>
  new Date().toISOString().slice(0, 10);

export const daysUntil = (isoDate) => {
  if (!isoDate) return 0;
  const start = new Date(todayISO());
  const end = new Date(isoDate);
  return Math.round((end - start) / 86400000);
};

export const formatDateShort = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const tenureMonths = (ym) => {
  if (!ym) return 0;
  const [y, m] = ym.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
};

export function clientHealthScore(client, bots) {
  if (client.status === "Churned") return 0;
  const cb = bots.filter(b => b.client === client.name);
  let score = client.status === "Active" ? 70 : 45;
  if (client.mrr > 3000) score += 18;
  else if (client.mrr > 1000) score += 10;
  const avgUp = cb.length
    ? cb.reduce((a, b) => a + b.uptime, 0) / cb.length
    : 99.5;
  if (avgUp >= 99.5) score += 12;
  else if (avgUp < 98) score -= 18;
  if (cb.some(b => b.status === "Warning")) score -= 12;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function healthColor(score) {
  if (score >= 80) return "#25d366";
  if (score >= 55) return "#fbbf24";
  return "#f87171";
}

export function exportCSV(rows, headers, filename) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(h => escape(h.label)).join(","),
    ...rows.map(r => headers.map(h => escape(r[h.key])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
