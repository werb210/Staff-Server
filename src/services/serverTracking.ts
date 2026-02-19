// ---- Revenue Intelligence Engine ----
// ---- GA4 Measurement Protocol Config ----
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "";
const GA4_API_SECRET = process.env.GA4_API_SECRET || "";

export interface AttributionData {
  client_id?: string;
  ga_client_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  msclkid?: string;
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

export const pushToGA4 = async (
  clientId: string,
  eventName: string,
  params: Record<string, unknown>
): Promise<void> => {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: eventName,
              params,
            },
          ],
        }),
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GA4 push failed:", err);
  }
};

export const serverAnalytics = serverTrack;
