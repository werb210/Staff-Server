import asyncHandler from "../utils/asyncHandler.js";
import financialsService from "../services/financialsService.js";

const financialsController = {
  list: asyncHandler(async (_req, res) => {
    const data = await financialsService.list();
    res.json({ success: true, data });
  }),

  get: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await financialsService.get(id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await financialsService.create(req.body);
    res.status(201).json({ success: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await financialsService.update(id, req.body);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await financialsService.remove(id);
    res.json({ success: true, data });
  }),
};

export default financialsController;
