import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeData } from "@/lib/jsonToGraph";

const kindLabel: Record<NodeData["kind"], string> = {
  object: "OBJECT",
  array: "ARRAY",
  leaf: "VALUE",
};

export default function FbNode({ data }: NodeProps<NodeData>) {
  const { kind, label, entries, itemsCount } = data;
  return (
    <div className={`fb-node fb-node-${kind}`}>
      <Handle type="target" position={Position.Left} className="fb-handle" />
      <div className="fb-node-head">
        <span className="fb-node-name">{label}</span>
        <span className="fb-node-badge">
          {kindLabel[kind]}
          {kind === "array" && typeof itemsCount === "number" ? ` · ${itemsCount}` : ""}
          {kind === "object" ? ` · ${entries?.length ?? 0}` : ""}
        </span>
      </div>
      {entries && entries.length > 0 && (
        <div className="fb-node-body">
          {entries.map((e) => (
            <div className="fb-row" key={e.key}>
              <span className="fb-k">{e.key}</span>
              <span className={`fb-v fb-v-${e.type}`} title={e.value}>
                {e.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {entries && entries.length === 0 && kind !== "leaf" && (
        <div className="fb-node-body fb-node-empty">
          {kind === "array" ? "(nested items)" : "(children)"}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="fb-handle" />
    </div>
  );
}
