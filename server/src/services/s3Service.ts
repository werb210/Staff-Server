import { randomUUID, createHash } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const requiredBucket = process.env.S3_BUCKET || "";
const s3Region = process.env.S3_REGION || "us-east-1";

const s3Credentials =
  process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      }
    : process.env.NODE_ENV === "test"
      ? {
          accessKeyId: "test",
          secretAccessKey: "test",
        }
      : undefined;

export const s3Client = new S3Client({
  region: s3Region,
  credentials: s3Credentials,
});

export function computeSHA256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function buildDocumentKey(applicationId: string, extension: string) {
  const safeExt = extension.replace(/^\./, "");
  return `applications/${applicationId}/${randomUUID()}.${safeExt}`;
}

export async function uploadDocumentToS3(
  applicationId: string,
  buffer: Buffer,
  mimeType: string,
  extension: string,
) {
  if (!requiredBucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const s3Key = buildDocumentKey(applicationId, extension);
  const checksum = computeSHA256(buffer);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: requiredBucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
      ServerSideEncryption: "AES256",
      ChecksumSHA256: Buffer.from(checksum, "hex").toString("base64"),
    }),
  );

  return { s3Key, checksum };
}

export async function generatePresignedUrl(s3Key: string, expirySeconds = 900) {
  if (!requiredBucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const command = new GetObjectCommand({ Bucket: requiredBucket, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
}

export async function deleteObject(s3Key: string) {
  if (!requiredBucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  await s3Client.send(new DeleteObjectCommand({ Bucket: requiredBucket, Key: s3Key }));
  return { s3Key };
}

export async function verifyDocumentPresence(s3Key: string) {
  if (!requiredBucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: requiredBucket, Key: s3Key }));
    return { exists: true };
  } catch (error) {
    return { exists: false, error };
  }
}
