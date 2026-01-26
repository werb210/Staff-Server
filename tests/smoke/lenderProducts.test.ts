import { randomUUID } from "crypto";
import { get, patch, post } from "../_utils/http";
import { authHeader, startOtp, verifyOtp } from "../_utils/auth";
import { startSmokeServer } from "./smokeServer";

describe("lender products smoke", () => {
  let cleanup: (() => Promise<void>) | null = null;
  const initialBootstrapPhone = process.env.AUTH_BOOTSTRAP_ADMIN_PHONE;

  beforeAll(async () => {
    if (!process.env.AUTH_BOOTSTRAP_ADMIN_PHONE) {
      process.env.AUTH_BOOTSTRAP_ADMIN_PHONE = "+15878881837";
    }
    const server = await startSmokeServer();
    cleanup = server.cleanup;
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
    if (!initialBootstrapPhone) {
      delete process.env.AUTH_BOOTSTRAP_ADMIN_PHONE;
    }
  });

  test("CRUD lender products", async () => {
    await startOtp();
    const { accessToken } = await verifyOtp();
    const headers = authHeader(accessToken);

    const lenderName = `Smoke Lender ${randomUUID()}`;
    const lender = await post<{ id: string }>(
      "/api/lenders",
      { name: lenderName, country: "US", submissionMethod: "API" },
      headers
    );

    const requiredDocuments = [{ type: "bank_statement" }];
    const eligibility = { minCreditScore: 650, states: ["CA", "NY"] };

    const created = await post<{
      id: string;
      lenderId: string;
      active: boolean;
      required_documents: unknown;
      eligibility: unknown;
    }>(
      "/api/lender-products",
      {
        lenderId: lender.id,
        name: "Smoke Product",
        active: false,
        required_documents: requiredDocuments,
        eligibility,
      },
      headers
    );

    expect(created.lenderId).toBe(lender.id);
    expect(created.active).toBe(false);
    expect(created.required_documents).toEqual(requiredDocuments);
    expect(created.eligibility).toEqual(eligibility);

    const activeOnly = await get<unknown[]>(
      "/api/lender-products?active=true",
      headers
    );
    expect(Array.isArray(activeOnly)).toBe(true);

    const updatedDocs = [{ type: "id_document" }];
    const updatedEligibility = { minCreditScore: 700 };
    const updated = await patch<{
      id: string;
      required_documents: unknown;
      eligibility: unknown;
    }>(
      `/api/lender-products/${created.id}`,
      {
        required_documents: updatedDocs,
        eligibility: updatedEligibility,
      },
      headers
    );

    expect(updated.required_documents).toEqual(updatedDocs);
    expect(updated.eligibility).toEqual(updatedEligibility);
  });
});
