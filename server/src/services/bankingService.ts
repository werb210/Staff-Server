import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { documents } from "../db/schema/documents.js";
import { bankingAnalysis } from "../db/schema/banking.js";
import { getBlobUrl } from "../utils/blob.js";

declare const broadcast: (payload: any) => void;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runAnalysis(applicationId: string) {
  const docs = await db.select().from(documents).where(eq(documents.applicationId, applicationId));
  const bankDocs = docs.filter((d) => (d.category || "").toLowerCase().includes("bank"));

  if (!bankDocs.length) {
    throw new Error("No bank statements found for this application.");
  }

  const statements: string[] = [];

  for (const doc of bankDocs) {
    const url = getBlobUrl(doc.azureBlobKey);
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");

    const extraction = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "Extract ALL text from this bank statement. No commentary. Raw text only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Return only the raw text content of this bank statement." },
            { type: "image_url", image_url: { url: `data:${doc.mimeType};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 8000,
      temperature: 0,
    });

    statements.push(extraction.choices[0].message.content || "");
  }

  const analysis = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `You are a banking analysis engine for underwriting. Output JSON only with revenue, deposit patterns, cashFlow, seasonality, riskFlags, and summary fields.`,
      },
      { role: "user", content: statements.join("\n\n--- STATEMENT ---\n\n") },
    ],
    max_tokens: 5000,
    temperature: 0,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(analysis.choices[0].message.content as string);
  } catch {
    throw new Error("Banking analysis: invalid JSON returned from model.");
  }

  const [saved] = await db
    .insert(bankingAnalysis)
    .values({ applicationId, data: parsed })
    .returning();

  broadcast?.({
    type: "banking-analysis",
    applicationId,
    result: parsed,
  });

  return saved;
}

export async function getAnalysis(applicationId: string) {
  const [result] = await db.select().from(bankingAnalysis).where(eq(bankingAnalysis.applicationId, applicationId));
  return result || null;
}
