// server/src/services/lenderService.ts
import { db } from '../db/db.js';
import { lenders } from '../db/schema/lenders.js';
import { applications } from '../db/schema/applications.js';
import { ocrResults } from '../db/schema/ocr.js';
import { bankingAnalysis } from '../db/schema/banking.js';
import { eq } from 'drizzle-orm';
import * as pipelineService from './pipelineService.js';

declare const broadcast: (payload: any) => void;

//
// ======================================================
//  1. MATCH LENDERS TO APPLICATION
// ======================================================
export async function match(applicationId: string) {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) throw new Error("Application not found.");

  // Get OCR
  const ocr = await db.select().from(ocrResults) as any[];
  const ocrFields = ocr
    .filter(o => o.documentId && (o as any).applicationId === undefined) // legacy safe
    .reduce((acc, doc) => Object.assign(acc, doc.fields || {}), {} as Record<string, unknown>);

  // Get banking
  const [bank] = await db.select().from(bankingAnalysis).where(eq(bankingAnalysis.applicationId, applicationId));

  const bankData = bank?.data || {};

  // Get all active lenders
  const lenderList = await db.select().from(lenders).where(eq(lenders.active, true));

  const matches = lenderList.map(l => {
    let score = 0;

    // CATEGORY MATCH
    if (l.productCategory === (app.formData as any)?.step2?.productCategory) {
      score += 40;
    }

    // AMOUNT RANGE
    const requested = Number((app.formData as any)?.step1?.requestedAmount || 0);
    if (!isNaN(requested)) {
      if (requested >= (l.amountRange as any).min && requested <= (l.amountRange as any).max) {
        score += 30;
      }
    }

    // CREDIT REQUIREMENTS (V1 = simple matching)
    const creditKnown = (app.formData as any)?.step4?.creditScore || null;
    if (creditKnown && l.creditRequirements) {
      const min = Number(l.creditRequirements.replace(/\D/g, ''));
      if (!isNaN(min) && Number(creditKnown) >= min) {
        score += 10;
      }
    }

    // OCR DISQUALIFIERS
    if (l.disqualifiers && typeof l.disqualifiers === 'object') {
      for (const key of Object.keys(l.disqualifiers as Record<string, unknown>)) {
        const required = (l.disqualifiers as any)[key];
        const found = (ocrFields || {})[key];

        if (required && found === required) {
          score -= 20;
        }
      }
    }

    // BANKING RISK FLAGS
    if ((bankData as any)?.riskFlags) {
      const flags = (bankData as any).riskFlags;
      if (flags.highVariance) score -= 10;
      if (flags.frequentNSF) score -= 10;
      if (flags.lowBalances) score -= 5;
    }

    // Clean score
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    return {
      lenderId: l.id,
      lenderName: l.lenderName,
      productCategory: l.productCategory,
      likelihood: score,
    };
  });

  return matches.sort((a, b) => b.likelihood - a.likelihood);
}

//
// ======================================================
//  2. SEND TO LENDER (V1 — email-style packet)
// ======================================================
export async function sendToLender(applicationId: string, lenderId: string) {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) throw new Error("Application not found.");

  const [lender] = await db.select().from(lenders).where(eq(lenders.id, lenderId));
  if (!lender) throw new Error("Lender not found.");

  //
  // Build lender packet
  //
  const packet = {
    application: app,
    lender: lender,
    ocrResults: await getOCRForApplication(applicationId),
    bankingAnalysis: await getBankingForApplication(applicationId),
  };

  //
  // In V1, the “send to lender” action stores packet as JSON (optional)
  // + triggers pipeline move → "Off to Lender"
  //
  await pipelineService.updateStage(applicationId, "Off to Lender", `Sent to lender ${lender.lenderName}`);

  // Broadcast update
  broadcast({
    type: 'sent-to-lender',
    applicationId,
    lender: lender.lenderName,
  });

  return {
    success: true,
    message: `Application sent to ${lender.lenderName}`,
    packet,
  };
}

//
// Helper: return OCR results per app
//
async function getOCRForApplication(applicationId: string) {
  const allOCR = await db.select().from(ocrResults) as any[];
  const out = allOCR.filter(o => o.documentId && (o as any).applicationId === undefined);
  return out;
}

//
// Helper: return banking analysis
//
async function getBankingForApplication(applicationId: string) {
  const [bank] = await db.select().from(bankingAnalysis).where(eq(bankingAnalysis.applicationId, applicationId));
  return bank?.data || {};
}
