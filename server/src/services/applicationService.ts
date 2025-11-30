// server/src/services/applicationService.ts
import { db } from '../db/db.js';
import { applications } from '../db/schema/applications.js';
import { pipelineEvents } from '../db/schema/pipeline.js';
import { asc, eq } from 'drizzle-orm';

declare const broadcast: (payload: any) => void;

//
// ======================================================
//  Resume or Create New In-Progress Application
// ======================================================
//
export async function startOrResume(email: string) {
  const existing = await db
    .select()
    .from(applications)
    .where(eq(applications.applicantEmail, email))
    .orderBy(asc(applications.createdAt));

  // If any application is still in-progress, resume it
  const inProgress = existing.find((a) => a.status === 'in-progress');

  if (inProgress) {
    return {
      applicationId: inProgress.id,
      currentStep: inProgress.currentStep,
      formData: inProgress.formData,
      status: inProgress.status,
    };
  }

  // Otherwise create a new in-progress application
  const [created] = await db
    .insert(applications)
    .values({
      applicantEmail: email,
      status: 'in-progress',
      pipelineStage: 'Not Submitted',
      formData: {},
      currentStep: 'step1',
    })
    .returning();

  return {
    applicationId: created.id,
    currentStep: created.currentStep,
    formData: created.formData,
    status: created.status,
  };
}

//
// ======================================================
//  Update a Single Step
// ======================================================
//
export async function updateStep(applicationId: string, stepId: string, data: any) {
  // Fetch application
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!app) throw new Error('Application not found.');

  // Merge step data into formData
  const existingForm = (app.formData ?? {}) as Record<string, any>;

  const updatedForm = {
    ...existingForm,
    [stepId]: data,
  };

  const [updated] = await db
    .update(applications)
    .set({
      formData: updatedForm,
      currentStep: stepId,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning();

  return {
    applicationId: updated.id,
    currentStep: updated.currentStep,
    formData: updated.formData,
  };
}

//
// ======================================================
//  Submit Application
// ======================================================
//
export async function submit(applicationId: string) {
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!app) throw new Error('Application not found.');

  if (app.status === 'submitted') {
    return app; // Already submitted; safe to return
  }

  const now = new Date();

  // Update application
  const [submitted] = await db
    .update(applications)
    .set({
      status: 'submitted',
      pipelineStage: 'Received',
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(applications.id, applicationId))
    .returning();

  // Create pipeline entry
  await db.insert(pipelineEvents).values({
    applicationId,
    stage: 'Received',
    reason: 'Application submitted by client',
  });

  // Push real-time update to client dashboard
  broadcast({
    type: 'pipeline-update',
    applicationId,
    stage: 'Received',
  });

  return submitted;
}

//
// ======================================================
//  Fetch Application
// ======================================================
//
export async function get(applicationId: string) {
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  return app || null;
}
