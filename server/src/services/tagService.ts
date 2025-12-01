// ============================================================================
// server/src/services/tagService.ts
// BLOCK 28 — Tag management service (Drizzle-backed)
// ============================================================================

import auditLogsRepo from "../db/repositories/auditLogs.repo.js";

const mapTag = (record: any) => {
  if (!record || record.eventType !== "tag") return null;
  const details = record.details ?? {};
  return {
    id: record.id,
    name: details.name,
    color: details.color ?? null,
  };
};

const tagService = {
  /**
   * Get all tags in the system (alias for list)
   */
  async getAll() {
    return this.list();
  },

  /**
   * List all tags
   */
  async list() {
    const records = await auditLogsRepo.findMany({ eventType: "tag" } as any);
    return (records as any[]).map(mapTag).filter(Boolean);
  },

  /**
   * Get a single tag
   */
  async get(tagId: string) {
    const record = await auditLogsRepo.findById(tagId);
    return mapTag(record);
  },

  /**
   * Create tag
   */
  async create(name: string, color: string | null = null) {
    if (!name) throw new Error("Tag name is required");

    const created = await auditLogsRepo.create({
      eventType: "tag",
      details: { name, color },
    } as any);

    return mapTag(created);
  },

  /**
   * Update tag
   */
  async update(tagId: string, data: { name?: string; color?: string | null }) {
    const existing = await auditLogsRepo.findById(tagId);
    const merged = { ...(existing as any)?.details, ...data };
    const updated = await auditLogsRepo.update(tagId, { details: merged } as any);
    return mapTag(updated);
  },

  /**
   * Delete a tag
   */
  async remove(tagId: string) {
    const deleted = await auditLogsRepo.delete(tagId);
    return mapTag(deleted);
  },

  /**
   * Attach a tag to an application
   */
  async attachToApplication(tagId: string, applicationId: string) {
    await auditLogsRepo.create({
      eventType: "tag-attach",
      applicationId,
      details: { tagId },
    } as any);
    return { tagId, applicationId };
  },

  /**
   * Remove a tag from an application
   */
  async detachFromApplication(tagId: string, applicationId: string) {
    await auditLogsRepo.create({
      eventType: "tag-detach",
      applicationId,
      details: { tagId },
    } as any);
    return { tagId, applicationId };
  },

  /**
   * Get tags for an application
   */
  async listForApplication(appId: string) {
    const events = await auditLogsRepo.findMany({ applicationId: appId } as any);
    const attached = events.filter((e: any) => e.eventType === "tag-attach");
    return attached.map((e: any) => ({ tagId: e.details?.tagId, applicationId: appId }));
  },
};

export default tagService;

// ============================================================================
// END OF FILE
// ============================================================================
