import request from "supertest";
import { buildAppWithApiRoutes } from "../src/app";
import { pool } from "../src/db";
import { ROLES } from "../src/auth/roles";
import { signAccessToken } from "../src/auth/jwt";

const app = buildAppWithApiRoutes();
const requestId = "lender-contracts-test";
let phoneCounter = 9100;
const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function resetDb(): Promise<void> {
  await pool.query("delete from lender_products");
  await pool.query("delete from lenders");
}

function createAdminToken(): string {
  return signAccessToken({
    sub: `lender-contracts-${nextPhone()}`,
    role: ROLES.ADMIN,
    tokenVersion: 1,
    silo: "default",
  });
}

async function createLender(token: string) {
  const lenderResponse = await request(app)
    .post("/api/lenders")
    .set("Authorization", `Bearer ${token}`)
    .set("x-request-id", requestId)
    .send({ name: "Contract Lender", country: "US" });

  return lenderResponse.body;
}

beforeEach(async () => {
  await resetDb();
  phoneCounter = 9100;
});

describe("lender contract integration", () => {
  it("returns lenders with country populated", async () => {
    const token = createAdminToken();
    const lender = await createLender(token);

    const response = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(response.status).toBe(200);
    const match = response.body.find(
      (item: { id: string }) => item.id === lender.id
    );
    expect(match).toBeDefined();
    expect(match.country).toBe("US");
  });

  it("accepts empty required_documents arrays", async () => {
    const token = createAdminToken();
    const lender = await createLender(token);

    const response = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({ lenderId: lender.id, required_documents: [] });

    expect(response.status).toBe(201);
    expect(response.body.required_documents).toEqual([]);
  });
});
