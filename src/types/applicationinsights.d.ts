declare module "applicationinsights" {
  interface Setup {
    setAutoCollectRequests(value: boolean): Setup;
    setAutoCollectDependencies(value: boolean): Setup;
    setAutoCollectExceptions(value: boolean): Setup;
    setAutoCollectPerformance(value: boolean, collectExtendedMetrics?: boolean): Setup;
    setAutoCollectConsole(value: boolean, collectErrors?: boolean): Setup;
    setSendLiveMetrics(value: boolean): Setup;
    start(): void;
  }

  export function setup(connectionString?: string): Setup;
  const appInsights: {
    setup: typeof setup;
  } & Setup;
  export default appInsights;
}
