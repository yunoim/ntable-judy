// lib/storage.ts — blob storage 추상화 (R2 구현)
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

export type PutInput = {
  path: string; // 버킷 내 key (확장자 포함)
  data: Buffer | Uint8Array;
  contentType: string;
};

export type PutResult = {
  key: string;
  url: string;
};

export type PresignedPutInput = {
  path: string;
  contentType: string;
  expiresSec?: number;
};

export type PresignedPutResult = {
  uploadUrl: string; // 브라우저가 PUT 할 URL
  key: string;
  publicUrl: string; // 업로드 끝난 객체의 공개 URL
  expiresIn: number;
};

export type StreamInput = {
  path: string;
  // Node Readable / Web ReadableStream / AsyncIterable 모두 받음.
  body: any;
  contentType: string;
};

export interface BlobStorage {
  put(input: PutInput): Promise<PutResult>;
  putStream(input: StreamInput): Promise<PutResult>;
  del(key: string): Promise<void>;
  isConfigured(): boolean;
  getPresignedPutUrl(input: PresignedPutInput): Promise<PresignedPutResult>;
  headExists(key: string): Promise<boolean>;
}

function readEnv() {
  // Railway 등에서 값 끝에 줄바꿈/공백이 섞여 들어오면 SignatureDoesNotMatch
  // 같은 미묘한 에러가 나므로 trim 한다.
  const trim = (v: string | undefined) => v?.trim() || undefined;
  return {
    accountId: trim(process.env.R2_ACCOUNT_ID),
    accessKeyId: trim(process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: trim(process.env.R2_SECRET_ACCESS_KEY),
    bucket: trim(process.env.R2_BUCKET_NAME),
    publicUrl: trim(process.env.R2_PUBLIC_URL),
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

  // multipart streaming 업로드 — 큰 영상도 메모리에 다 안 올림.
  async putStream({ path, body, contentType }) {
    const { bucket, publicUrl } = readEnv();
    const client = getClient();
    if (!client || !bucket || !publicUrl) {
      throw new Error("storage_not_configured");
    }
    const upload = new Upload({
      client: client as unknown as ConstructorParameters<typeof Upload>[0]["client"],
      params: {
        Bucket: bucket,
        Key: path,
        Body: body,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5MB per part
      leavePartsOnError: false,
    });
    await upload.done();
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

  async getPresignedPutUrl({ path, contentType, expiresSec = 300 }) {
    const { bucket, publicUrl } = readEnv();
    const client = getClient();
    if (!client || !bucket || !publicUrl) {
      throw new Error("storage_not_configured");
    }
    // @aws-sdk/client-s3 와 s3-request-presigner 가 @smithy/types 다른 버전을
    // 가져와 generic 이 안 맞음 — 런타임은 정상이라 any 캐스트.
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(
      client as unknown as Parameters<typeof getSignedUrl>[0],
      cmd as unknown as Parameters<typeof getSignedUrl>[1],
      { expiresIn: expiresSec },
    );
    return {
      uploadUrl,
      key: path,
      publicUrl: `${publicUrl.replace(/\/$/, "")}/${path}`,
      expiresIn: expiresSec,
    };
  },

  async headExists(key) {
    const { bucket } = readEnv();
    const client = getClient();
    if (!client || !bucket) return false;
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
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
