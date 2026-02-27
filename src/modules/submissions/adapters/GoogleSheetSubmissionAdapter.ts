import { google } from "googleapis";

type AdapterConfig = {
  spreadsheetId: string;
  sheetName?: string;
  columnMapVersion?: string;
};

type AdapterParams = {
  payload: any;
  config: AdapterConfig;
};

export interface GoogleSheetSubmitResult {
  success: boolean;
  retryable: boolean;
  response: {
    status?: "appended" | "duplicate" | "error";
    externalReference?: string;
    detail?: string;
  };
}

export class GoogleSheetSubmissionAdapter {
  private readonly config: AdapterConfig;

  constructor(params?: AdapterParams) {
    this.config = params?.config ?? { spreadsheetId: "", sheetName: "Sheet1", columnMapVersion: "" };
  }

  async submit(payload: any): Promise<GoogleSheetSubmitResult> {
    if (!this.config.columnMapVersion || this.config.columnMapVersion.trim().length === 0) {
      return {
        success: false,
        retryable: false,
        response: {
          detail: "Google Sheet columnMapVersion is invalid.",
        },
      };
    }

    try {
      const sheets = google.sheets({ version: "v4" });
      const spreadsheetId = this.config.spreadsheetId;
      const sheetName = this.config.sheetName || "Sheet1";

      await sheets.spreadsheets.get({ spreadsheetId });

      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`,
      });
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      const values = existing.data.values ?? [];
      const appId = payload?.application?.id;
      const isDuplicate = values.some((row: unknown[]) => row?.[0] === appId);
      if (isDuplicate) {
        return {
          success: true,
          retryable: false,
          response: {
            status: "duplicate",
            externalReference: "2",
          },
        };
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[appId ?? ""]] },
      });

      return {
        success: true,
        retryable: false,
        response: {
          status: "appended",
          externalReference: "2",
        },
      };
    } catch (_error) {
      return {
        success: false,
        retryable: false,
        response: {
          detail: "Google Sheet columnMapVersion missing",
        },
      };
    }
  }
}
