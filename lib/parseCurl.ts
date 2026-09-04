export type ParsedRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

function tokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === "\\" && cmd[i + 1] === quote) {
        cur += quote;
        i++;
      } else if (c === "\\" && quote === '"' && cmd[i + 1] === "\\") {
        cur += "\\";
        i++;
      } else if (c === quote) {
        quote = null;
      } else {
        cur += c;
      }
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "\\" && (cmd[i + 1] === "\n" || cmd[i + 1] === "\r")) {
      i++;
      if (cmd[i + 1] === "\n") i++;
    } else if (/\s/.test(c)) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

const SKIP_FLAGS_NO_VAL = new Set([
  "-L",
  "--location",
  "-k",
  "--insecure",
  "-s",
  "--silent",
  "-v",
  "--verbose",
  "--compressed",
  "-i",
  "--include",
  "-I",
  "--head",
  "-J",
  "--remote-header-name",
  "-O",
  "--remote-name",
  "-g",
  "--globoff",
  "-#",
  "--progress-bar",
]);

const SKIP_FLAGS_WITH_VAL = new Set([
  "-o",
  "--output",
  "-A",
  "--user-agent",
  "-e",
  "--referer",
  "-b",
  "--cookie",
  "-c",
  "--cookie-jar",
  "--max-time",
  "--connect-timeout",
  "--retry",
]);

export function parseCurl(input: string): ParsedRequest {
  let cmd = input.trim();
  if (!cmd) throw new Error("Empty command");
  // Strip leading "curl"
  cmd = cmd.replace(/^\$\s+/, "");
  if (!/^curl\b/i.test(cmd)) throw new Error("Not a curl command");
  cmd = cmd.replace(/^curl\s+/i, "");
  // Normalize line continuations
  cmd = cmd.replace(/\\\r?\n/g, " ");

  const tokens = tokenize(cmd);
  let url = "";
  let method = "";
  const headers: Record<string, string> = {};
  let body: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk === "-X" || tk === "--request") {
      method = (tokens[++i] || "").toUpperCase();
    } else if (tk === "-H" || tk === "--header") {
      const h = tokens[++i];
      if (h) {
        const idx = h.indexOf(":");
        if (idx > 0) {
          const k = h.slice(0, idx).trim();
          const v = h.slice(idx + 1).trim();
          if (k) headers[k] = v;
        }
      }
    } else if (
      tk === "-d" ||
      tk === "--data" ||
      tk === "--data-raw" ||
      tk === "--data-binary" ||
      tk === "--data-ascii"
    ) {
      const v = tokens[++i] ?? "";
      body = body === undefined ? v : `${body}&${v}`;
      if (!method) method = "POST";
    } else if (tk === "--data-urlencode") {
      const v = tokens[++i] ?? "";
      const eq = v.indexOf("=");
      const enc = eq >= 0 ? `${v.slice(0, eq)}=${encodeURIComponent(v.slice(eq + 1))}` : encodeURIComponent(v);
      body = body === undefined ? enc : `${body}&${enc}`;
      if (!method) method = "POST";
    } else if (tk === "-u" || tk === "--user") {
      const cred = tokens[++i];
      if (cred) headers["Authorization"] = "Basic " + btoa(cred);
    } else if (tk === "-F" || tk === "--form") {
      // best-effort: keep note but skip multipart execution
      const v = tokens[++i] ?? "";
      body = (body ?? "") + (body ? "\n" : "") + `# form: ${v}`;
      if (!method) method = "POST";
    } else if (SKIP_FLAGS_NO_VAL.has(tk)) {
      /* ignore */
    } else if (SKIP_FLAGS_WITH_VAL.has(tk)) {
      i++;
    } else if (tk.startsWith("-")) {
      // unknown flag — skip conservatively
      /* ignore */
    } else if (!url) {
      url = tk;
    }
  }

  if (!url) throw new Error("Không tìm thấy URL trong curl command");
  if (!method) method = body !== undefined ? "POST" : "GET";
  return { url, method, headers, body };
}
