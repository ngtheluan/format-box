// Migrate all MP3 files in the Supabase `blog-audio` bucket to Cloudflare R2.
// Run with: pnpm tsx scripts/migrate-audio-to-r2.ts
//
// Env required (in .env.local or shell):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL

import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
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
  for (const [k, v] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: SB_URL,
    SUPABASE_SERVICE_ROLE_KEY: SB_KEY,
    R2_ACCOUNT_ID: R2_ACCOUNT,
    R2_ACCESS_KEY_ID: R2_KEY,
    R2_SECRET_ACCESS_KEY: R2_SECRET,
    R2_BUCKET,
  })) {
    if (!v) {
      console.error(`Missing env: ${k}`);
      process.exit(1);
    }
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
  });

  const { data: files, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) {
    console.error("Supabase list failed:", error.message);
    process.exit(1);
  }
  if (!files || files.length === 0) {
    console.log("No files in Supabase bucket. Nothing to migrate.");
    return;
  }

  console.log(`Found ${files.length} files. Starting migration…`);
  let ok = 0;
  let fail = 0;
  for (const f of files) {
    if (!f.name.endsWith(".mp3")) continue;
    try {
      const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(f.name);
      if (dlErr || !blob) throw new Error(dlErr?.message || "no body");
      const buf = Buffer.from(await blob.arrayBuffer());
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: f.name,
          Body: buf,
          ContentType: "audio/mpeg",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      ok++;
      console.log(`  OK  ${f.name} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e: any) {
      fail++;
      console.warn(`  FAIL ${f.name}: ${e?.message || e}`);
    }
  }
  console.log(`\nDone. Uploaded ${ok}, failed ${fail}.`);
  console.log(
    `\nVerify by visiting ${process.env.R2_PUBLIC_URL}/<filename.mp3> in a browser.\n` +
      `Once happy, you can empty the Supabase 'blog-audio' bucket to cut egress to zero.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
