import { Router } from "express";
import { db } from "../db";
import { applications, lenders, tasks, calendarEvents } from "../db/schema";

const router = Router();

/**
 * GET /api/applications?stage=new
 */
router.get("/applications", async (req, res) => {
  const stage = req.query.stage as string | undefined;

  const results = await db.query.applications.findMany({
    where: stage
      ? (app, { eq }) => eq(app.stage, stage)
      : undefined,
    orderBy: (app, { desc }) => desc(app.createdAt),
  });

  res.json(results);
});

/**
 * GET /api/lenders
 */
router.get("/lenders", async (_req, res) => {
  const results = await db.query.lenders.findMany();
  res.json(results);
});

/**
 * GET /api/tasks
 */
router.get("/tasks", async (_req, res) => {
  const results = await db.query.tasks.findMany({
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
  res.json(results);
});

/**
 * GET /api/calendar/events
 */
router.get("/calendar/events", async (_req, res) => {
  const results = await db.query.calendarEvents.findMany({
    orderBy: (e, { asc }) => asc(e.startTime),
  });
  res.json(results);
});

export default router;
