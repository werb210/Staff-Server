// ---- Revenue Intelligence Engine ----
export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  first_visit_timestamp?: number;
}

export interface ServerEvent {
  event: string;
  application_id?: string;
  attribution?: AttributionData | null;
  payload?: Record<string, any>;
}

export const serverTrack = (data: ServerEvent): void => {
  const structured = {
    timestamp: Date.now(),
    source: "server",
    ...data,
  };

  // eslint-disable-next-line no-console
  console.log("SERVER_ANALYTICS:", JSON.stringify(structured));
};

export const serverAnalytics = serverTrack;
