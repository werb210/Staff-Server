import { randomUUID } from "crypto";
import { CreateAdSchema, UpdateAutomationSchema } from "../schemas/marketingSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

type AdCampaign = {
  id: string;
  name: string;
  channel: "google" | "facebook" | "linkedin";
  budget: number;
  status: "active" | "paused" | "draft";
};

type AutomationWorkflow = {
  id: string;
  name: string;
  trigger: string;
  status: "enabled" | "disabled";
};

class MarketingService {
  private ads: AdCampaign[] = [];
  private automations: AutomationWorkflow[] = [];

  constructor() {
    this.ads.push({
      id: randomUUID(),
      name: "Boreal Launch",
      channel: "google",
      budget: 5000,
      status: "active",
    });
    this.automations.push({
      id: randomUUID(),
      name: "Lead nurture",
      trigger: "new_application",
      status: "enabled",
    });
  }

  listAds(): AdCampaign[] {
    logInfo("Listing marketing ads");
    return this.ads;
  }

  createAd(payload: unknown): AdCampaign {
    const data = parseWithSchema(CreateAdSchema, payload);
    logInfo("Creating ad", data);
    const ad: AdCampaign = {
      id: randomUUID(),
      ...data,
      status: "draft",
    };
    this.ads.push(ad);
    return ad;
  }

  listAutomations(): AutomationWorkflow[] {
    logInfo("Listing marketing automations");
    return this.automations;
  }

  updateAutomation(id: string, payload: unknown): AutomationWorkflow {
    const updates = parseWithSchema(UpdateAutomationSchema, payload);
    logInfo("Updating automation", { id, updates });
    const automation = this.automations.find((item) => item.id === id);
    if (!automation) {
      throw new Error(`Automation ${id} not found`);
    }
    Object.assign(automation, updates);
    return automation;
  }

  deleteAd(id: string): boolean {
    logInfo("Deleting ad", { id });
    const before = this.ads.length;
    this.ads = this.ads.filter((ad) => ad.id !== id);
    return before !== this.ads.length;
  }
}

export const marketingService = new MarketingService();
