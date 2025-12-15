import request from "supertest";
import { randomUUID } from "crypto";
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

import app from "../app";

const adminPassword = "SecurePass123";
const lenderPassword = "SecurePass456";

function seedUsers() {
  mock.userStore.length = 0;
  mock.auditStore.length = 0;
  sessionService.clearAllSessions();
  mock.userStore.push({
    id: randomUUID(),
    email: "admin@example.com",
    passwordHash: "",
    firstName: "Admin",
    lastName: "User",
    role: "Admin",
    status: "active",
  });
  mock.userStore.push({
    id: randomUUID(),
    email: "lender@example.com",
    passwordHash: "",
    firstName: "Lender",
    lastName: "User",
    role: "Lender",
    status: "active",
  });
}

beforeEach(async () => {
  seedUsers();
  mock.userStore[0].passwordHash = await passwordService.hashPassword(adminPassword);
  mock.userStore[1].passwordHash = await passwordService.hashPassword(lenderPassword);
});

describe("Authentication and authorization", () => {
  test("successful login returns tokens and logs success", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
    });
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("admin@example.com");
    expect(response.body.tokens?.accessToken).toBeDefined();
    expect(mock.auditStore.some((log) => log.eventType === "login_success")).toBe(true);
  });

  test("failed login records audit log", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "WrongPassword1",
    });
    expect(response.status).toBe(401);
    expect(mock.auditStore.some((log) => log.eventType === "login_failure")).toBe(true);
  });

  test("refresh token generates new access credentials", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
    });
    const refreshToken = login.body.tokens.refreshToken;
    const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(refresh.status).toBe(200);
    expect(refresh.body.tokens.accessToken).toBeDefined();
    expect(typeof refresh.body.tokens.accessToken).toBe("string");
    expect(refresh.body.tokens.refreshToken).toBeDefined();
  });

  test("role-protected routes block unauthorized users", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "lender@example.com",
      password: lenderPassword,
    });
    const accessToken = login.body.tokens.accessToken;

    const forbidden = await request(app)
      .get("/api/protected/admin-check")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(forbidden.status).toBe(403);

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
    });
    const adminAccess = adminLogin.body.tokens.accessToken;

    const allowed = await request(app)
      .get("/api/protected/admin-check")
      .set("Authorization", `Bearer ${adminAccess}`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.scope).toBe("admin");
  });

  test("login audit log captures user metadata", async () => {
    await request(app)
      .post("/api/auth/login")
      .set("User-Agent", "jest-agent")
      .send({ email: "admin@example.com", password: adminPassword });

    const entry = mock.auditStore.find((log) => log.eventType === "login_success");
    expect(entry?.emailAttempt).toBe("admin@example.com");
    expect(entry?.userAgent).toBe("jest-agent");
  });

  test("lender portal requires lender role", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: adminPassword,
      portal: "lender",
    });

    expect(response.status).toBe(403);
    expect(mock.auditStore.some((log) => log.eventType === "login_failure")).toBe(true);
  });
});
