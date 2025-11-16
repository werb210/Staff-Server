// server/src/services/applicationService.ts
// Application service layer (matches controller names exactly)

export interface ApplicationRecord {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payload?: unknown;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * ----------------------------------------------------
 * LIST ALL APPLICATIONS
 * ----------------------------------------------------
 */
export async function listAllApplications(): Promise<ApplicationRecord[]> {
  return [];
}

/**
 * ----------------------------------------------------
 * CREATE APPLICATION
 * ----------------------------------------------------
 */
export async function createApplicationRecord(
  payload: unknown
): Promise<ApplicationRecord> {
  return {
    id: "TEMP-APP-ID",
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    payload,
  };
}

/**
 * ----------------------------------------------------
 * GET APPLICATION BY ID
 * ----------------------------------------------------
 */
export async function getApplicationRecordById(
  id: string
): Promise<ApplicationRecord | null> {
  return {
    id,
    status: "unknown",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

/**
 * ----------------------------------------------------
 * UPDATE APPLICATION
 * ----------------------------------------------------
 */
export async function updateApplicationRecord(
  id: string,
  payload: unknown
): Promise<ApplicationRecord> {
  return {
    id,
    status: "updated",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    payload,
  };
}

/**
 * ----------------------------------------------------
 * DELETE APPLICATION
 * ----------------------------------------------------
 */
export async function deleteApplicationRecord(
  id: string
): Promise<boolean> {
  void id;
  return true;
}
