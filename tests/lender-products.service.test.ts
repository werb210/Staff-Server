import {
  createLenderProductService,
  DEFAULT_LENDER_PRODUCT_NAME,
  listLenderProductsByLenderIdService,
  listLenderProductsService,
  updateLenderProductService,
} from "../src/services/lenderProductsService";
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
      lenderName: "Lender One",
      name: null,
      description: null,
      active: true,
      type: "loc",
      minAmount: 1000,
      maxAmount: 5000,
      status: "active",
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
    const record = {
      id: "product-1",
      lender_id: "lender-1",
      name: "Bridge Loan",
      description: "Short-term funding.",
      active: true,
      required_documents: [],
      eligibility: null,
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
    const record = {
      id: "product-2",
      lender_id: "lender-2",
      name: "Construction Loan",
      description: null,
      active: false,
      required_documents: [],
      eligibility: null,
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
