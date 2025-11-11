import { Router } from "express";
import { lenderService } from "../services/lenderService.js";
import {
  LenderProductCreateSchema,
  LenderProductUpdateSchema,
} from "../schemas/lenderProduct.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/lender-products
 * Example: curl http://localhost:5000/api/lender-products
 */
router.get("/", (_req, res) => {
  try {
    logInfo("Listing lender products");
    const products = lenderService.listProducts();
    res.json({ message: "OK", data: products });
  } catch (error) {
    logError("Failed to list lender products", error);
    res.status(400).json({ message: "Unable to fetch lender products" });
  }
});

/**
 * GET /api/lender-products/:id
 * Example: curl http://localhost:5000/api/lender-products/<id>
 */
router.get("/:id", (req, res) => {
  try {
    logInfo("Fetching lender product", { id: req.params.id });
    const [product] = lenderService.listProducts().filter((item) => item.id === req.params.id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json({ message: "OK", data: product });
  } catch (error) {
    logError("Failed to fetch lender product", error);
    res.status(400).json({ message: "Unable to fetch product" });
  }
});

/**
 * POST /api/lender-products
 * Example: curl -X POST http://localhost:5000/api/lender-products \
 *   -H 'Content-Type: application/json' -d '{"lenderId":"<id>","name":"Bridge","interestRate":7.5,"minAmount":100000,"maxAmount":500000,"termMonths":24,"documentation":[],"recommendedScore":70}'
 */
router.post("/", (req, res) => {
  try {
    const payload = LenderProductCreateSchema.parse(req.body);
    logInfo("Creating lender product", payload);
    const product = lenderService.createProduct(payload);
    res.status(201).json({ message: "OK", data: product });
  } catch (error) {
    logError("Failed to create lender product", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * PUT /api/lender-products/:id
 * Example: curl -X PUT http://localhost:5000/api/lender-products/<id> \
 *   -H 'Content-Type: application/json' -d '{"interestRate":6.9}'
 */
router.put("/:id", (req, res) => {
  try {
    const payload = LenderProductUpdateSchema.parse({ id: req.params.id, ...req.body });
    logInfo("Updating lender product", payload);
    const { id, ...updates } = payload;
    const product = lenderService.updateProduct(id, updates);
    res.json({ message: "OK", data: product });
  } catch (error) {
    logError("Failed to update lender product", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * DELETE /api/lender-products/:id
 * Example: curl -X DELETE http://localhost:5000/api/lender-products/<id>
 */
router.delete("/:id", (req, res) => {
  try {
    logInfo("Deleting lender product", { id: req.params.id });
    lenderService.deleteProduct(req.params.id);
    res.status(204).json({ message: "OK" });
  } catch (error) {
    logError("Failed to delete lender product", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
