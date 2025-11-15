import { Router } from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import {
  smsSend,
  smsThreads,
  callStart,
  callList,
  emailSend,
  emailList,
} from "../controllers/index.js";

const router = Router();

router.use(requireAuth);

router.post("/sms/send", smsSend);
router.get("/sms", smsThreads);

router.post("/call/start", callStart);
router.get("/call", callList);

router.post("/email/send", emailSend);
router.get("/email", emailList);

export default router;
