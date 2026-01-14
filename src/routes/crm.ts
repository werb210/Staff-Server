import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import { respondOk } from "../utils/respondOk";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CRM_READ]));

router.get("/", safeHandler((_req, res) => {
  respondOk(res, {
    customers: [],
    contacts: [],
    totalCustomers: 0,
    totalContacts: 0,
  });
}));

router.get("/customers", safeHandler((req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  respondOk(
    res,
    {
      customers: [],
      total: 0,
    },
    {
      page,
      pageSize,
    }
  );
}));

router.get("/contacts", safeHandler((req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  respondOk(
    res,
    {
      contacts: [],
      total: 0,
    },
    {
      page,
      pageSize,
    }
  );
}));

export default router;
