import { httpClient, request } from "../api/http";

describe("request", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("unwraps API envelope", async () => {
    const spy = jest
      .spyOn(httpClient, "request")
      .mockResolvedValueOnce({ data: { message: "OK", data: [] } } as never);

    const applications = await request<unknown[]>({
      url: "/api/applications",
      method: "GET",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/applications",
        method: "GET",
        headers: expect.any(Object),
      }),
    );
    expect(applications).toEqual([]);
  });

  it("normalizes axios errors", async () => {
    jest.spyOn(httpClient, "request").mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed",
      response: { status: 400, data: { message: "Invalid payload" } },
    });

    await expect(
      request({
        url: "/api/applications",
        method: "POST",
        data: { name: "Example" },
      }),
    ).rejects.toMatchObject({
      message: "Invalid payload",
      status: 400,
      data: { message: "Invalid payload" },
    });
  });
});
