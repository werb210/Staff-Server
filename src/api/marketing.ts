import { request } from "./http";
import { MarketingItem } from "../types/api";

export const listAds = () =>
  request<MarketingItem[]>({
    url: "/api/marketing/ads",
    method: "GET",
  });

export const toggleAd = (id: string, active: boolean) =>
  request<MarketingItem>({
    url: "/api/marketing/ads/toggle",
    method: "POST",
    data: { id, active },
  });

export const listAutomations = () =>
  request<MarketingItem[]>({
    url: "/api/marketing/automation",
    method: "GET",
  });

export const toggleAutomation = (id: string, active: boolean) =>
  request<MarketingItem>({
    url: "/api/marketing/automation/toggle",
    method: "POST",
    data: { id, active },
  });
