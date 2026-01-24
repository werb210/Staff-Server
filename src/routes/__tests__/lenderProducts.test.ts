import request from "supertest";
import { buildAppWithApiRoutes } from "../../app";
import { pool } from "../../db";

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

describe("GET /api/client/lender-products", () => {
  beforeEach(() => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: "product-1",
          lender_id: "lender-1",
          product_type: "term",
          min_amount: 1000,
          max_amount: 10000,
          countries: ["US"],
          interest_rate: 5.5,
          term_months: 12,
        },
      ],
    });
  });

  it("returns 200 with an array payload", async () => {
    const response = await request(app).get("/api/client/lender-products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
