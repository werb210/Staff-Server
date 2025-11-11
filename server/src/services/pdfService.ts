interface PdfGenerationInput {
  applicationId: string;
  documentIds: string[];
}

interface PdfGenerationResult {
  jobId: string;
  status: "queued" | "completed";
  generatedAt: string;
  downloadUrl: string;
}

class PdfService {
  public generatePackage(input: PdfGenerationInput): PdfGenerationResult {
    return {
      jobId: `pdf-${input.applicationId}`,
      status: "queued",
      generatedAt: new Date().toISOString(),
      downloadUrl: `https://example.blob.core.windows.net/pdfs/${input.applicationId}.pdf`,
    };
  }
}

export const pdfService = new PdfService();

export type PdfServiceType = PdfService;
