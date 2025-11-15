import type { Request, Response } from "express";
import { aiService } from "../services/index.js";

export async function generateAISummary(req: Request, res: Response) {
  const user = req.user;
  const { appId } = req.params;

  const summary = await aiService.generateSummary(user, appId);
  return res.json({ message: "OK", data: summary });
}

export async function generateAIInsights(req: Request, res: Response) {
  const user = req.user;
  const { appId } = req.params;

  const insights = await aiService.generateInsights(user, appId);
  return res.json({ message: "OK", data: insights });
}
