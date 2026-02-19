// ---- Server Revenue Intelligence Layer ----
export interface AnalyticsEvent {
  event: string;
  payload?: Record<string, any>;
}

export const serverAnalytics = (data: AnalyticsEvent): void => {
  const structuredEvent = {
    timestamp: Date.now(),
    source: "server",
    ...data,
  };

  // eslint-disable-next-line no-console
  console.log("ANALYTICS_EVENT:", JSON.stringify(structuredEvent));
};
