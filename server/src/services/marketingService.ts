import { randomUUID } from "node:crypto";

export interface MarketingAd {
  id: string;
  platform: "google" | "facebook" | "linkedin" | "microsoft";
  name: string;
  budget: number;
  status: "draft" | "active" | "paused";
}

export interface AutomationJourney {
  id: string;
  name: string;
  trigger: "webhook" | "time_delay" | "manual";
  active: boolean;
}

class MarketingService {
  private readonly ads = new Map<string, MarketingAd>();
  private readonly journeys = new Map<string, AutomationJourney>();

  constructor() {
    const seedAds: MarketingAd[] = [
      { id: randomUUID(), platform: "google", name: "SMB Loan Keywords", budget: 2500, status: "active" },
      { id: randomUUID(), platform: "linkedin", name: "Lender Outreach", budget: 1200, status: "paused" }
    ];

    const seedJourneys: AutomationJourney[] = [
      { id: randomUUID(), name: "Abandoned Application", trigger: "time_delay", active: true },
      { id: randomUUID(), name: "Funded Customer Nurture", trigger: "webhook", active: false }
    ];

    seedAds.forEach((ad) => this.ads.set(ad.id, ad));
    seedJourneys.forEach((journey) => this.journeys.set(journey.id, journey));
  }

  listAds(): MarketingAd[] {
    return Array.from(this.ads.values()).map((ad) => ({ ...ad }));
  }

  createAd(input: Omit<MarketingAd, "id" | "status"> & { status?: MarketingAd["status"] }): MarketingAd {
    const ad: MarketingAd = {
      ...input,
      status: input.status ?? "draft",
      id: randomUUID()
    };
    this.ads.set(ad.id, ad);
    return { ...ad };
  }

  listJourneys(): AutomationJourney[] {
    return Array.from(this.journeys.values()).map((journey) => ({ ...journey }));
  }

  activateJourney(journeyId: string): AutomationJourney | null {
    const journey = this.journeys.get(journeyId);
    if (!journey) {
      return null;
    }
    const updated: AutomationJourney = { ...journey, active: true };
    this.journeys.set(journeyId, updated);
    return { ...updated };
  }
}

export const marketingService = new MarketingService();
