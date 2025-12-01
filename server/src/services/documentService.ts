import { db } from "../db/db.js";
import { documents } from "../db/schema/documents.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { getBlobUrl, getContainer } from "../utils/blob.js";

export async function saveUploadedDocument({
  applicationId,
  originalName,
  buffer,
  mimeType,
  category,
}: {
  applicationId: string;
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  category?: string | null;
}) {
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const container = getContainer();
  const key = uuid();

  await container.uploadBlockBlob(key, buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  const inserted = await db.insert(documents).values({
    applicationId,
    originalName,
    category,
    azureBlobKey: key,
    mimeType,
    sizeBytes: buffer.length,
    checksum,
    status: "pending",
    rejectionReason: null
  }).returning();

  return { ...inserted[0], url: getBlobUrl(key) };
}

export async function getDocumentUrl(id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return null;
  return getBlobUrl(doc.azureBlobKey);
}
