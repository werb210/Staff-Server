import { Handler } from "../types/handler";

export const wrap = (fn: Handler): Handler => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  };
};
