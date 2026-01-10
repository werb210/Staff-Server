const trackRequest = jest.fn();
const trackDependency = jest.fn();
const trackException = jest.fn();
const trackEvent = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: (telemetry: unknown) => trackRequest(telemetry),
  trackDependency: (telemetry: unknown) => trackDependency(telemetry),
  trackException: (telemetry: unknown) => trackException(telemetry),
  trackEvent: (telemetry: unknown) => trackEvent(telemetry),
  initializeAppInsights: jest.fn(),
}));

describe("process stability", () => {
  it("does not exit on rejected db promise", async () => {
    trackException.mockClear();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const error = new Error("db down");
    (error as { code?: string }).code = "ECONNRESET";
    const rejection = Promise.reject(error);
    rejection.catch(() => {});
    process.emit("unhandledRejection", error, rejection);

    await new Promise((resolve) => setImmediate(resolve));

    expect(exitSpy).not.toHaveBeenCalled();
    expect(trackException).toHaveBeenCalled();
    expect(trackException).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          classification: "db_unavailable",
        }),
      })
    );

    exitSpy.mockRestore();
  });
});
