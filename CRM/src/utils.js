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

export function buildPriorityQueue(state) {
  const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const openStatuses = ["Resolved", "Closed", "Done"];
  const requests = (state.serviceRequests ?? [])
    .filter(request => !openStatuses.includes(request.status))
    .map(request => {
      const client = state.clients.find(item => item.id === request.clientId);
      const due = daysUntil(request.dueDate);
      return {
        id: `request-${request.id}`,
        type: "Request",
        nav: "requests",
        title: request.subject,
        client: client?.name ?? request.company ?? request.requester,
        priority: request.priority,
        dueDate: request.dueDate,
        score: (priorityRank[request.priority] ?? 4) * 10 + Math.max(due, -8),
        reason: due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? "Due today" : `${request.status}`,
      };
    });

  const followUps = (state.tasks ?? [])
    .filter(task => task.status !== "Done")
    .map(task => {
      const client = state.clients.find(item => item.id === task.clientId);
      const due = daysUntil(task.dueDate);
      return {
        id: `task-${task.id}`,
        type: "Follow-up",
        nav: "followups",
        title: task.title,
        client: client?.name ?? "Unknown client",
        priority: task.priority,
        dueDate: task.dueDate,
        score: (priorityRank[task.priority] ?? 4) * 10 + Math.max(due, -8) + 4,
        reason: due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? "Due today" : task.status,
      };
    });

  const operations = (state.bots ?? [])
    .filter(bot => ["Warning", "Offline"].includes(bot.status) || (bot.errorRate ?? 0) > 0.1 || bot.uptime < 98.5)
    .map(bot => ({
      id: `bot-${bot.id}`,
      type: "Operations",
      nav: "bots",
      title: bot.name,
      client: bot.client,
      priority: bot.status === "Offline" ? "Critical" : "High",
      dueDate: todayISO(),
      score: bot.status === "Offline" ? -9 : (bot.errorRate ?? 0) > 0.1 ? -4 : 1,
      reason: bot.status === "Offline" ? "Offline" : (bot.errorRate ?? 0) > 0.1 ? "High error rate" : "Uptime risk",
    }));

  const billing = (state.billing ?? [])
    .filter(invoice => ["Due", "Overdue"].includes(invoice.status))
    .map(invoice => {
      const client = state.clients.find(item => item.id === invoice.clientId);
      const due = daysUntil(invoice.dueDate);
      return {
        id: `invoice-${invoice.id}`,
        type: "Billing",
        nav: "settings",
        title: `${invoice.type} - ${fmt$(invoice.amount)}`,
        client: client?.name ?? "Unknown client",
        priority: invoice.status === "Overdue" ? "High" : "Medium",
        dueDate: invoice.dueDate,
        score: invoice.status === "Overdue" ? -3 : 18 + due,
        reason: invoice.status,
      };
    });

  return [...requests, ...followUps, ...operations, ...billing]
    .sort((a, b) => a.score - b.score || String(a.dueDate).localeCompare(String(b.dueDate)));
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
