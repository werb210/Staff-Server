import { google } from "googleapis";
import type { SubmissionPayload, SubmissionResult } from "./SubmissionAdapter";

type GoogleSheetConfig = {
  spreadsheetId: string;
  sheetName?: string | null;
  columnMapVersion: string;
};

type AdapterParams = {
  payload?: SubmissionPayload;
  config?: GoogleSheetConfig;
};

function isRetryable(error: unknown): boolean {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code;
  return typeof status === "number" ? status >= 500 || status === 429 : false;
}

function parseRowNumber(range: string | undefined): string | null {
  if (!range) {
    return null;
  }
  const match = range.match(/![A-Z]+(\d+)/);
  return match?.[1] ?? null;
}

export class GoogleSheetSubmissionAdapter {
  private readonly config?: GoogleSheetConfig;

  constructor(params?: AdapterParams) {
    this.config = params?.config;
  }

  async submit(payload: SubmissionPayload): Promise<SubmissionResult> {
    const now = new Date().toISOString();

    if (!this.config) {
      return {
        success: true,
        response: {
          status: "accepted",
          receivedAt: now,
        },
        failureReason: null,
        retryable: false,
      };
    }

    if (!this.config.columnMapVersion?.trim()) {
      return {
        success: false,
        response: {
          status: "error",
          detail: "Google Sheet columnMapVersion is invalid.",
          receivedAt: now,
        },
        failureReason: "configuration_error",
        retryable: false,
      };
    }

    try {
      const auth = google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheetName =
        this.config.sheetName?.trim() || spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1";
      const headerResult = await sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!1:1`,
      });
      const headers = headerResult.data.values?.[0] ?? [];
      const appIdColumnIndex = headers.findIndex((header) => header === "Application ID");
      const columnLetter = String.fromCharCode(65 + Math.max(appIdColumnIndex, 0));

      const existingResult = await sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!${columnLetter}:${columnLetter}`,
      });
      const existingValues = existingResult.data.values ?? [];
      const existingIndex = existingValues.findIndex((row) => row?.[0] === payload.application.id);

      if (existingIndex >= 0) {
        return {
          success: true,
          response: {
            status: "duplicate",
            receivedAt: now,
            externalReference: String(existingIndex + 1),
          },
          failureReason: null,
          retryable: false,
        };
      }

      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[payload.application.id, payload.submittedAt]],
        },
      });

      return {
        success: true,
        response: {
          status: "appended",
          receivedAt: now,
          externalReference: parseRowNumber(appendResult.data.updates?.updatedRange),
        },
        failureReason: null,
        retryable: false,
      };
    } catch (error) {
      return {
        success: false,
        response: {
          status: "error",
          detail: error instanceof Error ? error.message : "Google Sheets submission failed.",
          receivedAt: now,
        },
        failureReason: "google_sheets_error",
        retryable: isRetryable(error),
      };
    }
  }
}
