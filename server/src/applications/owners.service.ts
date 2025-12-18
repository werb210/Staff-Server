import { DrizzleApplicationsRepository } from "./applications.repository";
import { TimelineService } from "./timeline.service";
import { ApplicationsRepository } from "./types";

export class OwnersService {
  private repo: ApplicationsRepository;
  private timeline: TimelineService;

  constructor(
    repo: ApplicationsRepository = new DrizzleApplicationsRepository(),
    timeline?: TimelineService,
  ) {
    this.repo = repo;
    this.timeline = timeline ?? new TimelineService(repo);
  }

  private normalizeOwner(payload: any) {
    if (!payload.email) {
      throw new Error("Owner email is required");
    }

    return {
      email: payload.email!,
      firstName: payload.firstName!,
      lastName: payload.lastName!,
      phone: payload.phone!,
      address: payload.address!,
      city: payload.city!,
      state: payload.state!,
      zip: payload.zip!,
      dob: payload.dob!,
      ssn: payload.ssn!,
      ownershipPercentage: payload.ownershipPercentage!,
    };
  }

  async addOwner(applicationId: string, payload: any, actorUserId?: string) {
    const owner = this.normalizeOwner(payload);
    const created = await this.repo.createOwner(applicationId, owner);
    await this.timeline.logEvent(
      applicationId,
      "owner_added",
      { ownerId: created.id },
      actorUserId,
    );
    return created;
  }

  async updateOwner(
    applicationId: string,
    ownerId: string,
    payload: any,
    actorUserId?: string,
  ) {
    const owner = this.normalizeOwner(payload);
    const updated = await this.repo.updateOwner(ownerId, owner);
    if (updated) {
      await this.timeline.logEvent(
        applicationId,
        "owner_updated",
        { ownerId },
        actorUserId,
      );
    }
    return updated;
  }

  async deleteOwner(applicationId: string, ownerId: string, actorUserId?: string) {
    await this.repo.deleteOwner(ownerId);
    await this.timeline.logEvent(
      applicationId,
      "owner_removed",
      { ownerId },
      actorUserId,
    );
  }
}
