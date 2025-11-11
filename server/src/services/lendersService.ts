import { randomUUID } from "crypto";
import {
  CreateLenderInput,
  CreateLenderProductInput,
  LenderReportRequestSchema,
  SendToLenderSchema,
} from "../schemas/lenderSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";
import { Lender, LenderProduct } from "../types/index.js";

class LendersService {
  private lenders = new Map<string, Lender>();

  constructor() {
    const lender = this.createLender({
      name: "Boreal Bank",
      contactEmail: "lenders@borealbank.test",
      products: [
        {
          name: "Boreal Flex Loan",
          rate: 4.5,
          termMonths: 60,
        },
      ],
    });
    this.lenders.set(lender.id, lender);
  }

  createLender(payload: CreateLenderInput & { products?: CreateLenderProductInput[] }): Lender {
    logInfo("Creating lender", payload);
    const id = randomUUID();
    const productsInput = payload.products ?? [];
    const products = productsInput.map((product) => ({ id: randomUUID(), ...product }));
    const lender: Lender = {
      id,
      name: payload.name,
      contactEmail: payload.contactEmail,
      products,
    };
    this.lenders.set(id, lender);
    return lender;
  }

  updateLender(id: string, payload: Partial<CreateLenderInput>): Lender {
    logInfo("Updating lender", { id, payload });
    const lender = this.getLender(id);
    if (payload.name) lender.name = payload.name;
    if (payload.contactEmail) lender.contactEmail = payload.contactEmail;
    if (payload.products) {
      lender.products = payload.products.map((product) => ({ id: randomUUID(), ...product }));
    }
    return lender;
  }

  deleteLender(id: string): boolean {
    logInfo("Deleting lender", { id });
    return this.lenders.delete(id);
  }

  listLenders(): Lender[] {
    logInfo("Listing lenders");
    return Array.from(this.lenders.values());
  }

  getLender(id: string): Lender {
    logInfo("Fetching lender", { id });
    const lender = this.lenders.get(id);
    if (!lender) {
      throw new Error(`Lender ${id} not found`);
    }
    return lender;
  }

  listProducts(lenderId: string): LenderProduct[] {
    logInfo("Listing lender products", { lenderId });
    return this.getLender(lenderId).products;
  }

  addProduct(lenderId: string, productInput: CreateLenderProductInput): LenderProduct {
    logInfo("Adding lender product", { lenderId, productInput });
    const lender = this.getLender(lenderId);
    const product: LenderProduct = {
      id: randomUUID(),
      ...productInput,
    } as LenderProduct;
    lender.products.push(product);
    this.lenders.set(lenderId, lender);
    return product;
  }

  removeProduct(lenderId: string, productId: string): boolean {
    logInfo("Removing lender product", { lenderId, productId });
    const lender = this.getLender(lenderId);
    const before = lender.products.length;
    lender.products = lender.products.filter((product) => product.id !== productId);
    this.lenders.set(lenderId, lender);
    return lender.products.length !== before;
  }

  sendToLender(payload: unknown): { message: string } {
    const data = parseWithSchema(SendToLenderSchema, payload);
    logInfo("Sending application to lender", data);
    return { message: `Application ${data.applicationId} queued for lender ${data.lenderId}` };
  }

  generateReport(payload: unknown): { lender: Lender; totals: number } {
    const data = parseWithSchema(LenderReportRequestSchema, payload);
    logInfo("Generating lender report", data);
    const lender = this.getLender(data.lenderId);
    return { lender, totals: lender.products.length };
  }
}

export const lendersService = new LendersService();
