import { pool } from "../src/db";
import { resolveRequirementsForApplication } from "../src/services/lenderProductRequirementsService";
import { normalizeRequiredDocumentKey } from "../src/db/schema/requiredDocuments";
import {
  ensureApplicationRequiredDocumentDefinition,
  listApplicationRequiredDocuments,
} from "../src/modules/applications/applications.repo";
import {
  advanceProcessingStage,
  normalizeProcessingStage,
} from "../src/modules/applications/processingStage.service";
import { ApplicationStage, isPipelineState } from "../src/modules/applications/pipelineState";

type BackfillOptions = {
  dryRun: boolean;
  verbose: boolean;
};

type ApplicationRow = {
  id: string;
  pipeline_state: string;
  current_stage: string | null;
  processing_stage: string | null;
  product_type: string;
  lender_product_id: string | null;
  requested_amount: number | null;
  metadata: unknown | null;
  ocr_completed_at: Date | null;
  banking_completed_at: Date | null;
  credit_summary_completed_at: Date | null;
  updated_at: Date;
};

function parseArgs(argv: string[]): BackfillOptions {
  const dryRun = argv.includes("--dry-run");
  const verbose = argv.includes("--verbose");
  return { dryRun, verbose };
}

function logVerbose(options: BackfillOptions, message: string, meta?: unknown): void {
  if (!options.verbose) {
    return;
  }
  if (meta) {
    console.log(message, meta);
    return;
  }
  console.log(message);
}

async function backfillApplicationStages(
  app: ApplicationRow,
  options: BackfillOptions
): Promise<void> {
  const pipelineState = isPipelineState(app.pipeline_state)
    ? app.pipeline_state
    : ApplicationStage.RECEIVED;
  const nextCurrentStage = app.current_stage && isPipelineState(app.current_stage)
    ? app.current_stage
    : pipelineState;
  const nextProcessingStage = normalizeProcessingStage(app.processing_stage);

  if (options.dryRun) {
    if (app.pipeline_state !== pipelineState) {
      logVerbose(options, "Would normalize pipeline_state", {
        applicationId: app.id,
        from: app.pipeline_state,
        to: pipelineState,
      });
    }
    if (app.current_stage !== nextCurrentStage) {
      logVerbose(options, "Would backfill current_stage", {
        applicationId: app.id,
        from: app.current_stage,
        to: nextCurrentStage,
      });
    }
    if (app.processing_stage !== nextProcessingStage) {
      logVerbose(options, "Would normalize processing_stage", {
        applicationId: app.id,
        from: app.processing_stage,
        to: nextProcessingStage,
      });
    }
    return;
  }

  if (
    app.pipeline_state !== pipelineState ||
    app.current_stage !== nextCurrentStage ||
    app.processing_stage !== nextProcessingStage
  ) {
    await pool.query(
      `update applications
       set pipeline_state = $2,
           current_stage = $3,
           processing_stage = $4,
           updated_at = now()
       where id = $1`,
      [app.id, pipelineState, nextCurrentStage, nextProcessingStage]
    );
    logVerbose(options, "Backfilled stages", {
      applicationId: app.id,
      pipelineState,
      currentStage: nextCurrentStage,
      processingStage: nextProcessingStage,
    });
  }
}

async function backfillRequiredDocuments(
  app: ApplicationRow,
  options: BackfillOptions
): Promise<void> {
  const { requirements } = await resolveRequirementsForApplication({
    lenderProductId: app.lender_product_id ?? null,
    productType: app.product_type,
    requestedAmount: app.requested_amount ?? null,
    country: null,
  });

  const existing = await listApplicationRequiredDocuments({
    applicationId: app.id,
  });
  const existingKeys = new Set(
    existing.map((entry) => normalizeRequiredDocumentKey(entry.document_category) ?? entry.document_category)
  );

  for (const requirement of requirements) {
    const normalized = normalizeRequiredDocumentKey(requirement.documentType);
    const documentKey = normalized ?? requirement.documentType;
    if (existingKeys.has(documentKey)) {
      continue;
    }
    if (options.dryRun) {
      logVerbose(options, "Would insert required document entry", {
        applicationId: app.id,
        documentKey,
      });
      continue;
    }
    await ensureApplicationRequiredDocumentDefinition({
      applicationId: app.id,
      documentCategory: documentKey,
      isRequired: requirement.required !== false,
    });
    logVerbose(options, "Inserted required document entry", {
      applicationId: app.id,
      documentKey,
    });
  }
}

async function backfillCompletionTimestamps(
  app: ApplicationRow,
  options: BackfillOptions
): Promise<void> {
  const updates: { field: string; value: Date }[] = [];

  if (!app.ocr_completed_at) {
    const res = await pool.query<{ completed_at: Date | null }>(
      `select max(completed_at) as completed_at
       from document_processing_jobs
       where application_id = $1 and status = 'completed'`,
      [app.id]
    );
    const completedAt = res.rows[0]?.completed_at ?? null;
    if (completedAt) {
      updates.push({ field: "ocr_completed_at", value: completedAt });
    }
  }

  if (!app.banking_completed_at) {
    const res = await pool.query<{ completed_at: Date | null }>(
      `select max(completed_at) as completed_at
       from banking_analysis_jobs
       where application_id = $1 and status = 'completed'`,
      [app.id]
    );
    const completedAt = res.rows[0]?.completed_at ?? null;
    if (completedAt) {
      updates.push({ field: "banking_completed_at", value: completedAt });
    }
  }

  if (!app.credit_summary_completed_at) {
    const normalizedStage = normalizeProcessingStage(app.processing_stage);
    if (normalizedStage === "credit_summary_complete" || normalizedStage === "ready_for_lender") {
      updates.push({ field: "credit_summary_completed_at", value: app.updated_at });
    }
  }

  if (updates.length === 0) {
    return;
  }

  if (options.dryRun) {
    logVerbose(options, "Would backfill completion timestamps", {
      applicationId: app.id,
      updates,
    });
    return;
  }

  const fields = updates.map((update, index) => `${update.field} = $${index + 2}`);
  const values = updates.map((update) => update.value);
  await pool.query(
    `update applications
     set ${fields.join(", ")},
         updated_at = now()
     where id = $1`,
    [app.id, ...values]
  );
  logVerbose(options, "Backfilled completion timestamps", {
    applicationId: app.id,
    updates,
  });
}

export async function backfillApplications(
  options: BackfillOptions
): Promise<void> {
  const res = await pool.query<ApplicationRow>(
    `select id, pipeline_state, current_stage, processing_stage, product_type,
            lender_product_id, requested_amount, metadata, ocr_completed_at,
            banking_completed_at, credit_summary_completed_at, updated_at
     from applications`
  );
  for (const app of res.rows) {
    await backfillApplicationStages(app, options);
    await backfillRequiredDocuments(app, options);
    await backfillCompletionTimestamps(app, options);
    if (options.dryRun) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const stage = await advanceProcessingStage({
          applicationId: app.id,
          client,
        });
        await client.query("rollback");
        if (stage !== normalizeProcessingStage(app.processing_stage)) {
          logVerbose(options, "Would recompute processing_stage", {
            applicationId: app.id,
            from: app.processing_stage,
            to: stage,
          });
        }
      } finally {
        client.release();
      }
    } else {
      await advanceProcessingStage({ applicationId: app.id });
    }
  }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await backfillApplications(options);
  await pool.end();
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { parseArgs };
