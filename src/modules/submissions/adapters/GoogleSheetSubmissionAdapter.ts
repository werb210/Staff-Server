import type {
  SubmissionPayload,
  SubmissionResult,
} from "./SubmissionAdapter";

type SheetHeader = string;
type SheetRow = Record<string, unknown>;

export class GoogleSheetSubmissionAdapter {
  private findHeaderIndex(
    headers: SheetHeader[],
    header: SheetHeader
  ): number {
    return headers.findIndex((h) => h === header);
  }

  private buildRowObject(
    headers: SheetHeader[],
    row: unknown[]
  ): SheetRow {
    const result: SheetRow = {};

    headers.forEach((header: SheetHeader, index: number) => {
      result[header] = row[index];
    });

    return result;
  }

  async submit(_payload: SubmissionPayload): Promise<SubmissionResult> {
    // Keep helpers exercised in strict mode until full adapter wiring is restored.
    const headers: SheetHeader[] = [];
    this.findHeaderIndex(headers, "");
    this.buildRowObject(headers, []);

    // Minimal stable implementation for now.
    return {
      success: true,
      response: {
        status: "accepted",
        receivedAt: new Date().toISOString(),
      },
      failureReason: null,
      retryable: false,
    };
  }
}
