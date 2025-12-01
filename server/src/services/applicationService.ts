// server/src/services/applicationService.ts
import applicationsRepo from '../db/repositories/applications.repo.js';
import pipelineEventsRepo from '../db/repositories/pipelineEvents.repo.js';

declare const broadcast: (payload: any) => void;

//
// ======================================================
//  Resume or Create New In-Progress Application
// ======================================================
//
export async function startOrResume(email: string) {
  const existing = await applicationsRepo.findMany({ applicantEmail: email });
  const ordered = (await existing).sort(
    (a: any, b: any) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime(),
  );

  // If any application is still in-progress, resume it
  const inProgress = ordered.find((a) => a.status === 'in-progress');

  if (inProgress) {
    return {
      applicationId: inProgress.id,
      currentStep: inProgress.currentStep,
      formData: inProgress.formData,
      status: inProgress.status,
    };
  }

  // Otherwise create a new in-progress application
  const created = await applicationsRepo.create({
    applicantEmail: email,
    status: 'in-progress',
    pipelineStage: 'Not Submitted',
    formData: {},
    currentStep: 'step1',
  });

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
  const app = await applicationsRepo.findById(applicationId);

  if (!app) throw new Error('Application not found.');

  // Merge step data into formData
  const existingForm = (app.formData ?? {}) as Record<string, any>;

  const updatedForm = {
    ...existingForm,
    [stepId]: data,
  };

  const updated = await applicationsRepo.update(applicationId, {
    formData: updatedForm,
    currentStep: stepId,
    updatedAt: new Date(),
  });

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
  const app = await applicationsRepo.findById(applicationId);

  if (!app) throw new Error('Application not found.');

  if (app.status === 'submitted') {
    return app; // Already submitted; safe to return
  }

  const now = new Date();

  // Update application
  const submitted = await applicationsRepo.update(applicationId, {
    status: 'submitted',
    pipelineStage: 'Received',
    submittedAt: now,
    updatedAt: now,
  });

  // Create pipeline entry
  await pipelineEventsRepo.create({
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
  return applicationsRepo.findById(applicationId);
}
