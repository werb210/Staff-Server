import request from "supertest";
import { buildAppWithApiRoutes } from "../../app";
import { pool } from "../../db";
import { ROLES } from "../../auth/roles";
import { signAccessToken } from "../../auth/jwt";

jest.mock("../../services/lenderProductRequirementsService", () => ({
  ensureSeedRequirementsForProduct: jest.fn().mockResolvedValue(0),
}));

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

const userRow = {
  id: "user-1",
  email: "admin@example.com",
  phoneNumber: "15555550123",
  phoneVerified: true,
  role: ROLES.ADMIN,
  silo: "default",
  lenderId: null,
  status: "active",
  active: true,
  isActive: true,
  disabled: false,
  lockedUntil: null,
  tokenVersion: 0,
};

const lenderColumns = [
  "id",
  "name",
  "country",
  "city",
  "region",
  "submission_method",
  "active",
  "status",
  "contact_name",
  "contact_email",
  "contact_phone",
  "email",
  "phone",
  "website",
  "postal_code",
  "submission_email",
  "created_at",
].map((column_name) => ({ column_name }));

const lenderProductColumns = [
  "id",
  "lender_id",
  "lender_name",
  "name",
  "description",
  "type",
  "min_amount",
  "max_amount",
  "status",
  "active",
  "required_documents",
  "eligibility",
  "created_at",
  "updated_at",
].map((column_name) => ({ column_name }));

describe("GET /api/lenders", () => {
  beforeEach(() => {
    mockPool.query.mockImplementation((query: string) => {
      if (query.toLowerCase().includes("from users")) {
        return Promise.resolve({
          rows: [userRow],
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

describe("POST /api/lenders", () => {
  beforeEach(() => {
    mockPool.query.mockImplementation((query: string, values?: unknown[]) => {
      const lower = query.toLowerCase();
      if (lower.includes("from users")) {
        return Promise.resolve({ rows: [userRow] });
      }
      if (lower.includes("information_schema.columns")) {
        const tableName = Array.isArray(values) ? String(values[0]) : "";
        if (tableName === "lender_products") {
          return Promise.resolve({ rows: lenderProductColumns });
        }
        return Promise.resolve({ rows: lenderColumns });
      }
      if (lower.includes("insert into lenders")) {
        return Promise.resolve({
          rows: [
            {
              id: "lender-1",
              name: "Active Lender",
              country: "US",
              status: "ACTIVE",
              active: true,
              contact_name: "Alex Smith",
              contact_email: "alex@example.com",
              contact_phone: "15555550000",
              email: "hello@lender.com",
              submission_method: "EMAIL",
              submission_email: "submissions@lender.com",
              postal_code: "90210",
              created_at: new Date(),
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it("creates an active lender with ACTIVE status", async () => {
    const token = signAccessToken({
      sub: userRow.id,
      role: ROLES.ADMIN,
      tokenVersion: 0,
      silo: "default",
    });

    const response = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Active Lender",
        country: "US",
        submissionMethod: "EMAIL",
        submissionEmail: "submissions@lender.com",
        active: true,
        contact: {
          name: "Alex Smith",
          email: "alex@example.com",
          phone: "15555550000",
        },
        email: "hello@lender.com",
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("ACTIVE");

    const insertCall = mockPool.query.mock.calls.find(([sql]) =>
      String(sql).toLowerCase().includes("insert into lenders")
    );
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(["ACTIVE"]));
  });
});

describe("GET /api/lenders/:id", () => {
  beforeEach(() => {
    mockPool.query.mockImplementation((query: string, values?: unknown[]) => {
      const lower = query.toLowerCase();
      if (lower.includes("from users")) {
        return Promise.resolve({ rows: [userRow] });
      }
      if (lower.includes("information_schema.columns")) {
        return Promise.resolve({ rows: lenderColumns });
      }
      if (lower.includes("from lenders") && lower.includes("where id")) {
        return Promise.resolve({
          rows: [
            {
              id: "lender-1",
              name: "Example Lender",
              status: "ACTIVE",
              country: "US",
              city: "Seattle",
              region: "WA",
              postal_code: "98101",
              contact_name: "Jamie Doe",
              contact_email: "jamie@example.com",
              contact_phone: "15555550111",
              submission_method: "EMAIL",
              submission_email: "submissions@example.com",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it("returns lender details for edit modal", async () => {
    const token = signAccessToken({
      sub: userRow.id,
      role: ROLES.ADMIN,
      tokenVersion: 0,
      silo: "default",
    });

    const response = await request(app)
      .get("/api/lenders/lender-1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "lender-1",
      name: "Example Lender",
      status: "ACTIVE",
      country: "US",
      city: "Seattle",
      state: "WA",
      postal_code: "98101",
      contact_name: "Jamie Doe",
      contact_email: "jamie@example.com",
      contact_phone: "15555550111",
      submission_method: "EMAIL",
      submission_email: "submissions@example.com",
    });
  });
});

describe("POST /api/lender-products", () => {
  beforeEach(() => {
    mockPool.query.mockImplementation((query: string, values?: unknown[]) => {
      const lower = query.toLowerCase();
      if (lower.includes("from users")) {
        return Promise.resolve({ rows: [userRow] });
      }
      if (lower.includes("information_schema.columns")) {
        const tableName = Array.isArray(values) ? String(values[0]) : "";
        if (tableName === "lender_products") {
          return Promise.resolve({ rows: lenderProductColumns });
        }
        return Promise.resolve({ rows: lenderColumns });
      }
      if (lower.includes("from lenders") && lower.includes("where id")) {
        return Promise.resolve({
          rows: [
            {
              id: "lender-1",
              name: "Example Lender",
              status: "ACTIVE",
              country: "US",
            },
          ],
        });
      }
      if (lower.includes("insert into lender_products")) {
        return Promise.resolve({
          rows: [
            {
              id: "product-1",
              lender_id: "lender-1",
              name: "Working Capital",
              description: "Fast funding",
              active: true,
              required_documents: [],
              eligibility: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it("persists a lender product when lender is active", async () => {
    const token = signAccessToken({
      sub: userRow.id,
      role: ROLES.ADMIN,
      tokenVersion: 0,
      silo: "default",
    });

    const response = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lenderId: "lender-1",
        name: "Working Capital",
        description: "Fast funding",
        active: true,
        required_documents: [],
        eligibility: {},
        type: "loc",
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("product-1");

    const insertCall = mockPool.query.mock.calls.find(([sql]) =>
      String(sql).toLowerCase().includes("insert into lender_products")
    );
    expect(insertCall).toBeTruthy();
  });
});
