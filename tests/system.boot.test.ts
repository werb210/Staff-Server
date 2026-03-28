import request from "supertest";

import { createServer } from "../src/server/createServer";

describe("System boot", () => {
  it("boots with zero external dependencies", async () => {
    const app = createServer();

    const res = await request(app).get("/health");

    expect(res.body).toEqual({ success: true });
  });
});
