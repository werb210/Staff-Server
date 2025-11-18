import { userService } from "../services/userService.js";

export const userController = {
  list: async (_req, res) => {
    res.json(await userService.list());
  },

  get: async (req, res) => {
    res.json(await userService.get(req.params.id));
  },

  create: async (req, res) => {
    res.json(await userService.create(req.body));
  },

  update: async (req, res) => {
    res.json(await userService.update(req.params.id, req.body));
  },

  remove: async (req, res) => {
    res.json(await userService.remove(req.params.id));
  },
};
