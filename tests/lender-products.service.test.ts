import {
  createLenderProductService,
  DEFAULT_LENDER_PRODUCT_NAME,
  updateLenderProductService,
} from "../src/services/lenderProductsService";
import {
  createLenderProduct,
  updateLenderProduct,
} from "../src/repositories/lenderProducts.repo";

jest.mock("../src/repositories/lenderProducts.repo", () => ({
  createLenderProduct: jest.fn(),
  listLenderProducts: jest.fn(),
  listLenderProductsByLenderId: jest.fn(),
  updateLenderProduct: jest.fn(),
}));

const mockedCreate = createLenderProduct as jest.MockedFunction<typeof createLenderProduct>;
const mockedUpdate = updateLenderProduct as jest.MockedFunction<typeof updateLenderProduct>;

describe("lenderProductsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults null names before create persistence", async () => {
    mockedCreate.mockResolvedValue({} as any);

    await createLenderProductService({
      lenderId: "lender-1",
      name: null,
      description: null,
      active: true,
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
});
