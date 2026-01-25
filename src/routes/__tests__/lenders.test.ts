import request from "supertest";
import { buildAppWithApiRoutes } from "../../app";
import { pool } from "../../db";
import { ROLES } from "../../auth/roles";
import { signAccessToken } from "../../auth/jwt";

jest.mock("../../db", () => {
  const query = jest.fn();
  return {
    pool: { query },
    db: { query },
    checkDb: jest.fn(),
  };
});

const app = buildAppWithApiRoutes();

const mockPool = pool as unknown as { query: jest.Mock };

describe("GET /api/lenders", () => {
  beforeEach(() => {
    mockPool.query.mockImplementation((query: string) => {
      if (query.toLowerCase().includes("from users")) {
        return Promise.resolve({
          rows: [
            {
              id: "user-1",
              role: ROLES.ADMIN,
              status: "active",
              silo: "default",
              lender_id: null,
              active: true,
              is_active: true,
              disabled: false,
            },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          {
            id: "lender-1",
            name: "Example Lender",
            country: "US",
            submission_method: ["email"],
            products: [],
          },
        ],
      });
    });
  });

  it("returns 200 with an array payload", async () => {
    const token = signAccessToken({
      sub: "user-1",
      role: ROLES.ADMIN,
      tokenVersion: 0,
      silo: "default",
    });
    const response = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
