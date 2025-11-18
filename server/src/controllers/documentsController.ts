import { documentService } from "../services/documentService.js";

export const documentsController = {
  list: async (_req, res) => {
    res.json(await documentService.list());
  },

  get: async (req, res) => {
    res.json(await documentService.get(req.params.id));
  },

  create: async (req, res) => {
    res.json(await documentService.create(req.body));
  },

  update: async (req, res) => {
    res.json(await documentService.update(req.params.id, req.body));
  },

  remove: async (req, res) => {
    res.json(await documentService.remove(req.params.id));
  },
};
