export interface GoogleSheetSubmitResult {
  status: "accepted" | "duplicate" | "appended" | "error";
  success: boolean;
  reason?: string;
}

export class GoogleSheetSubmissionAdapter {
  async submit(payload: any): Promise<GoogleSheetSubmitResult> {
    if (!payload) {
      return { status: "error", success: false };
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
