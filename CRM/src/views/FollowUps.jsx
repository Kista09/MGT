import { useMemo, useState } from "react";
import { C, TASK_PRIORITIES, TASK_STATUSES, font, pill } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";
import SegmentTabs from "../components/SegmentTabs";
import { daysUntil, formatDateShort, todayISO } from "../utils";

const BLANK_TASK = {
  clientId: "",
  title: "",
  owner: "Admin",
  dueDate: todayISO(),
  priority: "Medium",
  status: "Open",
  notes: "",
};

function priorityStyle(priority) {
  if (priority === "High") return pill(C.red, C.redBg);
  if (priority === "Medium") return pill(C.yellow, C.yellowBg);
  return pill(C.blue, C.blueBg);
}

function statusStyle(status) {
  if (status === "Done") return pill(C.accent, C.accentBg);
  if (status === "In Progress") return pill(C.blue, C.blueBg);
  return pill(C.muted, C.subtle);
}

function dueStyle(dueDate, status) {
  const delta = daysUntil(dueDate);
  if (status === "Done") return { color: C.muted, label: formatDateShort(dueDate) };
  if (delta < 0) return { color: C.red, label: `${Math.abs(delta)}d overdue` };
  if (delta === 0) return { color: C.yellow, label: "Due today" };
  if (delta <= 3) return { color: C.yellow, label: `Due in ${delta}d` };
  return { color: C.muted, label: formatDateShort(dueDate) };
}

function validateTask(form) {
  const errors = {};
  if (!form.clientId) errors.clientId = "Select a client";
  if (!form.title.trim()) errors.title = "Required";
  if (!form.dueDate) errors.dueDate = "Required";
  return errors;
}

function TaskForm({ form, setForm, errors, clients }) {
  const set = (key) => (event) => setForm(prev => ({ ...prev, [key]: event.target.value }));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Client" error={errors.clientId}>
          <select value={form.clientId} onChange={set("clientId")} style={{ ...selectStyle, borderColor: errors.clientId ? C.red : C.border }}>
            <option value="">Select client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </FormRow>
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Follow-up" error={errors.title}>
          <input value={form.title} onChange={set("title")} style={{ ...inputStyle, borderColor: errors.title ? C.red : C.border }} placeholder="Schedule renewal call" />
        </FormRow>
      </div>
      <FormRow label="Owner">
        <input value={form.owner} onChange={set("owner")} style={inputStyle} />
      </FormRow>
      <FormRow label="Due Date" error={errors.dueDate}>
        <input type="date" value={form.dueDate} onChange={set("dueDate")} style={{ ...inputStyle, borderColor: errors.dueDate ? C.red : C.border }} />
      </FormRow>
      <FormRow label="Priority">
        <select value={form.priority} onChange={set("priority")} style={selectStyle}>
          {TASK_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
        </select>
      </FormRow>
      <FormRow label="Status">
        <select value={form.status} onChange={set("status")} style={selectStyle}>
          {TASK_STATUSES.map(status => <option key={status}>{status}</option>)}
        </select>
      </FormRow>
      <div style={{ gridColumn:"1/-1" }}>
        <FormRow label="Notes">
          <textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, minHeight:80, resize:"vertical" }} placeholder="Context, next step, or call agenda..." />
        </FormRow>
      </div>
    </div>
  );
}

