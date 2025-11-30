import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { auditLogs } from '../db/schema/audit.js';
import { eq } from 'drizzle-orm';

export async function getApplicationAudit(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.applicationId, applicationId))
      .orderBy(auditLogs.createdAt);

    return res.status(200).json(logs);
  } catch (err: any) {
    console.error("getApplicationAudit error →", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getSystemAudit(req: Request, res: Response) {
  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.createdAt)
      .limit(5000);

    return res.status(200).json(logs);
  } catch (err: any) {
    console.error("getSystemAudit error →", err);
    return res.status(500).json({ error: err.message });
  }
}
