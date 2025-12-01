// server/src/services/bankingService.ts
import axios from 'axios';
import OpenAI from 'openai';
import bankingAnalysisRepo from '../db/repositories/bankingAnalysis.repo.js';
import documentsRepo from '../db/repositories/documents.repo.js';
import * as documentService from './documentService.js';

declare const broadcast: (payload: any) => void;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//
// Banking analysis expects bank statements already uploaded.
// This engine will:
//   • OCR the statement
//   • Extract line items
//   • Detect patterns
//   • Produce underwriting-ready metrics
//
export async function runAnalysis(applicationId: string) {
  // Get all documents for this application
  const docs = await documentsRepo.findMany({ applicationId });

  const bankDocs = docs.filter((d) =>
    d.category && d.category.toLowerCase().includes('bank')
  );

  if (bankDocs.length === 0) {
    throw new Error("No bank statements found for this application.");
  }

  //
  // Step 1 — Extract all PDF text via OCR
  //
  let statements: string[] = [];

  for (const doc of bankDocs) {
    const sas = await documentService.getDocument(doc.id);

    const response = await axios.get(sas.sasUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');

    // Ask GPT-4.1 to extract raw text from PDF
    const extraction = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "Extract ALL text from this bank statement. No commentary. Raw text only."
        },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${doc.mimeType};base64,${base64}`,
            } as any
          ] as any
        }
      ],
      max_tokens: 8000,
      temperature: 0,
    });

    statements.push(extraction.choices[0].message.content || "");
  }

  //
  // Step 2 — Run structured banking analysis
  //
  const analysis = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `
You are a banking analysis engine for underwriting.
Output JSON only.

Analyze the provided raw bank statement text.
Generate:

{
  "monthlyRevenue": {
    "avg": number,
    "trend": "up" | "down" | "flat",
    "details": [...]
  },
  "depositPatterns": {
    "totalDeposits": number,
    "avgDeposit": number,
    "frequency": number,
    "largeDeposits": [...]
  },
  "cashFlow": {
    "avgEndBalance": number,
    "lowBalanceDays": number,
    "negativeBalanceDays": number,
    "nsfEvents": number,
    "volatilityScore": number
  },
  "seasonality": {
    "pattern": "none" | "strong" | "moderate",
    "description": string
  },
  "riskFlags": {
    "highVariance": boolean,
    "frequentNSF": boolean,
    "lowBalances": boolean,
    "unusualDeposits": boolean,
    "cashFlowIssues": boolean
  },
  "summary": "Short underwriting summary"
}
        `
      },
      {
        role: "user",
        content: statements.join("\n\n--- STATEMENT ---\n\n")
      }
    ],
    max_tokens: 5000,
    temperature: 0,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(analysis.choices[0].message.content as string);
  } catch (err) {
    throw new Error("Banking analysis: invalid JSON returned from model.");
  }

  //
  // Step 3 — Save to DB
  //
  const saved = await bankingAnalysisRepo.create({
    applicationId,
    data: parsed,
  });

  //
  // Step 4 — Broadcast update to Staff Portal + Client Portal
  //
  broadcast({
    type: 'banking-analysis',
    applicationId,
    result: parsed,
  });

  return saved;
}

//
// Retrieve analysis
//
export async function getAnalysis(applicationId: string) {
  const [result] = await bankingAnalysisRepo.findMany({ applicationId });

  return result || null;
}