export default function FollowUps() {
  const { state, dispatch, navigate, toast } = useApp();
  const [search, setSearch] = useState("");
  const [focusFilter, setFocusFilter] = useState("Active");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [form, setForm] = useState(BLANK_TASK);
  const [errors, setErrors] = useState({});

  const clientMap = useMemo(
    () => new Map(state.clients.map(client => [client.id, client])),
    [state.clients]
  );

  const tasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.tasks]
      .filter(task => {
        const client = clientMap.get(task.clientId);
        const delta = daysUntil(task.dueDate);
        const focusMatch =
          focusFilter === "All" ||
          (focusFilter === "Active" && task.status !== "Done") ||
          (focusFilter === "Overdue" && task.status !== "Done" && delta < 0) ||
          (focusFilter === "Today" && task.status !== "Done" && delta === 0) ||
          (focusFilter === "Week" && task.status !== "Done" && delta >= 0 && delta <= 7) ||
          (focusFilter === "High" && task.priority === "High") ||
          (focusFilter === "Done" && task.status === "Done");
        const statusMatch = statusFilter === "All" ||
          (statusFilter === "Active" ? task.status !== "Done" : task.status === statusFilter);
        const priorityMatch = priorityFilter === "All" || task.priority === priorityFilter;
        const searchMatch = !q ||
          task.title.toLowerCase().includes(q) ||
          (task.notes ?? "").toLowerCase().includes(q) ||
          (client?.name ?? "").toLowerCase().includes(q);
        return focusMatch && statusMatch && priorityMatch && searchMatch;
      })
      .sort((a, b) => {
        if (a.status === "Done" && b.status !== "Done") return 1;
        if (a.status !== "Done" && b.status === "Done") return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [clientMap, focusFilter, priorityFilter, search, state.tasks, statusFilter]);

  const openCount = state.tasks.filter(task => task.status !== "Done").length;
  const overdueCount = state.tasks.filter(task => task.status !== "Done" && daysUntil(task.dueDate) < 0).length;
  const dueTodayCount = state.tasks.filter(task => task.status !== "Done" && daysUntil(task.dueDate) === 0).length;
  const dueWeekCount = state.tasks.filter(task => {
    const delta = daysUntil(task.dueDate);
    return task.status !== "Done" && delta >= 0 && delta <= 7;
  }).length;
  const highPriorityCount = state.tasks.filter(task => task.priority === "High" && task.status !== "Done").length;
  const focusTabs = [
    { id:"Active", label:"Active", count:openCount },
    { id:"Overdue", label:"Overdue", count:overdueCount },
    { id:"Today", label:"Due Today", count:dueTodayCount },
    { id:"Week", label:"This Week", count:dueWeekCount },
    { id:"High", label:"High Priority", count:highPriorityCount },
    { id:"Done", label:"Done", count:state.tasks.filter(task => task.status === "Done").length },
    { id:"All", label:"All", count:state.tasks.length },
  ];

  const openAdd = () => {
    setForm({ ...BLANK_TASK, owner: state.user.name });
    setErrors({});
    setAddOpen(true);
  };

  const openEdit = (task) => {
    setForm({ ...task, clientId: String(task.clientId) });
    setErrors({});
    setEditTask(task);
  };

  const saveAdd = () => {
    const next = { ...form, clientId: Number(form.clientId) };
    const nextErrors = validateTask(next);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    dispatch({ type:"ADD_TASK", task: next });
    toast("Follow-up added", "!");
    setAddOpen(false);
  };

  const saveEdit = () => {
    const next = { ...editTask, ...form, clientId: Number(form.clientId) };
    const nextErrors = validateTask(next);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    dispatch({ type:"UPDATE_TASK", task: next });
    toast("Follow-up updated", "✓");
    setEditTask(null);
  };

  const confirmDelete = () => {
    dispatch({ type:"DELETE_TASK", id: deleteTask.id });
    toast("Follow-up deleted", "x", "warning");
    setDeleteTask(null);
  };

  return (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Follow-ups</div>
          <div style={{ color:C.muted, fontSize:14 }}>
            {openCount} active · {overdueCount} overdue · {dueTodayCount} due today
          </div>
        </div>
        <button type="button" onClick={openAdd}
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:8,
            padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + New Follow-up
        </button>
      </div>

      <SegmentTabs tabs={focusTabs} value={focusFilter} onChange={setFocusFilter} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(160px,1fr))", gap:14, marginBottom:20 }}>
        {[
          { label:"Open Work", value:openCount, color:C.accent },
          { label:"Overdue", value:overdueCount, color:overdueCount ? C.red : C.muted },
          { label:"Due Today", value:dueTodayCount, color:dueTodayCount ? C.yellow : C.muted },
        ].map(item => (
          <div key={item.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"16px 18px" }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.6, textTransform:"uppercase", marginBottom:8 }}>{item.label}</div>
            <div style={{ fontFamily:font.mono, fontSize:26, color:item.color, fontWeight:700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Search follow-ups, notes, clients..."
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, padding:"8px 14px", fontSize:13, outline:"none",
            flex:"1 1 240px", maxWidth:340 }} />
        {["Active", "All", ...TASK_STATUSES].map(status => (
          <button key={status} type="button" onClick={() => setStatusFilter(status)}
            style={{ background: statusFilter === status ? C.accentBg : C.card,
              border:`1px solid ${statusFilter === status ? C.accent : C.border}`,
              color: statusFilter === status ? C.accent : C.muted,
              borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight:500 }}>
            {status}
          </button>
        ))}
        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}
          style={{ ...selectStyle, width:"auto", minWidth:130 }}>
          <option>All</option>
          {TASK_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:14 }}>
        {tasks.map(task => {
          const client = clientMap.get(task.clientId);
          const due = dueStyle(task.dueDate, task.status);
          return (
            <article key={task.id}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, lineHeight:1.35 }}>{task.title}</div>
                  <button type="button" onClick={() => client && navigate("client-detail", client.id)}
                    style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer",
                      padding:0, fontSize:12, marginTop:4, textAlign:"left" }}>
                    {client?.name ?? "Unknown client"}
                  </button>
                </div>
                <span style={statusStyle(task.status)}>{task.status}</span>
              </div>

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                <span style={priorityStyle(task.priority)}>{task.priority}</span>
                <span style={{ ...pill(due.color, C.surface) }}>{due.label}</span>
                <span style={{ ...pill(C.muted, C.subtle) }}>{task.owner}</span>
              </div>

              {task.notes && (
                <p style={{ margin:"0 0 14px", color:C.muted, fontSize:13, lineHeight:1.5 }}>{task.notes}</p>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:C.muted }}>Due {formatDateShort(task.dueDate)}</span>
                <div style={{ display:"flex", gap:6 }}>
                  {task.status !== "Done" && (
                    <button type="button" onClick={() => dispatch({ type:"COMPLETE_TASK", id: task.id })}
                      style={{ background:C.accentBg, border:`1px solid ${C.accentDim}`, color:C.accent,
                        borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Done
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(task)}
                    style={{ background:C.subtle, border:"none", color:C.muted,
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTask(task)}
                    style={{ background:C.redBg, border:"none", color:C.red,
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    Del
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div style={{ padding:48, textAlign:"center", color:C.muted, fontSize:14 }}>No follow-ups match your filters.</div>
      )}

      {addOpen && (
        <Modal title="New Follow-up" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Add Follow-up">
          <TaskForm form={form} setForm={setForm} errors={errors} clients={state.clients} />
        </Modal>
      )}

      {editTask && (
        <Modal title={`Edit - ${editTask.title}`} onClose={() => setEditTask(null)} onSave={saveEdit}>
          <TaskForm form={form} setForm={setForm} errors={errors} clients={state.clients} />
        </Modal>
      )}

      {deleteTask && (
        <Modal title="Delete Follow-up" onClose={() => setDeleteTask(null)} onSave={confirmDelete} saveLabel="Delete" danger>
          <p style={{ color:C.text, margin:0 }}>Delete <strong>{deleteTask.title}</strong>?</p>
        </Modal>
      )}
    </div>
  );
}
