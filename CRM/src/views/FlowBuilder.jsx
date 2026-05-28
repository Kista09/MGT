import { useState } from "react";
import { C, font } from "../constants";
import { useApp } from "../context";
import Modal, { FormRow, inputStyle, selectStyle } from "../components/Modal";

const NODE_COLORS = {
  start:   { bg: "#FEE2E2", border: "#FCA5A5", fg: "#7F1D1D", icon: "▶" },
  menu:    { bg: "#FEF9C3", border: "#FDE047", fg: "#713F12", icon: "≡" },
  message: { bg: "#CFFAFE", border: "#67E8F9", fg: "#164E63", icon: "💬" },
  action:  { bg: "#FCE7F3", border: "#F9A8D4", fg: "#831843", icon: "⚡" },
  end:     { bg: "#F5F0E8", border: "#D6C9B5", fg: "#6B5B45", icon: "•" },
};

const NODE_TYPES = ["start", "menu", "message", "action", "end"];
const NODE_W = 170;
const NODE_H = 100;
const CANVAS_W = 1020;
const CANVAS_H = 580;

function nodeRight(node) { return { x: node.x + NODE_W, y: node.y + NODE_H / 2 }; }
function nodeLeft(node)  { return { x: node.x,          y: node.y + NODE_H / 2 }; }

