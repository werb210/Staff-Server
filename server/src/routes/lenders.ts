import { Router } from "express";
import { lenderService } from "../services/lenderService.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

// Returns the roster of available lenders.
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

// Returns all lender products regardless of lender.
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

// Returns the products offered by a specific lender.
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

// Returns documentation requirements for a lender.
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

export default router;
