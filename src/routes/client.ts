import { Router } from "express";
import clientSubmissionRoutes from "../modules/clientSubmission/clientSubmission.routes";
import clientLendersRoutes from "./client/lenders";
import lenderProductsRoutes from "./client/lenderProducts";
import documentsRoutes from "./documents";
import {
  clientDocumentsRateLimit,
  clientReadRateLimit,
} from "../middleware/rateLimit";

const router = Router();
const clientReadLimiter = clientReadRateLimit();

router.use((req, res, next) => {
  if (req.method === "GET") {
    clientReadLimiter(req, res, next);
    return;
  }
  next();
});
router.use("/lenders", clientLendersRoutes);
router.use("/lender-products", lenderProductsRoutes);
router.use("/documents", clientDocumentsRateLimit(), documentsRoutes);
router.use("/", clientSubmissionRoutes);

export default router;
