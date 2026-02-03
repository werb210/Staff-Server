import { google } from "googleapis";
import { logError, logInfo } from "../../../observability/logger";
import {
  type SubmissionAdapter,
  type SubmissionResult,
} from "../SubmissionAdapter";

export type GoogleSheetsPayload = {
  application: {
    id: string;
    ownerUserId: string | null;
    name: string;
    metadata: unknown;
    productType: string;
    lenderId: string | null;
    lenderProductId: string | null;
    requestedAmount: number | null;
  };
  documents: Array<{
    documentId: string;
    documentType: string;
    title: string;
    versionId: string;
    version: number;
    metadata: unknown;
    content: string;
  }>;
  submittedAt: string;
};

export type GoogleSheetsColumnConfig = {
  header: string;
  path?: string | string[];
  static?: string | number | null;
  format?: "string" | "number";
};

export type GoogleSheetsSubmissionConfig = {
  sheetId: string;
  sheetTab?: string | null;
  applicationIdHeader: string;
  columns: GoogleSheetsColumnConfig[];
};

function assertServiceAccountEnv(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("Missing Google service account JSON configuration.");
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new Error("Invalid Google service account JSON configuration.");
  }
}

function columnIndexToLetter(index: number): string {
  let result = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function resolveSheetTitle(response: {
  data?: { sheets?: Array<{ properties?: { title?: string | null } | null } | null> };
}): string {
  const title = response.data?.sheets?.[0]?.properties?.title ?? null;
  if (!title) {
    throw new Error("Unable to resolve Google Sheet tab name.");
  }
  return title;
}

function resolveRetryableError(error: unknown): boolean {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code;
  if (typeof status === "number") {
    return status === 429 || status >= 500;
  }
  return false;
}

function getPathValue(source: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    const current = acc as Record<string, unknown>;
    if (segment === "") {
      return acc;
    }
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      const index = Number(segment);
      return current[index];
    }
    if (typeof current !== "object") {
      return undefined;
    }
    return current[segment];
  }, source);
}

function resolveColumnValue(payload: GoogleSheetsPayload, column: GoogleSheetsColumnConfig):
  | string
  | number
  | null {
  if (column.static !== undefined) {
    return column.static;
  }
  const paths = Array.isArray(column.path)
    ? column.path
    : column.path
      ? [column.path]
      : [];
  let resolved: unknown = null;
  for (const path of paths) {
    const value = getPathValue(payload, path);
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      continue;
    }
    resolved = value;
    break;
  }

  if (column.format === "number") {
    if (typeof resolved === "number" && Number.isFinite(resolved)) {
      return resolved;
    }
    const parsed = typeof resolved === "string" ? Number(resolved) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof resolved === "number" && Number.isFinite(resolved)) {
    return resolved;
  }
  if (typeof resolved === "string") {
    return resolved;
  }
  return resolved === null || resolved === undefined ? null : String(resolved);
}

function normalizeCellValue(value: string | number | null): string | number {
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

export class GoogleSheetsAdapter implements SubmissionAdapter {
  private payload: GoogleSheetsPayload;
  private config: GoogleSheetsSubmissionConfig;

  constructor(params: { payload: GoogleSheetsPayload; config: GoogleSheetsSubmissionConfig }) {
    this.payload = params.payload;
    this.config = params.config;
  }

  async submit(applicationId: string): Promise<SubmissionResult> {
    const now = new Date().toISOString();
    const credentials = assertServiceAccountEnv();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    logInfo("google_sheets_submission_attempt", {
      applicationId,
      sheetId: this.config.sheetId,
    });

    try {
      if (!this.config.sheetId || !this.config.sheetId.trim()) {
        throw new Error("Google Sheet ID is required.");
      }
      if (!this.config.applicationIdHeader || !this.config.applicationIdHeader.trim()) {
        throw new Error("Application ID header is required.");
      }
      if (!Array.isArray(this.config.columns) || this.config.columns.length === 0) {
        throw new Error("Sheet column mapping is required.");
      }

      const sheetTitle =
        this.config.sheetTab && this.config.sheetTab.trim().length > 0
          ? this.config.sheetTab.trim()
          : resolveSheetTitle(
              await sheets.spreadsheets.get({
                spreadsheetId: this.config.sheetId,
              })
            );

      const applicationIdIndex = this.config.columns.findIndex(
        (column) => column.header === this.config.applicationIdHeader
      );
      if (applicationIdIndex === -1) {
        throw new Error("Application ID column is missing from sheet map.");
      }

      const idColumnLetter = columnIndexToLetter(applicationIdIndex);
      const idRange = `${sheetTitle}!${idColumnLetter}:${idColumnLetter}`;
      const idValuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.config.sheetId,
        range: idRange,
      });

      const idRows: Array<unknown[]> = (idValuesResponse.data.values ?? []) as Array<unknown[]>;
      const existingIds = new Set(
        idRows
          .map((row: unknown[]) => (Array.isArray(row) ? row[0] : null))
          .filter((value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0
          )
          .filter((value: string) => value !== this.config.applicationIdHeader)
      );

      if (existingIds.has(this.payload.application.id)) {
        logInfo("google_sheets_submission_idempotent", {
          applicationId: this.payload.application.id,
          sheetId: this.config.sheetId,
        });
        return {
          success: true,
          response: {
            status: "duplicate",
            detail: "Application already exists in sheet.",
            receivedAt: now,
            externalReference: "duplicate",
          },
          failureReason: null,
          retryable: false,
        };
      }

      const row = this.config.columns.map((column) =>
        normalizeCellValue(resolveColumnValue(this.payload, column))
      );
      const endColumnLetter = columnIndexToLetter(this.config.columns.length - 1);
      const appendRange = `${sheetTitle}!A:${endColumnLetter}`;

      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: this.config.sheetId,
        range: appendRange,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [row],
        },
      });

      const externalReference = appendResponse.data.updates?.updatedRange ?? null;

      return {
        success: true,
        response: {
          status: "appended",
          detail: "Application appended to Google Sheet.",
          receivedAt: now,
          externalReference,
        },
        failureReason: null,
        retryable: false,
      };
    } catch (error) {
      logError("google_sheets_submission_failed", {
        error,
        applicationId: this.payload.application.id,
        sheetId: this.config.sheetId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        response: {
          status: "error",
          detail: error instanceof Error ? error.message : "Unknown Google Sheets error.",
          receivedAt: now,
        },
        failureReason: "google_sheets_error",
        retryable: resolveRetryableError(error),
      };
    }
  }
}
