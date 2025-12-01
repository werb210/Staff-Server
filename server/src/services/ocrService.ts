import OpenAI from "openai";
import { db } from "../db/db.js";
import { documents } from "../db/schema/documents.js";
import { ocrResults } from "../db/schema/ocr.js";
import { eq, inArray } from "drizzle-orm";
import { getBlobUrl } from "../utils/blob.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runOCR(documentId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new Error("Document not found.");

  const blob = await fetch(getBlobUrl(doc.azureBlobKey));
  const buffer = Buffer.from(await blob.arrayBuffer());

  const base64 = buffer.toString("base64");

  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are an OCR extraction engine. Output ONLY valid JSON with extracted fields.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract all possible financial fields." },
          { type: "image_url", image_url: { url: `data:${doc.mimeType};base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(completion.choices[0].message.content || "{}");
  } catch {
    throw new Error("OCR output was not valid JSON.");
  }

  const [inserted] = await db
    .insert(ocrResults)
    .values({
      documentId,
      fields: parsed,
      docType: (parsed as any).documentType || (doc as any).category || null,
    })
    .returning();

  return inserted;
}

export async function getOCR(documentId: string) {
  const [result] = await db.select().from(ocrResults).where(eq(ocrResults.documentId, documentId));
  return result || {};
}

export async function listOCR(applicationId: string) {
  const docs = await db.select().from(documents).where(eq(documents.applicationId, applicationId));
  const docIds = docs.map((d) => d.id);
  if (!docIds.length) return [];

  const results = await db.select().from(ocrResults).where(inArray(ocrResults.documentId, docIds));
  return results;
}
