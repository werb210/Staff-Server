import { Router } from "express";
import { lenderService } from "../services/lenderService.js";
import {
  LenderCreateSchema,
  LenderProductCreateSchema,
  LenderProductUpdateSchema,
  LenderUpdateSchema,
} from "../schemas/lenderProduct.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/lenders
 * Example: curl http://localhost:5000/api/lenders
 */
router.get("/", (_req, res) => {
  try {
    logInfo("Listing lenders");
    const lenders = lenderService.listLenders();
    res.json({ message: "OK", data: lenders });
  } catch (error) {
    logError("Failed to list lenders", error);
    res.status(400).json({ message: "Unable to fetch lenders" });
  }
});

/**
 * GET /api/lenders/products
 * Example: curl http://localhost:5000/api/lenders/products
 */
router.get("/products", (_req, res) => {
  try {
    logInfo("Listing all lender products");
    const products = lenderService.listProducts();
    res.json({ message: "OK", data: products });
  } catch (error) {
    logError("Failed to list all lender products", error);
    res.status(400).json({ message: "Unable to fetch lender products" });
  }
});

/**
 * POST /api/lenders
 * Example: curl -X POST http://localhost:5000/api/lenders \
 *   -H 'Content-Type: application/json' -d '{"name":"Acme Capital","contactEmail":"hello@acme.example"}'
 */
router.post("/", (req, res) => {
  try {
    const payload = LenderCreateSchema.parse(req.body);
    logInfo("Creating lender", payload);
    const lender = lenderService.createLender(payload);
    res.status(201).json({ message: "OK", data: lender });
  } catch (error) {
    logError("Failed to create lender", error);
    res.status(400).json({ message: "Unable to create lender" });
  }
});

/**
 * PUT /api/lenders/:id
 * Example: curl -X PUT http://localhost:5000/api/lenders/<id> \
 *   -H 'Content-Type: application/json' -d '{"status":"paused"}'
 */
router.put("/:id", (req, res) => {
  try {
    const payload = LenderUpdateSchema.parse({ id: req.params.id, ...req.body });
    logInfo("Updating lender", payload);
    const { id, ...updates } = payload;
    const lender = lenderService.updateLender(id, updates);
    res.json({ message: "OK", data: lender });
  } catch (error) {
    logError("Failed to update lender", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * DELETE /api/lenders/:id
 * Example: curl -X DELETE http://localhost:5000/api/lenders/<id>
 */
router.delete("/:id", (req, res) => {
  try {
    logInfo("Deleting lender", { id: req.params.id });
    lenderService.deleteLender(req.params.id);
    res.status(204).json({ message: "OK" });
  } catch (error) {
    logError("Failed to delete lender", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * GET /api/lenders/:id/products
 * Example: curl http://localhost:5000/api/lenders/<id>/products
 */
router.get("/:id/products", (req, res) => {
  try {
    logInfo("Listing lender products", { lenderId: req.params.id });
    const products = lenderService.listProducts(req.params.id);
    res.json({ message: "OK", data: products });
  } catch (error) {
    logError("Failed to list lender products", error);
    res.status(400).json({ message: "Unable to fetch lender products" });
  }
});

/**
 * POST /api/lenders/:id/products
 * Example: curl -X POST http://localhost:5000/api/lenders/<id>/products \
 *   -H 'Content-Type: application/json' -d '{"name":"Bridge Loan","interestRate":8.1,"minAmount":100000,"maxAmount":750000,"termMonths":18,"documentation":[],"recommendedScore":70}'
 */
router.post("/:id/products", (req, res) => {
  try {
    const payload = LenderProductCreateSchema.parse({
      lenderId: req.params.id,
      ...req.body,
    });
    logInfo("Creating lender product", payload);
    const product = lenderService.createProduct(payload);
    res.status(201).json({ message: "OK", data: product });
  } catch (error) {
    logError("Failed to create lender product", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * PUT /api/lenders/:lenderId/products/:productId
 * Example: curl -X PUT http://localhost:5000/api/lenders/<id>/products/<productId> \
 *   -H 'Content-Type: application/json' -d '{"active":false}'
 */
router.put("/:lenderId/products/:productId", (req, res) => {
  try {
    const payload = LenderProductUpdateSchema.parse({
      id: req.params.productId,
      lenderId: req.params.lenderId,
      ...req.body,
    });
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
 * DELETE /api/lenders/:lenderId/products/:productId
 * Example: curl -X DELETE http://localhost:5000/api/lenders/<id>/products/<productId>
 */
router.delete("/:lenderId/products/:productId", (req, res) => {
  try {
    logInfo("Deleting lender product", {
      lenderId: req.params.lenderId,
      productId: req.params.productId,
    });
    lenderService.deleteProduct(req.params.productId);
    res.status(204).json({ message: "OK" });
  } catch (error) {
    logError("Failed to delete lender product", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * GET /api/lenders/:id/requirements
 * Example: curl http://localhost:5000/api/lenders/<id>/requirements
 */
router.get("/:id/requirements", (req, res) => {
  try {
    logInfo("Fetching lender requirements", { lenderId: req.params.id });
    const requirements = lenderService.getDocumentRequirements(req.params.id);
    res.json({ message: "OK", data: requirements });
  } catch (error) {
    logError("Failed to fetch lender requirements", error);
    res.status(400).json({ message: "Unable to fetch lender requirements" });
  }
});

/**
 * GET /api/lenders/:id
 * Example: curl http://localhost:5000/api/lenders/<id>
 */
router.get("/:id", (req, res) => {
  try {
    logInfo("Fetching lender", { id: req.params.id });
    const lender = lenderService.getLender(req.params.id);
    res.json({ message: "OK", data: lender });
  } catch (error) {
    logError("Failed to fetch lender", error);
    res.status(404).json({ message: "Lender not found" });
  }
});

export default router;
