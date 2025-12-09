import { ApplicationsRepository, OwnerRecord } from "./types";
import { ownerSchema, ownerUpdateSchema } from "./applications.validators";
import { TimelineService } from "./timeline.service";

export class OwnersService {
  constructor(private repo: ApplicationsRepository, private timeline: TimelineService) {}

  async listOwners(applicationId: string) {
    return this.repo.listOwners(applicationId);
  }

  async addOwner(applicationId: string, payload: unknown, actorUserId?: string): Promise<OwnerRecord> {
    const parsed = ownerSchema.parse(payload);
    const owner = await this.repo.createOwner(applicationId, parsed);
    await this.timeline.logEvent(applicationId, "owner_added", { ownerId: owner.id }, actorUserId);
    return owner;
  }

  async updateOwner(
    applicationId: string,
    ownerId: string,
    payload: unknown,
    actorUserId?: string,
  ): Promise<OwnerRecord | null> {
    const parsed = ownerUpdateSchema.parse(payload);
    const updated = await this.repo.updateOwner(ownerId, parsed);
    if (updated) {
      await this.timeline.logEvent(applicationId, "owner_updated", { ownerId: updated.id }, actorUserId);
    }
    return updated;
  }

  async deleteOwner(applicationId: string, ownerId: string, actorUserId?: string) {
    await this.repo.deleteOwner(ownerId);
    await this.timeline.logEvent(applicationId, "owner_removed", { ownerId }, actorUserId);
  }
}
