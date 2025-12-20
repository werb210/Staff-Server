import { ownerSchema } from "./applications.validators";
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

  private normalizeOwner(payload: unknown) {
    const parsed = ownerSchema.parse(payload);

    return {
      email: parsed.email!,
      firstName: parsed.firstName!,
      lastName: parsed.lastName!,
      phone: parsed.phone!,
      address: parsed.address!,
      city: parsed.city!,
      state: parsed.state!,
      zip: parsed.zip!,
      dob: parsed.dob!,
      ssn: parsed.ssn!,
      ownershipPercentage: parsed.ownershipPercentage!,
    } satisfies Omit<Parameters<ApplicationsRepository["createOwner"]>[1], "applicationId">;
  }

  async addOwner(applicationId: string, payload: unknown, actorUserId?: string) {
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
    payload: unknown,
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
