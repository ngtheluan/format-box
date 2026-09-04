"use client";
import { useToast } from "@/components/Toast";
import { jsonToGraph, type NodeData } from "@/lib/jsonToGraph";
import { IconCheck, IconDownload, IconFileImport, IconMaximize, IconRefresh, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import FbNode from "./FbNode";

const nodeTypes = { fbNode: FbNode };

const SAMPLE = `{
  "app": "FormatBox",
  "version": "1.0",
  "features": ["base64", "json", "image", "graph"],
  "author": { "name": "Luân", "city": "HCMC" },
  "stats": {
    "tools": 4,
    "clientSide": true,
    "endpoints": null
  },
  "roadmap": [
    { "id": 1, "title": "JWT decoder" },
    { "id": 2, "title": "Color converter" }
  ]
}`;

type Status = { type: "ok" | "err" | "idle"; msg: string };

function GraphInner() {
  const toast = useToast();
  const [text, setText] = useState<string>(SAMPLE);
  const [status, setStatus] = useState<Status>({ type: "idle", msg: "Paste JSON để bắt đầu" });
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [stat, setStat] = useState<{ nodes: number; edges: number } | null>(null);
  const { fitView } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);

  const applyText = useCallback(
    (val: string) => {
      const v = val.trim();
      if (!v) {
        setStatus({ type: "idle", msg: "Paste JSON để bắt đầu" });
        setNodes([]);
        setEdges([]);
        setStat(null);
        return;
      }
      try {
        const parsed = JSON.parse(v);
        const { nodes: ns, edges: es } = jsonToGraph(parsed);
        setNodes(ns as Node<NodeData>[]);
        setEdges(es);
        setStatus({ type: "ok", msg: "JSON hợp lệ" });
        setStat({ nodes: ns.length, edges: es.length });
        setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 40);
      } catch (e) {
        setStatus({ type: "err", msg: (e as Error).message });
      }
    },
    [setNodes, setEdges, fitView],
  );

  useEffect(() => {
    applyText(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (v: string) => {
    setText(v);
    applyText(v);
  };

  const loadSample = () => {
    setText(SAMPLE);
    applyText(SAMPLE);
  };

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const v = String(reader.result);
      setText(v);
      applyText(v);
    };
    reader.readAsText(file);
  };

  const exportSVG = () => {
    const svg = document.querySelector<SVGElement>(".react-flow__viewport-svg, .react-flow svg");
    // React Flow doesn't render one big SVG; snapshot via nodes bounding box using edges paths + custom nodes is complex.
    // Instead, download the JSON graph shape as JSON for portability.
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Đã tải graph.json");
    void svg;
  };

  const badge = useMemo(() => {
    if (status.type === "ok") return { icon: <IconCheck size={14} stroke={2.4} />, cls: "ok" };
    if (status.type === "err") return { icon: <IconX size={14} stroke={2.4} />, cls: "err" };
    return { icon: null, cls: "idle" };
  }, [status.type]);

  return (
    <div className="graph-layout">
      <aside className="graph-side">
        <div className={`status ${badge.cls}`}>
          {badge.icon}
          {status.msg}
        </div>

        <label>Input JSON</label>
        <textarea
          className="graph-input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder='{"hello": "world"}'
          spellCheck={false}
        />

        <div className="actions">
          <button className="btn btn-p" onClick={() => applyText(text)}>
            <IconRefresh size={15} stroke={1.8} /> Vẽ lại
          </button>
          <button className="btn btn-s" onClick={loadSample}>
            <IconFileImport size={15} stroke={1.8} /> Mẫu
          </button>
          <button className="btn btn-s" onClick={() => fileRef.current?.click()}>
            <IconFileImport size={15} stroke={1.8} /> Từ file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,text/plain"
            style={{ display: "none" }}
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <button className="btn btn-s" onClick={() => fitView({ padding: 0.2, duration: 400 })}>
            <IconMaximize size={15} stroke={1.8} /> Fit view
          </button>
          <button className="btn btn-s" onClick={exportSVG}>
            <IconDownload size={15} stroke={1.8} /> Export
          </button>
        </div>

        {stat && (
          <div className="info">
            <span className="info-i">{stat.nodes} nodes</span>
            <span className="info-i">{stat.edges} edges</span>
          </div>
        )}

        <div className="legend">
          <span className="legend-item">
            <i className="dot dot-obj" /> object
          </span>
          <span className="legend-item">
            <i className="dot dot-arr" /> array
          </span>
          <span className="legend-item">
            <i className="dot dot-leaf" /> value
          </span>
        </div>
      </aside>

      <div className="graph-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            style: { stroke: "var(--edge)", strokeWidth: 1.4 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--grid-dot)" />
          {/* <MiniMap
            zoomable
            pannable
            nodeColor={(n) => {
              const k = (n.data as NodeData)?.kind;
              if (k === "array") return "#f59e0b";
              if (k === "leaf") return "#22c55e";
              return "#6366f1";
            }}
            maskColor="color-mix(in srgb, var(--bg) 70%, transparent)"
          /> */}
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function GraphTool() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
