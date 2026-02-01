import {
  createLenderProductService,
  DEFAULT_LENDER_PRODUCT_NAME,
  listLenderProductsByLenderIdService,
  listLenderProductsService,
  updateLenderProductService,
} from "../src/services/lenderProductsService";
import type { LenderProductRecord } from "../src/types/LenderProductRecord";
import { ensureSeedRequirementsForProduct } from "../src/services/lenderProductRequirementsService";
import {
  createLenderProduct,
  listLenderProducts,
  listLenderProductsByLenderId,
  updateLenderProduct,
} from "../src/repositories/lenderProducts.repo";

jest.mock("../src/repositories/lenderProducts.repo", () => ({
  createLenderProduct: jest.fn(),
  listLenderProducts: jest.fn(),
  listLenderProductsByLenderId: jest.fn(),
  updateLenderProduct: jest.fn(),
}));

jest.mock("../src/services/lenderProductRequirementsService", () => ({
  ensureSeedRequirementsForProduct: jest.fn(),
}));

const mockedCreate = createLenderProduct as jest.MockedFunction<typeof createLenderProduct>;
const mockedList = listLenderProducts as jest.MockedFunction<typeof listLenderProducts>;
const mockedListByLenderId =
  listLenderProductsByLenderId as jest.MockedFunction<
    typeof listLenderProductsByLenderId
  >;
const mockedUpdate = updateLenderProduct as jest.MockedFunction<typeof updateLenderProduct>;
const mockedEnsureSeed =
  ensureSeedRequirementsForProduct as jest.MockedFunction<
    typeof ensureSeedRequirementsForProduct
  >;

describe("lenderProductsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureSeed.mockResolvedValue(0);
  });

  it("defaults null names before create persistence", async () => {
    mockedCreate.mockResolvedValue({ id: "product-1" } as any);

    await createLenderProductService({
      lenderId: "lender-1",
      name: null,
      active: true,
      category: "LOC",
      country: "US",
      rateType: "FIXED",
      interestMin: "6.5",
      interestMax: "12.5",
      termMin: 6,
      termMax: 24,
      requiredDocuments: [],
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: DEFAULT_LENDER_PRODUCT_NAME })
    );
  });

  it("defaults empty names before update persistence", async () => {
    mockedUpdate.mockResolvedValue({} as any);

    await updateLenderProductService({
      id: "product-1",
      name: "   ",
      requiredDocuments: [],
    });

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: DEFAULT_LENDER_PRODUCT_NAME })
    );
  });

  it("returns full lender product records when listing all products", async () => {
    const record: LenderProductRecord = {
      id: "product-1",
      lender_id: "lender-1",
      name: "Bridge Loan",
      category: "TERM",
      country: "US",
      rate_type: "FIXED",
      interest_min: "6.5",
      interest_max: "12.5",
      term_min: 6,
      term_max: 24,
      term_unit: "MONTHS",
      active: true,
      required_documents: [],
      created_at: new Date("2024-01-01T00:00:00Z"),
      updated_at: new Date("2024-01-02T00:00:00Z"),
    };

    mockedList.mockResolvedValue([record]);

    const results = await listLenderProductsService();

    expect(results).toEqual([record]);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: record.id,
        lender_id: record.lender_id,
        name: record.name,
      })
    );
  });

  it("returns full lender product records when listing by lender id", async () => {
    const record: LenderProductRecord = {
      id: "product-2",
      lender_id: "lender-2",
      name: "Construction Loan",
      category: "LOC",
      country: "CA",
      rate_type: "VARIABLE",
      interest_min: "P+",
      interest_max: "P+",
      term_min: 12,
      term_max: 36,
      term_unit: "MONTHS",
      active: false,
      required_documents: [],
      created_at: new Date("2024-02-01T00:00:00Z"),
      updated_at: new Date("2024-02-02T00:00:00Z"),
    };

    mockedListByLenderId.mockResolvedValue([record]);

    const results = await listLenderProductsByLenderIdService({
      lenderId: "lender-2",
      silo: null,
    });

    expect(results).toEqual([record]);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: record.id,
        lender_id: record.lender_id,
        name: record.name,
      })
    );
  });
});
