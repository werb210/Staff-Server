import { type Request, Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { buildLenderPackage } from "../../services/lenders/packageBuilder";
import { lenderProductsService } from "../../services/lenderProducts/lenderProducts.service";

interface SendLenderPackageBody {
  application: unknown;
  documents: unknown;
  creditSummary: unknown;
  [key: string]: unknown;
}

const router = Router();

router.post("/send", requireAuth, async (req: Request<{}, {}, SendLenderPackageBody>, res, next) => {
  try {
    const packageData = buildLenderPackage(req.body);
    res.json({ status: "sent", package: packageData });
  } catch (err) {
    next(err);
  }
});

router.get("/products", requireAuth, async (_req, res, next) => {
  try {
    const products = await lenderProductsService.list();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

export default router;
