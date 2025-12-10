import { Router } from "express";
import { AIEngine, EchoAIProvider } from "../ai/aiEngine";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const aiEngine = new AIEngine(new EchoAIProvider());

router.use(requireAuth);

router.post("/summarize", async (req, res, next) => {
  try {
    const result = await aiEngine.summarize({
      applicationId: req.body.applicationId,
      userId: req.user?.id,
      input: req.body.input ?? { content: req.body.content ?? "" },
      documentVersionId: req.body.documentVersionId,
      template: req.body.template,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/extract", async (req, res, next) => {
  try {
    const result = await aiEngine.extract({
      applicationId: req.body.applicationId,
      userId: req.user?.id,
      input: req.body.input ?? { content: req.body.content ?? "" },
      documentVersionId: req.body.documentVersionId,
      template: req.body.template,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/rewrite", async (req, res, next) => {
  try {
    const result = await aiEngine.rewrite({
      applicationId: req.body.applicationId,
      userId: req.user?.id,
      input: req.body.input ?? { content: req.body.content ?? "" },
      documentVersionId: req.body.documentVersionId,
      template: req.body.template,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/credit-summary", async (req, res, next) => {
  try {
    const result = await aiEngine.creditSummary({
      applicationId: req.body.applicationId,
      userId: req.user?.id,
      input: req.body.input ?? {},
      template: req.body.template,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
