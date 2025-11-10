// Auto-generated stub by Codex
// Stub lender service for demonstration purposes

export type LenderReport = {
  lenderId: string;
  summary: string;
};

class LenderService {
  sendToLender(): { message: string } {
    return { message: "sent" };
  }

  listReports(): LenderReport[] {
    return [{ lenderId: "lender-1", summary: "Stub report" }];
  }
}

export const lenderService = new LenderService();
