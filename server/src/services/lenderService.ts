import { randomUUID } from "node:crypto";

export interface Lender {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface LenderReport {
  lenderId: string;
  summary: string;
  generatedAt: string;
}

interface SendToLenderPayload {
  applicationId: string;
  lenderId: string;
  sentBy: string;
}

class LenderService {
  private readonly lenders = new Map<string, Lender>();

  constructor() {
    const seed: Lender[] = [
      { id: randomUUID(), name: "Summit Financial", email: "summit@example.com", phone: "+15553334444" },
      { id: randomUUID(), name: "Riverbank Lending", email: "riverbank@example.com", phone: "+15556667777" }
    ];
    seed.forEach((lender) => this.lenders.set(lender.id, lender));
  }

  listLenders(): Lender[] {
    return Array.from(this.lenders.values()).map((lender) => ({ ...lender }));
  }

  sendToLender(payload: SendToLenderPayload): { message: string; lenderId: string; applicationId: string } {
    if (!this.lenders.has(payload.lenderId)) {
      throw new Error(`Lender ${payload.lenderId} not found`);
    }
    return {
      message: `Application ${payload.applicationId} sent to lender ${payload.lenderId} by ${payload.sentBy}`,
      lenderId: payload.lenderId,
      applicationId: payload.applicationId
    };
  }

  listReports(): LenderReport[] {
    return this.listLenders().map((lender) => ({
      lenderId: lender.id,
      summary: `${lender.name} has approved 4 applications this week`,
      generatedAt: new Date().toISOString()
    }));
  }
}

export const lenderService = new LenderService();
