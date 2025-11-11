import { Router } from "express";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const { lenderId } = req.query;
  const products = req.silo!.services.lenders.listProducts(
    typeof lenderId === "string" ? lenderId : undefined,
  );
  res.json({ message: "OK", data: products });
});

export default router;
