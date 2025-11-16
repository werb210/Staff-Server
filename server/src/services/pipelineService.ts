// server/src/services/pipelineService.ts

export interface PipelineStatus {
  status: string;
  timestamp: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * ----------------------------------------------------
 * GET PIPELINE STATUS
 * ----------------------------------------------------
 */
export async function getPipelineStatusService(): Promise<PipelineStatus> {
  return {
    status: "ok",
    timestamp: nowIso(),
  };
}
