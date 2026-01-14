import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { ROLES } from "../auth/roles";

describe("portal route contracts", () => {
  let app: ReturnType<typeof buildAppWithApiRoutes>;
  let token: string;

  beforeAll(() => {
    process.env.JWT_SECRET = "test-access-secret";
    app = buildAppWithApiRoutes();
    token = jwt.sign(
      { sub: "contract-user", role: ROLES.ADMIN },
      process.env.JWT_SECRET ?? "test-access-secret",
      { expiresIn: "1h" }
    );
  });

  const authGet = (path: string) =>
    request(app).get(path).set("Authorization", `Bearer ${token}`);

  it("wraps portal responses in ok/data", async () => {
    const routes = [
      "/api/auth/me",
      "/api/dashboard",
      "/api/applications",
      "/api/crm",
      "/api/calendar",
      "/api/communications",
      "/api/marketing",
      "/api/lenders",
      "/api/settings",
    ];

    for (const path of routes) {
      const res = await authGet(path);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body)).toBe(false);
      expect(Array.isArray(res.body.data)).toBe(false);
    }
  });

  it("keeps application lists stable when empty", async () => {
    const res = await authGet("/api/applications");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        applications: [],
        total: 0,
        stage: "new",
      })
    );
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
      })
    );
  });

  it("returns empty list containers with totals and meta", async () => {
    const listRoutes = [
      { path: "/api/crm/customers", key: "customers" },
      { path: "/api/crm/contacts", key: "contacts" },
      { path: "/api/calendar/events", key: "events" },
      { path: "/api/calendar/tasks", key: "tasks" },
      { path: "/api/communications/messages", key: "messages" },
      { path: "/api/marketing/campaigns", key: "campaigns" },
      { path: "/api/lenders", key: "lenders" },
      { path: "/api/tasks", key: "tasks" },
    ];

    for (const route of listRoutes) {
      const res = await authGet(route.path);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data[route.key])).toBe(true);
      expect(res.body.data[route.key]).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          pageSize: 25,
        })
      );
    }
  });
});
