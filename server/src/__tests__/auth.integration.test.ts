import { jest } from "@jest/globals";
import request from "supertest";
import { randomUUID } from "crypto";
import { tokenService } from "../auth/token.service";
import { passwordService } from "../services/password.service";
import { createMockDb } from "../testUtils/mockDb";

const adminPassword = "SecurePass123";
const lenderPassword = "SecurePass456";
const allowedUsers = new Map([
  ["admin@example.com", { password: adminPassword, role: "Admin" }],
  ["lender@example.com", { password: lenderPassword, role: "Lender" }],
]);

type MockDb = ReturnType<typeof import("../testUtils/mockDb")["createMockDb"]>;

jest.mock("../db", () => {
  const mockDb = createMockDb();
  return {
    __esModule: true,
    db: mockDb.db,
    verifyDatabaseConnection: jest.fn().mockResolvedValue(true as any),
    closeDatabase: jest.fn(),
    __mockDb: mockDb,
  } as any;
});

jest.mock("../services/authService", () => ({
  __esModule: true,
  verifyUserCredentials: jest.fn(async (email: string, password: string) => {
    const record = allowedUsers.get(email.trim().toLowerCase());
    if (record && password === record.password) {
      return { id: email, email: email.toLowerCase(), role: record.role };
    }
    return null;
  }),
}));

const { __mockDb: mock } = jest.requireMock("../db") as { __mockDb: MockDb };
const { verifyUserCredentials } = jest.requireMock("../services/authService") as { verifyUserCredentials: jest.Mock };
import app from "../app";

async function seedUsers() {
  mock.userStore.length = 0;
  mock.auditStore.length = 0;
  const adminHash = await passwordService.hashPassword(adminPassword);
  const lenderHash = await passwordService.hashPassword(lenderPassword);
  mock.userStore.push({
    id: randomUUID(),
    email: "admin@example.com",
    password_hash: adminHash,
    first_name: "Admin",
    last_name: "User",
    role: "Admin",
    status: "active",
    is_active: true,
  });
  mock.userStore.push({
    id: randomUUID(),
    email: "lender@example.com",
    password_hash: lenderHash,
    first_name: "Lender",
    last_name: "User",
    role: "Lender",
    status: "active",
    is_active: true,
  });
}

beforeEach(async () => {
  verifyUserCredentials.mockImplementation(async (email: string, password: string) => {
    const record = allowedUsers.get(email.trim().toLowerCase());
    if (record && password === record.password) {
      return { id: email, email: email.toLowerCase(), role: record.role };
    }
    return null;
  });
  await seedUsers();
});

const allowedOrigin = "https://staff.boreal.financial";

describe("Authentication and authorization", () => {
  test("successful login returns an access token", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.header["set-cookie"]).toBeUndefined();
  });

  test("failed login rejects invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword1",
    });

    expect(response.status).toBe(401);
    expect(response.body.token).toBeUndefined();
  });

  test("protected routes reject missing bearer token", async () => {
    const response = await request(app).get("/api/applications");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authorization/i);
  });

  test("protected routes reject requests with cookies but no Authorization header", async () => {
    const response = await request(app)
      .get("/api/applications")
      .set("Cookie", ["session=fake"]);

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authorization/i);
  });

  test("protected routes accept valid bearer tokens", async () => {
    const user = mock.userStore[0]!;
    const tokens = tokenService.createAccessToken({
      id: user.id!,
      email: user.email,
      role: user.role as any,
      status: user.status as any,
      firstName: user.first_name ?? undefined,
      lastName: user.last_name ?? undefined,
    });

    const response = await request(app)
      .get("/api/applications")
      .set("Authorization", `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
  });

  test("protected routes reject invalid bearer tokens", async () => {
    const response = await request(app)
      .get("/api/applications")
      .set("Authorization", "Bearer not-a-valid-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid/i);
  });

  test("protected routes reject malformed authorization headers", async () => {
    const response = await request(app)
      .get("/api/applications")
      .set("Authorization", "Token abc123");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/bearer/i);
  });

  test("CORS preflight allows the staff portal origin", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, Authorization");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    expect(response.headers["access-control-allow-methods"]).toMatch(/options/i);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});
