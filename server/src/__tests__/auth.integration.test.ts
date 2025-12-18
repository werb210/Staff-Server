import request from "supertest";
import { randomUUID } from "crypto";
import { tokenService } from "../auth/token.service";
import { passwordService } from "../services/password.service";

type MockDb = ReturnType<typeof import("../testUtils/mockDb")["createMockDb"]>;

jest.mock("../db", () => {
  const { createMockDb } = require("../testUtils/mockDb");
  const mockDb = createMockDb();
  return {
    db: mockDb.db,
    verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
    closeDatabase: jest.fn(),
    __mockDb: mockDb,
  };
});

const { __mockDb: mock } = jest.requireMock("../db") as { __mockDb: MockDb };

import app from "../app";

const adminPassword = "SecurePass123";
const lenderPassword = "SecurePass456";

async function seedUsers() {
  mock.userStore.length = 0;
  mock.auditStore.length = 0;
  tokenService.clearAllSessions();
  const adminHash = await passwordService.hashPassword(adminPassword);
  const lenderHash = await passwordService.hashPassword(lenderPassword);
  mock.userStore.push({
    id: randomUUID(),
    email: "admin@example.com",
    passwordHash: adminHash,
    firstName: "Admin",
    lastName: "User",
    role: "Admin",
    status: "active",
  });
  mock.userStore.push({
    id: randomUUID(),
    email: "lender@example.com",
    passwordHash: lenderHash,
    firstName: "Lender",
    lastName: "User",
    role: "Lender",
    status: "active",
  });
}

beforeEach(async () => {
  await seedUsers();
});

describe("Authentication and authorization", () => {
  test("successful login returns a token", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.tokens.accessToken).toBeDefined();
    expect(response.body.tokens.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe("admin@example.com");
  });

  test("failed login rejects invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword1",
    });

    expect(response.status).toBe(401);
    expect(response.body.tokens).toBeUndefined();
  });
});
