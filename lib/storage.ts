// lib/storage.ts — blob storage 추상화 (R2 구현)
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export type PutInput = {
  path: string; // 버킷 내 key (확장자 포함)
  data: Buffer | Uint8Array;
  contentType: string;
};

export type PutResult = {
  key: string;
  url: string;
};

export interface BlobStorage {
  put(input: PutInput): Promise<PutResult>;
  del(key: string): Promise<void>;
  isConfigured(): boolean;
}

function readEnv() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

let cachedClient: S3Client | null = null;
function getClient(): S3Client | null {
  if (cachedClient) return cachedClient;
  const { accountId, accessKeyId, secretAccessKey } = readEnv();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export const storage: BlobStorage = {
  isConfigured() {
    const e = readEnv();
    return !!(
      e.accountId &&
      e.accessKeyId &&
      e.secretAccessKey &&
      e.bucket &&
      e.publicUrl
    );
  },

  async put({ path, data, contentType }) {
    const { bucket, publicUrl } = readEnv();
    const client = getClient();
    if (!client || !bucket || !publicUrl) {
      throw new Error("storage_not_configured");
    }
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: data,
        ContentType: contentType,
      }),
    );
    return {
      key: path,
      url: `${publicUrl.replace(/\/$/, "")}/${path}`,
    };
  },

  async del(key) {
    const { bucket } = readEnv();
    const client = getClient();
    if (!client || !bucket) return; // soft fail (env 빠진 환경에서 DB 삭제는 진행)
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  },
};

// URL → key 추출 (legacy fallback). R2_PUBLIC_URL prefix 매칭 시만 동작.
export function keyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;
  const prefix = publicUrl.replace(/\/$/, "") + "/";
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
