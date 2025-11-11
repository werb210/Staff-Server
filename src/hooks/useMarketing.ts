import { useCallback, useEffect, useState } from "react";
import {
  listAds,
  listAutomations,
  toggleAd as toggleAdApi,
  toggleAutomation as toggleAutomationApi,
} from "../api/marketing";
import { MarketingItem } from "../types/api";

export function useMarketing() {
  const [ads, setAds] = useState<MarketingItem[]>([]);
  const [automations, setAutomations] = useState<MarketingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [adsData, automationData] = await Promise.all([
        listAds(),
        listAutomations(),
      ]);
      setAds(adsData);
      setAutomations(automationData);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load marketing data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleAd = useCallback(async (id: string, active: boolean) => {
    const ad = await toggleAdApi(id, active);
    setAds((prev) => prev.map((item) => (item.id === ad.id ? ad : item)));
    return ad;
  }, []);

  const toggleAutomation = useCallback(async (id: string, active: boolean) => {
    const automation = await toggleAutomationApi(id, active);
    setAutomations((prev) => prev.map((item) => (item.id === automation.id ? automation : item)));
    return automation;
  }, []);

  return {
    ads,
    automations,
    loading,
    error,
    refresh,
    toggleAd,
    toggleAutomation,
  };
}

export type UseMarketingReturn = ReturnType<typeof useMarketing>;
