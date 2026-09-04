import { Position, type Edge, type Node } from "reactflow";
import dagre from "dagre";

export type NodeKind = "object" | "array" | "leaf";

export type NodeData = {
  kind: NodeKind;
  label: string;
  entries?: { key: string; value: string; type: string }[];
  itemsCount?: number;
};

let uid = 0;
const nextId = () => `n${++uid}`;

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function fmtLeaf(v: unknown): string {
  const t = typeOf(v);
  if (t === "string") return `"${(v as string).length > 60 ? (v as string).slice(0, 57) + "…" : v}"`;
  if (t === "null") return "null";
  return String(v);
}

function isPrimitive(v: unknown) {
  const t = typeOf(v);
  return t !== "object" && t !== "array";
}

function build(
  value: unknown,
  parentId: string | null,
  parentKey: string | null,
  nodes: Node<NodeData>[],
  edges: Edge[]
): string {
  const t = typeOf(value);

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const entries = keys
      .filter((k) => isPrimitive(obj[k]))
      .map((k) => ({ key: k, value: fmtLeaf(obj[k]), type: typeOf(obj[k]) }));
    const id = nextId();
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: {
        kind: "object",
        label: parentKey ?? "root",
        entries,
      },
      type: "fbNode",
    });
    if (parentId) edges.push({ id: `${parentId}-${id}`, source: parentId, target: id });
    for (const k of keys) {
      if (isPrimitive(obj[k])) continue;
      build(obj[k], id, k, nodes, edges);
    }
    return id;
  }

  if (t === "array") {
    const arr = value as unknown[];
    const primOnly = arr.every(isPrimitive);
    const id = nextId();
    if (primOnly) {
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        data: {
          kind: "array",
          label: parentKey ?? "root",
          entries: arr.map((v, i) => ({
            key: String(i),
            value: fmtLeaf(v),
            type: typeOf(v),
          })),
          itemsCount: arr.length,
        },
        type: "fbNode",
      });
      if (parentId) edges.push({ id: `${parentId}-${id}`, source: parentId, target: id });
      return id;
    }
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: {
        kind: "array",
        label: parentKey ?? "root",
        entries: [],
        itemsCount: arr.length,
      },
      type: "fbNode",
    });
    if (parentId) edges.push({ id: `${parentId}-${id}`, source: parentId, target: id });
    arr.forEach((v, i) => build(v, id, `[${i}]`, nodes, edges));
    return id;
  }

  // primitive top-level
  const id = nextId();
  nodes.push({
    id,
    position: { x: 0, y: 0 },
    data: {
      kind: "leaf",
      label: parentKey ?? "root",
      entries: [{ key: "value", value: fmtLeaf(value), type: t }],
    },
    type: "fbNode",
  });
  if (parentId) edges.push({ id: `${parentId}-${id}`, source: parentId, target: id });
  return id;
}

export function jsonToGraph(value: unknown): { nodes: Node<NodeData>[]; edges: Edge[] } {
  uid = 0;
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  build(value, null, null, nodes, edges);
  return layout(nodes, edges);
}

function estimateSize(data: NodeData): { width: number; height: number } {
  const rows = data.entries?.length ?? 0;
  const width = 260;
  const headerH = 40;
  const rowH = 26;
  const emptyH = data.entries && data.entries.length === 0 ? 24 : 0;
  return { width, height: headerH + rows * rowH + emptyH + 12 };
}

function layout(nodes: Node<NodeData>[], edges: Edge[]): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 64, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    const s = estimateSize(n.data);
    sizes.set(n.id, s);
    g.setNode(n.id, s);
  }
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const laidOut: Node<NodeData>[] = nodes.map((n) => {
    const p = g.node(n.id);
    const s = sizes.get(n.id)!;
    return {
      ...n,
      position: { x: p.x - s.width / 2, y: p.y - s.height / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { nodes: laidOut, edges };
}
