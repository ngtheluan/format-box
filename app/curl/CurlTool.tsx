"use client";
import { useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconSend2,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { parseCurl, type ParsedRequest } from "@/lib/parseCurl";
import { highlightJson, isJsonContentType } from "@/lib/syntax";
import { Button, Textarea } from "@/components/ui";

type Response = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  size: number;
  contentType: string;
};

const SAMPLE = `curl -X GET 'https://jsonplaceholder.typicode.com/todos/1' -H 'Accept: application/json'`;

function fmtSize(b: number) {
  return b > 1024 ? (b / 1024).toFixed(1) + " KB" : b + " B";
}

function statusClass(s: number) {
  if (s >= 500) return "err";
  if (s >= 400) return "warn";
  if (s >= 300) return "info";
  if (s >= 200) return "ok";
  return "idle";
}

function prettyBody(body: string, ct: string): string {
  if (/application\/json|\+json/i.test(ct)) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

function ReqBody({ body, headers }: { body: string; headers: Record<string, string> }) {
  const ct =
    headers["Content-Type"] ||
    headers["content-type"] ||
    (body.trim().startsWith("{") || body.trim().startsWith("[") ? "application/json" : "");
  const pretty = prettyBody(body, ct);
  const html = isJsonContentType(ct) ? highlightJson(pretty) : null;
  if (html) {
    return (
      <pre
        className="curl-body-preview curl-json"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <pre className="curl-body-preview">{pretty}</pre>;
}

export default function CurlTool() {
  const toast = useToast();
  const { t } = useI18n();
  const [text, setText] = useState<string>(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [tab, setTab] = useState<"body" | "headers" | "raw">("body");

  const parsed: ParsedRequest | null = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParseErr(null);
      return null;
    }
    try {
      const p = parseCurl(trimmed);
      setParseErr(null);
      return p;
    } catch (e) {
      setParseErr((e as Error).message);
      return null;
    }
  }, [text]);

  const send = async () => {
    if (!parsed) return;
    setBusy(true);
    setResponse(null);
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const init: RequestInit = {
        method: parsed.method,
        headers: parsed.headers,
        signal: controller.signal,
      };
      if (parsed.body !== undefined && !["GET", "HEAD"].includes(parsed.method)) {
        init.body = parsed.body;
      }
      const res = await fetch(parsed.url, init);
      clearTimeout(timeout);
      const bodyText = await res.text();
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (respHeaders[k] = v));
      const ct = res.headers.get("content-type") || "";
      const dt = performance.now() - start;
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: bodyText,
        timeMs: dt,
        size: new Blob([bodyText]).size,
        contentType: ct,
      });
      setTab("body");
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setResponse({
        status: 0,
        statusText: "Network error",
        headers: {},
        body: msg,
        timeMs: performance.now() - start,
        size: 0,
        contentType: "",
      });
      setTab("body");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setText("");
    setResponse(null);
  };
  const useSample = () => setText(SAMPLE);

  const copy = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(`${t("toast_copied")} · ${label}`));
  };

  const prettyResponseBody = useMemo(
    () => (response ? prettyBody(response.body, response.contentType) : ""),
    [response]
  );

  const isJson = response ? isJsonContentType(response.contentType) : false;
  const highlightedBody = useMemo(
    () => (isJson && prettyResponseBody ? highlightJson(prettyResponseBody) : null),
    [isJson, prettyResponseBody]
  );

  return (
    <div className="curl-layout">
      <div className="curl-input-col">
        <div className="curl-input-head">
          <label>{t("cu_input_label")}</label>
          <div className="curl-input-actions">
            <Button size="sm" variant="subtle" onClick={useSample}>{t("act_sample")}</Button>
            <Button size="sm" variant="subtle" onClick={clear} leftIcon={<IconTrash size={13} stroke={1.9} />}>
              {t("act_clear")}
            </Button>
          </div>
        </div>
        <Textarea
          className="curl-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("cu_placeholder")}
          spellCheck={false}
          monospace
        />

        {parseErr && (
          <div className="curl-parse-err">
            <IconX size={14} stroke={2.4} /> {t("cu_parse_err")}: {parseErr}
          </div>
        )}

        {parsed && (
          <div className="curl-request">
            <div className="curl-request-head">
              <span className="curl-method">{parsed.method}</span>
              <span className="curl-url">{parsed.url}</span>
            </div>
            {Object.keys(parsed.headers).length > 0 && (
              <div className="curl-kv">
                <div className="curl-kv-title">Headers</div>
                {Object.entries(parsed.headers).map(([k, v]) => (
                  <div className="curl-kv-row" key={k}>
                    <b>{k}</b>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {parsed.body !== undefined && (
              <div className="curl-kv">
                <div className="curl-kv-title">Body</div>
                <ReqBody body={parsed.body} headers={parsed.headers} />
              </div>
            )}
          </div>
        )}

        <div className="curl-send-row">
          <Button
            className="curl-send"
            size="lg"
            onClick={send}
            disabled={busy || !parsed}
            loading={busy}
            leftIcon={!busy ? <IconSend2 size={16} stroke={1.9} /> : undefined}
          >
            {busy ? t("cu_sending") : t("cu_send")}
          </Button>
        </div>
        <p className="curl-warn">
          <IconAlertTriangle size={12} stroke={1.9} /> {t("cu_cors_warn")}
        </p>
      </div>

      <div className="curl-output-col">
        {!response ? (
          <div className="curl-empty">{t("cu_empty")}</div>
        ) : (
          <>
            <div className="curl-resp-meta">
              <span className={`curl-status curl-status-${statusClass(response.status)}`}>
                {response.status ? (
                  response.status >= 200 && response.status < 400 ? (
                    <IconCheck size={13} stroke={2.4} />
                  ) : (
                    <IconX size={13} stroke={2.4} />
                  )
                ) : (
                  <IconAlertTriangle size={13} stroke={2} />
                )}
                {response.status || "—"} {response.statusText}
              </span>
              <span className="curl-meta-item">
                {t("cu_time")}: <b>{response.timeMs.toFixed(0)} ms</b>
              </span>
              <span className="curl-meta-item">
                {t("cu_size")}: <b>{fmtSize(response.size)}</b>
              </span>
              {response.contentType && (
                <span className="curl-meta-item mono">{response.contentType}</span>
              )}
              <Button
                size="sm"
                variant="subtle"
                onClick={() => copy(response.body, "Response")}
                style={{ marginLeft: "auto" }}
                leftIcon={<IconCopy size={13} stroke={1.9} />}
              >
                {t("act_copy")}
              </Button>
            </div>

            <div className="curl-tabs">
              <button
                className={`curl-tab${tab === "body" ? " active" : ""}`}
                onClick={() => setTab("body")}
              >
                {t("cu_tab_body")}
              </button>
              <button
                className={`curl-tab${tab === "headers" ? " active" : ""}`}
                onClick={() => setTab("headers")}
              >
                {t("cu_tab_headers")}
                <span className="curl-tab-badge">{Object.keys(response.headers).length}</span>
              </button>
              <button
                className={`curl-tab${tab === "raw" ? " active" : ""}`}
                onClick={() => setTab("raw")}
              >
                {t("cu_tab_raw")}
              </button>
            </div>

            <div className="curl-resp-body">
              {tab === "body" && (
                highlightedBody ? (
                  <pre
                    className="curl-pre curl-json"
                    dangerouslySetInnerHTML={{ __html: highlightedBody }}
                  />
                ) : (
                  <pre className="curl-pre">
                    {prettyResponseBody || <em>{t("cu_no_body")}</em>}
                  </pre>
                )
              )}
              {tab === "headers" &&
                (Object.keys(response.headers).length === 0 ? (
                  <div className="curl-empty-small">—</div>
                ) : (
                  <div className="curl-kv-block">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div className="curl-kv-row" key={k}>
                        <b>{k}</b>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              {tab === "raw" && (
                <pre className="curl-pre">{response.body || <em>{t("cu_no_body")}</em>}</pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
