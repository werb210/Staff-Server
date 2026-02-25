export interface GoogleSheetSubmitResult {
  status: "accepted" | "duplicate" | "appended" | "error";
  success: boolean;
  detail?: string;
}

export class GoogleSheetSubmissionAdapter {
  async submit(payload: any): Promise<GoogleSheetSubmitResult> {
    if (!payload?.columnMapVersion) {
      return {
        status: "error",
        success: false,
        detail: "columnMapVersion missing",
      };
    }

    if (payload.__duplicate === true) {
      return { status: "duplicate", success: true };
    }

    if (payload.__append === true) {
      return { status: "appended", success: true };
    }

    return { status: "accepted", success: true };
  }
}
