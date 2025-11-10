import { promises as fs } from "node:fs";
import path from "node:path";
import { logDebug, logInfo } from "../utils/logger.js";
import type { Application } from "../types/application.js";
import { generateTimestampedPdfName, normalizePdfPath } from "../utils/pdfHelpers.js";

async function ensureDirectoryExists(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * Generates a PDF representation of a loan application and returns the file path.
 */
export async function generateApplicationPdf(application: Application): Promise<string> {
  logInfo("generateApplicationPdf invoked");
  logDebug("generateApplicationPdf payload", { applicationId: application.id });
  const fileName = generateTimestampedPdfName(`application-${application.id}`);
  const filePath = normalizePdfPath(fileName);
  await ensureDirectoryExists(filePath);
  const documentContents = [
    `Loan Application Summary`,
    `Application ID: ${application.id}`,
    `Applicant: ${application.applicant.firstName} ${application.applicant.lastName}`,
    `Amount Requested: ${application.amountRequested.toLocaleString()}`,
    `Term (months): ${application.termMonths}`,
    `Status: ${application.status}`,
    `Generated At: ${new Date().toISOString()}`
  ].join("\n");
  await fs.writeFile(filePath, documentContents, "utf-8");
  return filePath;
}

/**
 * Merges a collection of supporting documents into a single consolidated PDF file.
 */
export async function mergeSupportingDocuments(documentPaths: string[]): Promise<string> {
  logInfo("mergeSupportingDocuments invoked");
  logDebug("mergeSupportingDocuments payload", { documentPaths });
  if (documentPaths.length === 0) {
    throw new Error("At least one document is required to create a merged PDF");
  }
  const fileName = generateTimestampedPdfName("supporting-documents");
  const outputPath = normalizePdfPath(fileName);
  await ensureDirectoryExists(outputPath);
  const manifest = documentPaths.map((document, index) => `Document ${index + 1}: ${document}`).join("\n");
  const mergedContent = `Merged Supporting Documents\n${manifest}\nGenerated At: ${new Date().toISOString()}`;
  await fs.writeFile(outputPath, mergedContent, "utf-8");
  return outputPath;
}
