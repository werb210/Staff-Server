import { randomUUID } from "crypto";

export interface MarketingItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  channel: string;
  spend: number;
  lastUpdatedAt: string;
}

/**
 * MarketingService maintains in-memory marketing campaign data.
 */
export class MarketingService {
  private ads: MarketingItem[] = [
    {
      id: "3d8a4b39-4f29-4ddd-8627-0d8b284dd2a9",
      name: "Search",
      description: "Paid search keywords for small business lending",
      active: true,
      channel: "Search",
      spend: 1200,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: "6879be9f-7b3d-4be3-a3cf-43b7d623c2d6",
      name: "Display",
      description: "Display retargeting across business news",
      active: false,
      channel: "Display",
      spend: 800,
      lastUpdatedAt: new Date().toISOString(),
    },
  ];

  private automations: MarketingItem[] = [
    {
      id: "abdc9b55-4efc-4a4d-9f6f-1d44ad66f2a1",
      name: "Post-submit nurture",
      description: "Email drip for submitted applications",
      active: true,
      channel: "Email",
      spend: 0,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: "c7e7d65b-3f9f-4e86-a9d4-8f43148ad3dc",
      name: "SMS reminders",
      description: "Automated SMS follow-ups for document collection",
      active: true,
      channel: "SMS",
      spend: 150,
      lastUpdatedAt: new Date().toISOString(),
    },
  ];

  public listAds(): MarketingItem[] {
    return this.ads.map((item) => ({ ...item }));
  }

  public listAutomations(): MarketingItem[] {
    return this.automations.map((item) => ({ ...item }));
  }

  public toggleAd(id: string, active: boolean): MarketingItem {
    const index = this.ads.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Ad not found");
    }
    const updated: MarketingItem = {
      ...this.ads[index],
      active,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.ads[index] = updated;
    return updated;
  }

  public toggleAutomation(id: string, active: boolean): MarketingItem {
    const index = this.automations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Automation not found");
    }
    const updated: MarketingItem = {
      ...this.automations[index],
      active,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.automations[index] = updated;
    return updated;
  }

  public createAd(payload: Omit<MarketingItem, "id" | "lastUpdatedAt">): MarketingItem {
    const ad: MarketingItem = {
      ...payload,
      id: randomUUID(),
      lastUpdatedAt: new Date().toISOString(),
    };
    this.ads.unshift(ad);
    return ad;
  }

  public createAutomation(
    payload: Omit<MarketingItem, "id" | "lastUpdatedAt">,
  ): MarketingItem {
    const automation: MarketingItem = {
      ...payload,
      id: randomUUID(),
      lastUpdatedAt: new Date().toISOString(),
    };
    this.automations.unshift(automation);
    return automation;
  }
}

export const marketingService = new MarketingService();

export type MarketingServiceType = MarketingService;

export const createMarketingService = (): MarketingService => new MarketingService();
