"use client";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { decodeJwt, formatTimeClaim, isTimeClaim, labelFor } from "@/lib/jwt";
import { IconAlertTriangle, IconCheck, IconClock, IconCopy, IconTrash, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Button, Textarea } from "@/components/ui";

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
  const { t } = useI18n();
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
        <Textarea
          className="jwt-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={t("jwt_placeholder")}
          spellCheck={false}
        />
        <div className="actions">
          <Button size="sm" variant="subtle" onClick={useSample}>
            {t("act_sample")}
          </Button>
          <Button size="sm" variant="subtle" onClick={clear} leftIcon={<IconTrash size={14} stroke={1.9} />}>
            {t("act_clear")}
          </Button>
        </div>

        {state.type === "ok" && (
          <div className="jwt-status-row">
            <span className="jwt-status ok">
              <IconCheck size={14} stroke={2.4} /> {t("jwt_valid_shape")}
            </span>
            {expiry?.expText && (
              <span className={`jwt-status ${expiry.expired ? "err" : "info"}`}>
                <IconClock size={13} stroke={2} />
                {expiry.expired ? `${t("jwt_expired_at")} ` : `${t("jwt_expires_at")} `}
                {expiry.expText}
              </span>
            )}
            {expiry?.notYet && expiry.nbfText && (
              <span className="jwt-status warn">
                <IconAlertTriangle size={13} stroke={2} />
                {t("jwt_not_yet")} (nbf: {expiry.nbfText})
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
            <JwtBlock
              title="HEADER"
              variant="header"
              obj={state.header}
              onCopy={(v) => copy(v, "header")}
              expiredLabel={t("jwt_expired_badge")}
              copyLabel={t("act_copy")}
            />
            <JwtBlock
              title="PAYLOAD"
              variant="payload"
              obj={state.payload}
              onCopy={(v) => copy(v, "payload")}
              expired={expiry?.expired}
              expiredLabel={t("jwt_expired_badge")}
              copyLabel={t("act_copy")}
            />
            <div className="jwt-block">
              <div className="jwt-block-head">
                <span className="jwt-block-title">SIGNATURE</span>
                <Button size="sm" variant="subtle" onClick={() => copy(state.signature, "signature")} leftIcon={<IconCopy size={13} stroke={1.8} />}>
                  {t("act_copy")}
                </Button>
              </div>
              <div className="jwt-signature">{state.signature}</div>
              <p className="jwt-note">{t("jwt_sig_note")}</p>
            </div>
          </>
        ) : (
          <div className="jwt-empty">{t("jwt_empty")}</div>
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
  expiredLabel,
  copyLabel,
}: {
  title: string;
  variant: "header" | "payload";
  obj: Record<string, unknown>;
  onCopy: (v: string) => void;
  expired?: boolean;
  expiredLabel: string;
  copyLabel: string;
}) {
  const pretty = JSON.stringify(obj, null, 2);
  const claims = Object.entries(obj);
  return (
    <div className={`jwt-block jwt-block-${variant}`}>
      <div className="jwt-block-head">
        <span className="jwt-block-title">{title}</span>
        {expired && (
          <span className="jwt-badge jwt-badge-err">
            <IconAlertTriangle size={12} stroke={2} /> {expiredLabel}
          </span>
        )}
        <Button size="sm" variant="subtle" onClick={() => onCopy(pretty)} leftIcon={<IconCopy size={13} stroke={1.8} />}>
          {copyLabel}
        </Button>
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
