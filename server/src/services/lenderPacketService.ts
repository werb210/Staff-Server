import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { documents } from "../db/schema/documents.js";
import { getBlobUrl } from "../utils/blob.js";
import { logDocumentEvent } from "./auditService.js";

export async function generateLenderPacket(applicationId: string) {
  const docs = await db.select().from(documents).where(eq(documents.applicationId, applicationId));

  const attachments = await Promise.all(
    docs.map(async (doc) => {
      const url = getBlobUrl(doc.azureBlobKey);
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());

      return {
        documentId: doc.id,
        originalName: (doc as any).originalName,
        mimeType: doc.mimeType,
        category: doc.category,
        url,
        buffer,
      };
    })
  );

  await logDocumentEvent(applicationId, null, {
    action: "lender-packet",
    attachmentCount: attachments.length,
  });

  return {
    applicationId,
    attachments,
  };
}
