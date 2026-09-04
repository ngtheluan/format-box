"use client";
import { useToast } from "@/components/Toast";
import { decodeJwt, formatTimeClaim, isTimeClaim, labelFor } from "@/lib/jwt";
import { IconAlertTriangle, IconCheck, IconClock, IconCopy, IconTrash, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikxow6JuIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjIsImlzcyI6IkZvcm1hdEJveCJ9." +
  "abc123signature";

type State =
  | { type: "idle" }
  | {
      type: "ok";
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
      signature: string;
    }
  | { type: "err"; msg: string };

export default function JwtTool() {
  const toast = useToast();
  const [token, setToken] = useState("");

  const state: State = useMemo(() => {
    const t = token.trim();
    if (!t) return { type: "idle" };
    try {
      const d = decodeJwt(t);
      return { type: "ok", header: d.header, payload: d.payload, signature: d.signature };
    } catch (e) {
      return { type: "err", msg: (e as Error).message };
    }
  }, [token]);

  const expiry = useMemo(() => {
    if (state.type !== "ok") return null;
    const exp = state.payload.exp;
    const nbf = state.payload.nbf;
    const now = Math.floor(Date.now() / 1000);
    let expired = false;
    let notYet = false;
    let expText: string | null = null;
    let nbfText: string | null = null;
    if (typeof exp === "number") {
      expired = now > exp;
      expText = formatTimeClaim(exp);
    }
    if (typeof nbf === "number") {
      notYet = now < nbf;
      nbfText = formatTimeClaim(nbf);
    }
    return { expired, notYet, expText, nbfText };
  }, [state]);

  const copy = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(`Đã copy ${label}`));
  };

  const useSample = () => setToken(SAMPLE);
  const clear = () => setToken("");

  return (
    <div className="jwt-layout">
      <div className="jwt-input-col">
        <textarea
          className="jwt-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste JWT (header.payload.signature)"
          spellCheck={false}
        />
        <div className="actions">
          <button className="btn btn-s" onClick={useSample}>
            Mẫu
          </button>
          <button className="btn btn-s" onClick={clear}>
            <IconTrash size={14} stroke={1.9} /> Xoá
          </button>
        </div>

        {state.type === "ok" && (
          <div className="jwt-status-row">
            <span className="jwt-status ok">
              <IconCheck size={14} stroke={2.4} /> Cấu trúc hợp lệ
            </span>
            {expiry?.expText && (
              <span className={`jwt-status ${expiry.expired ? "err" : "info"}`}>
                <IconClock size={13} stroke={2} />
                {expiry.expired ? "Hết hạn: " : "Hết hạn lúc: "}
                {expiry.expText}
              </span>
            )}
            {expiry?.notYet && expiry.nbfText && (
              <span className="jwt-status warn">
                <IconAlertTriangle size={13} stroke={2} />
                Chưa có hiệu lực (nbf: {expiry.nbfText})
              </span>
            )}
          </div>
        )}
        {state.type === "err" && (
          <div className="jwt-status err jwt-status-block">
            <IconX size={14} stroke={2.4} /> {state.msg}
          </div>
        )}
      </div>

      <div className="jwt-output-col">
        {state.type === "ok" ? (
          <>
            <JwtBlock title="HEADER" variant="header" obj={state.header} onCopy={(v) => copy(v, "header")} />
            <JwtBlock
              title="PAYLOAD"
              variant="payload"
              obj={state.payload}
              onCopy={(v) => copy(v, "payload")}
              expired={expiry?.expired}
            />
            <div className="jwt-block">
              <div className="jwt-block-head">
                <span className="jwt-block-title">SIGNATURE</span>
                <button className="btn btn-s btn-tiny" onClick={() => copy(state.signature, "signature")}>
                  <IconCopy size={13} stroke={1.8} /> Copy
                </button>
              </div>
              <div className="jwt-signature">{state.signature}</div>
              <p className="jwt-note">Signature không được verify (cần key). Đây là base64url raw.</p>
            </div>
          </>
        ) : (
          <div className="jwt-empty">Paste JWT vào ô bên trái để giải mã.</div>
        )}
      </div>
    </div>
  );
}

function JwtBlock({
  title,
  variant,
  obj,
  onCopy,
  expired,
}: {
  title: string;
  variant: "header" | "payload";
  obj: Record<string, unknown>;
  onCopy: (v: string) => void;
  expired?: boolean;
}) {
  const pretty = JSON.stringify(obj, null, 2);
  const claims = Object.entries(obj);
  return (
    <div className={`jwt-block jwt-block-${variant}`}>
      <div className="jwt-block-head">
        <span className="jwt-block-title">{title}</span>
        {expired && (
          <span className="jwt-badge jwt-badge-err">
            <IconAlertTriangle size={12} stroke={2} /> HẾT HẠN
          </span>
        )}
        <button className="btn btn-s btn-tiny" onClick={() => onCopy(pretty)}>
          <IconCopy size={13} stroke={1.8} /> Copy
        </button>
      </div>

      <pre className="jwt-json">{pretty}</pre>

      {claims.length > 0 && (
        <div className="jwt-claims">
          {claims.map(([k, v]) => (
            <div className="jwt-claim" key={k}>
              <div className="jwt-claim-k">
                <b>{k}</b>
                <span>{labelFor(k)}</span>
              </div>
              <div className="jwt-claim-v">
                {isTimeClaim(k) && typeof v === "number" ? (
                  <>
                    <span className="jwt-claim-time">{formatTimeClaim(v)}</span>
                    <span className="jwt-claim-raw">({v})</span>
                  </>
                ) : (
                  <span>{formatValue(v)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
