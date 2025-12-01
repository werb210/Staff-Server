import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import { db } from '../server/src/db/db.js';
import { applications } from '../server/src/db/schema/applications.js';
import { pipelineEvents } from '../server/src/db/schema/pipeline.js';
import { documents } from '../server/src/db/schema/documents.js';
import { documentVersions } from '../server/src/db/schema/documentVersions.js';
import { ocrResults } from '../server/src/db/schema/ocr.js';
import { bankingAnalysis } from '../server/src/db/schema/banking.js';
import { users } from '../server/src/db/schema/users.js';
import { signatures } from '../server/src/db/schema/signatures.js';
import { messages } from '../server/src/db/schema/messages.js';
import { auditLogs } from '../server/src/db/schema/audit.js';

const now = () => new Date();

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (err) {
      console.warn('Invalid JSON encountered, using fallback:', err);
      return fallback;
    }
  }
  return fallback;
};

const toInteger = (value: unknown, fallback: number, min?: number) => {
  const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (Number.isInteger(num) && (min === undefined || num >= min)) return num;
  return fallback;
};

const hasColumn = async (table: string, column: string) => {
  const result = await db.execute(
    sql`SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column} LIMIT 1`,
  );
  return result.rows.length > 0;
};

const findContactEmail = async (applicationId: string) => {
  const contactEntries = await db.execute(
    sql`SELECT details FROM audit_logs WHERE event_type = 'contact' AND details ->> 'applicationId' = ${applicationId} LIMIT 1`,
  );
  if (contactEntries.rows.length === 0) return '';
  const details = contactEntries.rows[0].details as Record<string, unknown> | null;
  if (!details) return '';
  const email = (details.email ?? details.applicantEmail ?? details.applicant_email) as string | undefined;
  return email ?? '';
};

const reconcileApplications = async () => {
  console.log('Reconciling applications...');
  const rows = await db.select().from(applications);

  for (const row of rows) {
    const updates: Partial<typeof applications.$inferInsert> = {};

    if (!row.pipelineStage) updates.pipelineStage = 'requires_docs';
    if (!row.status) updates.status = 'pending';

    const formData = parseJson(row.formData, {} as Record<string, unknown>);
    if (formData !== row.formData) updates.formData = formData;

    if (row.currentStep === null || row.currentStep === undefined) {
      updates.currentStep = '1' as any;
    }

    if (!row.applicantEmail) {
      const inferred = await findContactEmail(row.id);
      updates.applicantEmail = inferred ?? '';
    }

    if (Object.keys(updates).length > 0) {
      await db.update(applications).set(updates).where(eq(applications.id, row.id));
      console.log(`Updated application ${row.id}`, updates);
    }
  }
};

const reconcilePipelineEvents = async () => {
  console.log('Reconciling pipeline_events...');
  const rows = await db.select().from(pipelineEvents);
  for (const row of rows) {
    const updates: Partial<typeof pipelineEvents.$inferInsert> = {};
    if (!row.stage) updates.stage = 'requires_docs';
    if (row.reason === null || row.reason === undefined) updates.reason = '';
    if (!row.createdAt || Number.isNaN(new Date(row.createdAt).getTime())) updates.createdAt = now();

    if (Object.keys(updates).length > 0) {
      await db.update(pipelineEvents).set(updates).where(eq(pipelineEvents.id, row.id));
      console.log(`Updated pipeline_event ${row.id}`, updates);
    }
  }
};

const reconcileDocuments = async () => {
  console.log('Reconciling documents...');
  const rows = await db.select().from(documents);
  for (const row of rows) {
    const updates: Partial<typeof documents.$inferInsert> = {};
    if (!row.category) updates.category = 'other';
    if (!row.mimeType) updates.mimeType = 'application/pdf';
    if (!row.azureBlobKey) updates.azureBlobKey = '';
    if (row.checksum === null || row.checksum === undefined) updates.checksum = '';

    const size = toInteger(row.sizeBytes, 0, 0);
    if (size !== row.sizeBytes) updates.sizeBytes = size;

    if (!row.status) updates.status = 'pending';
    if (row.rejectionReason === null || row.rejectionReason === undefined) updates.rejectionReason = '';

    if (Object.keys(updates).length > 0) {
      await db.update(documents).set(updates).where(eq(documents.id, row.id));
      console.log(`Updated document ${row.id}`, updates);
    }
  }
};

const reconcileDocumentVersions = async () => {
  console.log('Reconciling document_versions...');
  const rows = await db.select().from(documentVersions);
  for (const row of rows) {
    const updates: Partial<typeof documentVersions.$inferInsert> = {};

    const versionNumber = toInteger(row.versionNumber, 1, 1);
    if (versionNumber !== row.versionNumber) updates.versionNumber = versionNumber;

    if (!row.azureBlobKey) updates.azureBlobKey = '';
    if (row.checksum === null || row.checksum === undefined) updates.checksum = '';

    const size = toInteger(row.sizeBytes, 0, 0);
    if (size !== row.sizeBytes) updates.sizeBytes = size;

    if (Object.keys(updates).length > 0) {
      await db.update(documentVersions).set(updates).where(eq(documentVersions.id, row.id));
      console.log(`Updated document_version ${row.id}`, updates);
    }
  }
};

