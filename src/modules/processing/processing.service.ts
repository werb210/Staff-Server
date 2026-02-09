import { pool } from "../../db";
import { AppError } from "../../middleware/errors";
import { getDocumentTypeAliases } from "../../db/schema/requiredDocuments";
import type { PoolClient } from "pg";

const BANK_STATEMENT_CATEGORY = "bank_statements_6_months";

type Queryable = Pick<PoolClient, "query">;

type DocumentProcessingJobRecord = {
  id: string;
  application_id: string;
  document_id: string;
  status: string;
  created_at: Date;
  completed_at: Date | null;
};

type BankingAnalysisJobRecord = {
  id: string;
  application_id: string;
  status: string;
  created_at: Date;
  completed_at: Date | null;
};


async function lockDocument(params: {
  applicationId: string;
  documentId: string;
  client: Queryable;
}): Promise<void> {
  const res = await params.client.query<{ application_id: string }>(
    "select application_id from documents where id = $1 for update",
    [params.documentId]
  );
  const record = res.rows[0];
  if (!record) {
    throw new AppError("not_found", "Document not found.", 404);
  }
  if (record.application_id !== params.applicationId) {
    throw new AppError("document_mismatch", "Document does not match application.", 400);
  }
}

async function lockApplication(params: {
  applicationId: string;
  client: Queryable;
}): Promise<void> {
  const res = await params.client.query(
    "select id from applications where id = $1 for update",
    [params.applicationId]
  );
  if (res.rows.length === 0) {
    throw new AppError("not_found", "Application not found.", 404);
  }
}

export async function createDocumentProcessingJob(
  applicationId: string,
  documentId: string
): Promise<DocumentProcessingJobRecord> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockDocument({ applicationId, documentId, client });
    const existing = await client.query<DocumentProcessingJobRecord>(
      `select id, application_id, document_id, status, created_at, completed_at
       from document_processing_jobs
       where application_id = $1 and document_id = $2`,
      [applicationId, documentId]
    );
    if (existing.rows.length > 0) {
      await client.query("commit");
      return existing.rows[0];
    }
    const inserted = await client.query<DocumentProcessingJobRecord>(
      `insert into document_processing_jobs
       (application_id, document_id, status)
       values ($1, $2, 'pending')
       returning id, application_id, document_id, status, created_at, completed_at`,
      [applicationId, documentId]
    );
    await client.query("commit");
    return inserted.rows[0];
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function markDocumentProcessingCompleted(
  applicationId: string
): Promise<DocumentProcessingJobRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<DocumentProcessingJobRecord>(
      `select id, application_id, document_id, status, created_at, completed_at
       from document_processing_jobs
       where application_id = $1
       for update`,
      [applicationId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("not_found", "OCR jobs not found.", 404);
    }
    await client.query(
      `update document_processing_jobs
       set status = 'completed', completed_at = now()
       where application_id = $1 and status = 'pending'`,
      [applicationId]
    );
    await client.query(
      `update applications
       set ocr_completed_at = coalesce(ocr_completed_at, now()),
           updated_at = now()
       where id = $1`,
      [applicationId]
    );
    const updated = await client.query<DocumentProcessingJobRecord>(
      `select id, application_id, document_id, status, created_at, completed_at
       from document_processing_jobs
       where application_id = $1`,
      [applicationId]
    );
    await client.query("commit");
    return updated.rows;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function markDocumentProcessingFailed(
  applicationId: string
): Promise<DocumentProcessingJobRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<DocumentProcessingJobRecord>(
      `select id, application_id, document_id, status, created_at, completed_at
       from document_processing_jobs
       where application_id = $1
       for update`,
      [applicationId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("not_found", "OCR jobs not found.", 404);
    }
    await client.query(
      `update document_processing_jobs
       set status = 'failed', completed_at = now()
       where application_id = $1 and status = 'pending'`,
      [applicationId]
    );
    const updated = await client.query<DocumentProcessingJobRecord>(
      `select id, application_id, document_id, status, created_at, completed_at
       from document_processing_jobs
       where application_id = $1`,
      [applicationId]
    );
    await client.query("commit");
    return updated.rows;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function createBankingAnalysisJob(
  applicationId: string
): Promise<BankingAnalysisJobRecord | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockApplication({ applicationId, client });
    const existing = await client.query<BankingAnalysisJobRecord>(
      `select id, application_id, status, created_at, completed_at
       from banking_analysis_jobs
       where application_id = $1`,
      [applicationId]
    );
    if (existing.rows.length > 0) {
      await client.query("commit");
      return existing.rows[0];
    }
    const aliases = getDocumentTypeAliases(BANK_STATEMENT_CATEGORY);
    const countRes = await client.query<{ count: number }>(
      `select count(*)::int as count
       from documents
       where application_id = $1
         and document_type = any($2)
         and status = 'uploaded'`,
      [applicationId, aliases]
    );
    const count = countRes.rows[0]?.count ?? 0;
    if (count < 6) {
      await client.query("commit");
      return null;
    }
    const inserted = await client.query<BankingAnalysisJobRecord>(
      `insert into banking_analysis_jobs
       (application_id, status)
       values ($1, 'pending')
       returning id, application_id, status, created_at, completed_at`,
      [applicationId]
    );
    await client.query("commit");
    return inserted.rows[0];
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function markBankingAnalysisCompleted(
  applicationId: string
): Promise<BankingAnalysisJobRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<BankingAnalysisJobRecord>(
      `select id, application_id, status, created_at, completed_at
       from banking_analysis_jobs
       where application_id = $1
       for update`,
      [applicationId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("not_found", "Banking analysis job not found.", 404);
    }
    const alreadyCompleted = existing.rows.some((row) => row.status === "completed");
    const updatedPending = await client.query<BankingAnalysisJobRecord>(
      `update banking_analysis_jobs
       set status = 'completed', completed_at = now()
       where application_id = $1 and status = 'pending'
       returning id, application_id, status, created_at, completed_at`,
      [applicationId]
    );
    if (updatedPending.rows.length > 0 || alreadyCompleted) {
      await client.query(
        `update applications
         set banking_completed_at = coalesce(banking_completed_at, now()),
             updated_at = now()
         where id = $1`,
        [applicationId]
      );
    }
    const updated = await client.query<BankingAnalysisJobRecord>(
      `select id, application_id, status, created_at, completed_at
       from banking_analysis_jobs
       where application_id = $1`,
      [applicationId]
    );
    await client.query("commit");
    return updated.rows;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function markBankingAnalysisFailed(
  applicationId: string
): Promise<BankingAnalysisJobRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<BankingAnalysisJobRecord>(
      `select id, application_id, status, created_at, completed_at
       from banking_analysis_jobs
       where application_id = $1
       for update`,
      [applicationId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("not_found", "Banking analysis job not found.", 404);
    }
    await client.query(
      `update banking_analysis_jobs
       set status = 'failed', completed_at = now()
       where application_id = $1 and status = 'pending'`,
      [applicationId]
    );
    const updated = await client.query<BankingAnalysisJobRecord>(
      `select id, application_id, status, created_at, completed_at
       from banking_analysis_jobs
       where application_id = $1`,
      [applicationId]
    );
    await client.query("commit");
    return updated.rows;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