function cubicPath(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`;
}

function FlowEdges({ nodes, edges }) {
  const map = new Map(nodes.map(n => [n.id, n]));
  return (
    <svg style={{ position:"absolute", inset:0, width:CANVAS_W, height:CANVAS_H, pointerEvents:"none", overflow:"visible" }}>
      <defs>
        <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="#9CA3AF" />
        </marker>
      </defs>
      {edges.map(edge => {
        const from = map.get(edge.from);
        const to   = map.get(edge.to);
        if (!from || !to) return null;
        const s = nodeRight(from);
        const e = nodeLeft(to);
        return (
          <path key={edge.id}
            d={cubicPath(s.x, s.y, e.x, e.y)}
            fill="none" stroke="#9CA3AF" strokeWidth={1.5}
            markerEnd="url(#arr)" />
        );
      })}
    </svg>
  );
}

function FlowNode({ node, active, onClick }) {
  const c = NODE_COLORS[node.type] ?? NODE_COLORS.message;
  if (node.type === "end") {
    return (
      <div onClick={() => onClick(node)} style={{
        position:"absolute", left:node.x, top:node.y,
        width:NODE_W, height:NODE_H,
        background:c.bg, border:`2px solid ${active ? C.accent : c.border}`,
        borderRadius:12, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        cursor:"pointer", userSelect:"none",
      }}>
        <div style={{ fontSize:22, color:c.fg, lineHeight:1 }}>•</div>
        <div style={{ fontSize:10, fontWeight:800, color:c.fg, marginTop:4, textAlign:"center", padding:"0 8px" }}>{node.label}</div>
      </div>
    );
  }
  return (
    <div onClick={() => onClick(node)} style={{
      position:"absolute", left:node.x, top:node.y,
      width:NODE_W, minHeight:NODE_H,
      background:c.bg, border:`2px solid ${active ? C.accent : c.border}`,
      borderRadius:12, padding:"10px 12px",
      cursor:"pointer", userSelect:"none",
      boxShadow: active ? `0 0 0 3px ${C.accent}44` : "0 1px 4px rgba(0,0,0,0.07)",
    }}>
      <div style={{ fontSize:8, fontWeight:900, letterSpacing:1.2, textTransform:"uppercase",
        color:c.fg, marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
        <span>{c.icon}</span>
        <span>{node.type.toUpperCase()}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:c.fg, lineHeight:1.3, marginBottom: node.content ? 5 : 0 }}>
        {node.label}
      </div>
      {node.content && (
        <div style={{ fontSize:10, color:c.fg, opacity:0.78, lineHeight:1.4,
          overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical",
          whiteSpace:"pre-wrap" }}>
          {node.content}
        </div>
      )}
    </div>
  );
}

export default function FlowBuilder() {
  const { state, dispatch, toast } = useApp();
  const flows = state.flows ?? [];
  const [activeFlowId, setActiveFlowId] = useState(flows[0]?.id ?? null);
  const [editingNode, setEditingNode] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ type:"message", label:"", content:"" });

  const flow = flows.find(f => f.id === activeFlowId) ?? flows[0] ?? null;

  const openEdit = (node) => {
    setEditingNode(node);
    setEditForm({ label: node.label, content: node.content ?? "", url: node.url ?? "" });
  };

  const saveEdit = () => {
    if (!flow || !editingNode) return;
    dispatch({ type:"UPDATE_FLOW_NODE", flowId:flow.id, nodeId:editingNode.id, updates:editForm });
    toast("Node updated", "✓");
    setEditingNode(null);
  };

  const publishFlow = () => {
    if (!flow) return;
    dispatch({ type:"PUBLISH_FLOW", flowId:flow.id });
    toast("Flow published", "✓");
  };

  const saveAdd = () => {
    if (!flow || !addForm.label.trim()) return;
    dispatch({ type:"ADD_FLOW_NODE", flowId:flow.id, node:addForm });
    toast("Node added", "✓");
    setAddOpen(false);
    setAddForm({ type:"message", label:"", content:"" });
  };

  return (
    <div style={{ padding:32, flex:1, overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Flow Builder</div>
          <div style={{ color:C.muted, fontSize:13 }}>Click a node to edit its message content</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <button type="button" onClick={() => setAddOpen(true)}
            style={{ background:C.card, color:C.text, border:`1px solid ${C.border}`,
              borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            + Add node
          </button>
          <button type="button" onClick={publishFlow}
            style={{ background:"#E8561A", color:"#fff", border:"none",
              borderRadius:8, padding:"8px 22px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            Publish Flow
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:18, marginBottom:20, flexWrap:"wrap" }}>
        {NODE_TYPES.map(type => {
          const c = NODE_COLORS[type];
          return (
            <div key={type} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.muted }}>
              <div style={{ width:12, height:12, borderRadius:3, background:c.bg, border:`1.5px solid ${c.border}`, flexShrink:0 }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          );
        })}
      </div>

      {/* Flow tabs */}
      {flows.length > 1 && (
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {flows.map(f => (
            <button key={f.id} type="button" onClick={() => setActiveFlowId(f.id)}
              style={{ background: f.id === activeFlowId ? C.accent : C.card,
                color: f.id === activeFlowId ? "#000" : C.text,
                border:`1px solid ${C.border}`, borderRadius:8,
                padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {f.name}{f.published ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}

      {!flow ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
          padding:48, textAlign:"center", color:C.muted, fontSize:14 }}>
          No flows yet. Approve an onboarding request to generate the first flow.
        </div>
      ) : (
        <div style={{ background:"#F5F0E8", borderRadius:12, border:`1px solid ${C.border}`,
          overflow:"auto", position:"relative" }}>
          <div style={{ position:"relative", width:CANVAS_W, height:CANVAS_H }}>
            <FlowEdges nodes={flow.nodes} edges={flow.edges} />
            {flow.nodes.map(node => (
              <FlowNode key={node.id} node={node}
                active={editingNode?.id === node.id} onClick={openEdit} />
            ))}
          </div>
        </div>
      )}

      {/* Edit node modal */}
      {editingNode && (
        <Modal title={`Edit: ${editingNode.label}`} onClose={() => setEditingNode(null)} onSave={saveEdit}>
          <FormRow label="Label">
            <input value={editForm.label}
              onChange={e => setEditForm(p => ({ ...p, label:e.target.value }))}
              style={inputStyle} />
          </FormRow>
          {editingNode.type !== "start" && editingNode.type !== "end" && (
            <FormRow label="Content">
              <textarea value={editForm.content}
                onChange={e => setEditForm(p => ({ ...p, content:e.target.value }))}
                style={{ ...inputStyle, minHeight:80, resize:"vertical", fontFamily:font.body }} />
            </FormRow>
          )}
          {editingNode.label === "Book Now" && (
            <FormRow label="Booking URL">
              <input value={editForm.url ?? ""}
                onChange={e => setEditForm(p => ({ ...p, url:e.target.value }))}
                style={inputStyle} placeholder="https://..." />
            </FormRow>
          )}
        </Modal>
      )}

      {/* Add node modal */}
      {addOpen && (
        <Modal title="Add Node" onClose={() => setAddOpen(false)} onSave={saveAdd} saveLabel="Add">
          <FormRow label="Type">
            <select value={addForm.type}
              onChange={e => setAddForm(p => ({ ...p, type:e.target.value }))}
              style={selectStyle}>
              {NODE_TYPES.filter(t => t !== "start").map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Label">
            <input value={addForm.label}
              onChange={e => setAddForm(p => ({ ...p, label:e.target.value }))}
              style={inputStyle} placeholder="Node name" />
          </FormRow>
          <FormRow label="Content">
            <textarea value={addForm.content}
              onChange={e => setAddForm(p => ({ ...p, content:e.target.value }))}
              style={{ ...inputStyle, minHeight:64, resize:"vertical", fontFamily:font.body }}
              placeholder="Message text or menu options…" />
          </FormRow>
        </Modal>
      )}
    </div>
  );
}
