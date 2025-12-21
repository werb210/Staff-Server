import { randomUUID } from "crypto";
import { jest } from "@jest/globals";
import request from "supertest";

import app from "../app";
import { passwordService } from "../services/password.service";
import { createMockDb } from "../testUtils/mockDb";

const password = "SmokePass123";
const allowedUsers = new Map([["smoke@example.com", { password, role: "Staff" }]]);

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
  verifyUserCredentials: jest.fn(async (email: string, pw: string) => {
    const record = allowedUsers.get(email.trim().toLowerCase());
    if (record && pw === record.password) {
      return { id: email, email: email.toLowerCase(), role: record.role };
    }
    return null;
  }),
}));

const { __mockDb: mock } = jest.requireMock("../db") as { __mockDb: MockDb };
const { verifyUserCredentials } = jest.requireMock("../services/authService") as { verifyUserCredentials: jest.Mock };

beforeEach(async () => {
  verifyUserCredentials.mockImplementation(async (email: string, pw: string) => {
    const record = allowedUsers.get(email.trim().toLowerCase());
    if (record && pw === record.password) {
      return { id: email, email: email.toLowerCase(), role: record.role };
    }
    return null;
  });
  mock.userStore.length = 0;
  mock.auditStore.length = 0;

  const password_hash = await passwordService.hashPassword(password);
  mock.userStore.push({
    id: randomUUID(),
    email: "smoke@example.com",
    password_hash,
    first_name: "Smoke",
    last_name: "Test",
    role: "Staff",
    status: "active",
    is_active: true,
  });
});

describe("Auth smoke test", () => {
  it("logs in a seeded user and returns a token", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "SMOKE@example.com",
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
