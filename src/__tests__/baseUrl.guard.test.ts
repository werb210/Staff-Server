describe("BASE_URL guard", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("throws when BASE_URL is missing in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.BASE_URL;
    expect(() => {
      jest.isolateModules(() => {
        require("../server");
      });
    }).toThrow("BASE_URL must be set in production.");
  });

  it("allows missing BASE_URL outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.BASE_URL;
    expect(() => {
      jest.isolateModules(() => {
        require("../server");
      });
    }).not.toThrow();
  });
});
