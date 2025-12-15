import { randomUUID } from "crypto";
import request from "supertest";

import app from "../app";
import { passwordService } from "../services/password.service";
import { sessionService } from "../services/session.service";

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

const password = "SmokePass123";

beforeEach(async () => {
  mock.userStore.length = 0;
  mock.auditStore.length = 0;
  sessionService.clearAllSessions();

  const passwordHash = await passwordService.hashPassword(password);
  mock.userStore.push({
    id: randomUUID(),
    email: "smoke@example.com",
    passwordHash,
    firstName: "Smoke",
    lastName: "Test",
    role: "Staff",
    status: "active",
  });
});

describe("Auth smoke test", () => {
  it("logs in a seeded user and returns a token", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "SMOKE@example.com",
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.tokens?.accessToken).toBeDefined();
    expect(response.body.user.email).toBe("smoke@example.com");
  });
});
