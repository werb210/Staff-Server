// server/src/services/signingService.ts
import applicationsRepo from '../db/repositories/applications.repo.js';
import signaturesRepo from '../db/repositories/signatures.repo.js';

import * as blobService from './blobService.js';
import * as signNow from './signNowClient.js';
import * as pipelineService from './pipelineService.js';

//
// ======================================================
//  INIT SIGNING
// ======================================================
//
export async function initSigning(applicationId: string) {
  // Fetch application
  const app = await applicationsRepo.findById(applicationId);
  if (!app) throw new Error("Application not found.");

  const applicantEmail = app.applicantEmail;

  // Convert application formData to PDF using GPT or a prebuilt template
  // For V1: simple JSON → PDF via GPT-4.1
  const pdfBuffer = await generateApplicationPdf(app);

  // Upload PDF to SignNow
  const access = await signNow.getAccessToken();
  const documentId = await signNow.createDocumentFromUpload(access, pdfBuffer);

  // Create embedded signing invite
  const invite = await signNow.createEmbeddedInvite(access, documentId, applicantEmail);

  // Persist signature session for later retrieval
  const [existing] = await signaturesRepo.findMany({ applicationId });

  if (existing) {
    await signaturesRepo.update(existing.id, {
      signNowDocumentId: documentId,
      signedBlobKey: existing.signedBlobKey || 'PENDING',
    });
  } else {
    await signaturesRepo.create({
      applicationId,
      signNowDocumentId: documentId,
      signedBlobKey: 'PENDING',
    });
  }

  return {
    signUrl: invite.data[0].url, // URL client opens
    documentId,
  };
}

//
// ======================================================
//  COMPLETE SIGNING (webhook or polling)
// ======================================================
//
export async function completeSigning(applicationId: string) {
  // Load signature record (might not exist yet)
  const [maybeSig] = await signaturesRepo.findMany({ applicationId });

  if (!maybeSig) {
    throw new Error("No signature session found for this application.");
  }

  const access = await signNow.getAccessToken();

  // Download signed PDF
  const pdfBuffer = await signNow.downloadSignedDocument(access, maybeSig.signNowDocumentId);

  const upload = await blobService.uploadFile(
    applicationId,
    maybeSig.id, // reuse the signature record id
    "signed_application.pdf",
    pdfBuffer,
    "application/pdf"
  );

  // Update signature record
  const updated = await signaturesRepo.update(maybeSig.id, {
    signedBlobKey: upload.blobKey,
  });

  // Pipeline: mark as signed → moves to "Off to Lender"
  await pipelineService.markSigned(applicationId);

  return updated;
}

//
// ======================================================
//  GET SIGN STATUS
// ======================================================
//
export async function getStatus(applicationId: string) {
  const [sig] = await signaturesRepo.findMany({ applicationId });

  return sig || null;
}

//
// ======================================================
//  INTERNAL: Generate Application PDF
//  (V1 uses GPT-4.1 for simple form → PDF)
// ======================================================
//
async function generateApplicationPdf(app: any): Promise<Buffer> {
  // YOU MAY REPLACE THIS LATER WITH A REAL PDF TEMPLATE
  const content = JSON.stringify(app.formData, null, 2);

  // Use GPT-4.1 document generation or fallback HTML→PDF renderer
  // For now, produce a small PDF placeholder using a simple API
  //
  // (In V1 the exact PDF is not critical — only that SignNow accepts it.)
  //

  // Minimal PDF buffer creation
  const pdfBuf = Buffer.from(`
    %PDF-1.4
    1 0 obj
    << /Type /Catalog /Pages 2 0 R >>
    endobj
    2 0 obj
    << /Type /Pages /Kids [3 0 R] /Count 1 >>
    endobj
    3 0 obj
    << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
    endobj
    4 0 obj
    << /Length 44 >>
    stream
    BT /F1 12 Tf 72 720 Td (${content.substring(0, 50)}...) Tj ET
    endstream
    endobj
    xref
    0 5
    0000000000 65535 f 
    0000000010 00000 n 
    0000000053 00000 n 
    0000000106 00000 n 
    0000000201 00000 n 
    trailer
    << /Root 1 0 R /Size 5 >>
    startxref
    310
    %%EOF
  `);

  return pdfBuf;
}
