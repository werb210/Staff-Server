// ---- Server Revenue Tracking Layer ----
export interface ServerTrackingEvent {
  event: string;
  payload?: Record<string, any>;
}

export const serverTrack = (data: ServerTrackingEvent): void => {
  // eslint-disable-next-line no-console
  console.log("SERVER_TRACK:", JSON.stringify({
    timestamp: Date.now(),
    ...data,
  }));
};

