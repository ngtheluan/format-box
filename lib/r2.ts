import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBase = process.env.R2_PUBLIC_URL;

let _client: S3Client | null = null;

export function hasR2(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
}

export function r2Bucket(): string {
  if (!bucket) throw new Error("R2 not configured: set R2_BUCKET");
  return bucket;
}

export function r2Client(): S3Client {
  if (!hasR2()) {
    throw new Error(
      "R2 not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL",
    );
  }
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return _client;
}

export function r2PublicUrl(key: string): string {
  if (!publicBase) throw new Error("R2 not configured: set R2_PUBLIC_URL");
  return `${publicBase.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

export async function r2Exists(key: string): Promise<boolean> {
  try {
    await r2Client().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function r2Upload(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return r2PublicUrl(key);
}
