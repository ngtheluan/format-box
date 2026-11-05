// Compare file list between Supabase blog-audio and Cloudflare R2.
// Reports: missing in R2, extra in R2, size mismatches.
import { createClient } from "@supabase/supabase-js";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const p = path.resolve("/Users/ngtheluan/Resource/format-box/.env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID!;
const R2_KEY = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const BUCKET = "blog-audio";

async function main() {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
  });

  const { data: sbFiles, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error(error.message);
  const sbMap = new Map<string, number>();
  for (const f of sbFiles ?? []) {
    if (!f.name.endsWith(".mp3")) continue;
    sbMap.set(f.name, f.metadata?.size ?? 0);
  }

  const r2Map = new Map<string, number>();
  let token: string | undefined = undefined;
  do {
    const resp: any = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }),
    );
    for (const o of resp.Contents ?? []) {
      if (!o.Key?.endsWith(".mp3")) continue;
      r2Map.set(o.Key, o.Size ?? 0);
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);

  console.log(`Supabase blog-audio: ${sbMap.size} .mp3 files`);
  console.log(`R2 ${R2_BUCKET}:    ${r2Map.size} .mp3 files`);

  const missing: string[] = [];
  const sizeMismatch: string[] = [];
  for (const [name, size] of sbMap) {
    if (!r2Map.has(name)) missing.push(name);
    else if (r2Map.get(name) !== size)
      sizeMismatch.push(`${name}  (sb=${size}, r2=${r2Map.get(name)})`);
  }

  const extra: string[] = [];
  for (const name of r2Map.keys()) if (!sbMap.has(name)) extra.push(name);

  console.log(`\nMissing in R2 (${missing.length}):`);
  missing.slice(0, 20).forEach((n) => console.log("  -", n));
  if (missing.length > 20) console.log(`  … +${missing.length - 20} more`);

  console.log(`\nSize mismatch (${sizeMismatch.length}):`);
  sizeMismatch.slice(0, 20).forEach((n) => console.log("  -", n));

  console.log(`\nIn R2 but not Supabase (${extra.length}) — likely new uploads, safe:`);
  extra.slice(0, 10).forEach((n) => console.log("  +", n));

  console.log(
    `\n→ ${missing.length === 0 && sizeMismatch.length === 0 ? "SAFE to delete Supabase bucket." : "DO NOT delete yet — run migration again or investigate."}`,
  );
}

main().catch((e) => {
  console.error("ERROR:", e?.message || e);
  if (e?.cause) console.error("CAUSE:", e.cause?.message || e.cause);
  console.error("SB_URL:", SB_URL);
  process.exit(1);
});