const reconcileOcrResults = async () => {
  console.log('Reconciling ocr_results...');
  const rows = await db.select().from(ocrResults);
  for (const row of rows) {
    const updates: Partial<typeof ocrResults.$inferInsert> = {};
    const fields = parseJson(row.fields, {} as Record<string, unknown>);
    if (fields !== row.fields) updates.fields = fields;
    if (!row.docType) updates.docType = '';
    if (!row.createdAt || Number.isNaN(new Date(row.createdAt).getTime())) updates.createdAt = now();

    if (Object.keys(updates).length > 0) {
      await db.update(ocrResults).set(updates).where(eq(ocrResults.id, row.id));
      console.log(`Updated ocr_result ${row.id}`, updates);
    }
  }
};

const reconcileBankingAnalysis = async () => {
  console.log('Reconciling banking_analysis...');
  const rows = await db.select().from(bankingAnalysis);
  for (const row of rows) {
    const updates: Partial<typeof bankingAnalysis.$inferInsert> = {};
    const data = parseJson(row.data, {} as Record<string, unknown>);
    if (data !== row.data) updates.data = data;
    if (!row.createdAt || Number.isNaN(new Date(row.createdAt).getTime())) updates.createdAt = now();

    if (Object.keys(updates).length > 0) {
      await db.update(bankingAnalysis).set(updates).where(eq(bankingAnalysis.id, row.id));
      console.log(`Updated banking_analysis ${row.id}`, updates);
    }
  }
};

const reconcileUsers = async () => {
  console.log('Reconciling users...');
  const passwordColumnExists = await hasColumn('users', 'password');
  const rows = await db.select().from(users);
  for (const row of rows) {
    const updates: Partial<typeof users.$inferInsert> = {};
    let legacyPassword: string | null = null;

    if (passwordColumnExists) {
      const legacyResult = await db.execute(
        sql`SELECT password FROM users WHERE id = ${row.id} LIMIT 1`,
      );
      legacyPassword = (legacyResult.rows[0] as { password?: string } | undefined)?.password ?? null;
    }

    if (!row.passwordHash) updates.passwordHash = legacyPassword ?? '';

    const siloAccess = parseJson(row.siloAccess, {} as Record<string, unknown>);
    if (siloAccess !== row.siloAccess) updates.siloAccess = siloAccess;

    if (!row.createdAt || Number.isNaN(new Date(row.createdAt).getTime())) updates.createdAt = now();
    if (!row.updatedAt || Number.isNaN(new Date(row.updatedAt).getTime())) updates.updatedAt = now();

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, row.id));
      console.log(`Updated user ${row.id}`, updates);
    }
  }
};

const reconcileSignatures = async () => {
  console.log('Reconciling signatures...');
  const rows = await db.select().from(signatures);
  for (const row of rows) {
    const updates: Partial<typeof signatures.$inferInsert> = {};
    if (!row.signNowDocumentId) updates.signNowDocumentId = '';
    if (!row.signedBlobKey) updates.signedBlobKey = '';

    if (Object.keys(updates).length > 0) {
      await db.update(signatures).set(updates).where(eq(signatures.id, row.id));
      console.log(`Updated signature ${row.id}`, updates);
    }
  }
};

const reconcileMessages = async () => {
  console.log('Reconciling messages...');
  const rows = await db.select().from(messages);
  for (const row of rows) {
    const updates: Partial<typeof messages.$inferInsert> = {};
    if (!row.sender) updates.sender = '';
    if (!row.body) updates.body = '';

    const attachments = parseJson(row.attachments, [] as unknown[]);
    if (attachments !== row.attachments) updates.attachments = attachments as any;

    if (Object.keys(updates).length > 0) {
      await db.update(messages).set(updates).where(eq(messages.id, row.id));
      console.log(`Updated message ${row.id}`, updates);
    }
  }
};

const reconcileAuditLogs = async () => {
  console.log('Reconciling audit_logs...');
  const rows = await db.select().from(auditLogs);
  for (const row of rows) {
    const updates: Partial<typeof auditLogs.$inferInsert> = {};
    if (!row.eventType) updates.eventType = '';
    const details = parseJson(row.details, {} as Record<string, unknown>);
    if (details !== row.details) updates.details = details;
    if (!row.createdAt || Number.isNaN(new Date(row.createdAt).getTime())) updates.createdAt = now();

    if (Object.keys(updates).length > 0) {
      await db.update(auditLogs).set(updates).where(eq(auditLogs.id, row.id));
      console.log(`Updated audit_log ${row.id}`, updates);
    }
  }
};

const main = async () => {
  try {
    await reconcileApplications();
    await reconcilePipelineEvents();
    await reconcileDocuments();
    await reconcileDocumentVersions();
    await reconcileOcrResults();
    await reconcileBankingAnalysis();
    await reconcileUsers();
    await reconcileSignatures();
    await reconcileMessages();
    await reconcileAuditLogs();
    console.log('Data reconciliation complete.');
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exitCode = 1;
  }
};

main();
