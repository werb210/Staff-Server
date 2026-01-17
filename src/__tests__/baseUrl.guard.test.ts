describe("BASE_URL guard", () => {
  it("rejects localhost values in CI", () => {
    const baseUrl = process.env.BASE_URL;
    const isCi = process.env.CI === "true" || process.env.CI === "1";
    if (!baseUrl) {
      if (isCi) {
        throw new Error("BASE_URL must be set in CI.");
      }
      return;
    }
    expect(baseUrl).not.toMatch(/localhost|127\.0\.0\.1/i);
  });
});
