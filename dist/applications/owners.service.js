import { ownerSchema } from "./applications.validators";
import { DrizzleApplicationsRepository } from "./applications.repository";
import { TimelineService } from "./timeline.service";
export class OwnersService {
    repo;
    timeline;
    constructor(repo = new DrizzleApplicationsRepository(), timeline) {
        this.repo = repo;
        this.timeline = timeline ?? new TimelineService(repo);
    }
    normalizeOwner(payload) {
        const parsed = ownerSchema.parse(payload);
        return {
            email: parsed.email,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            phone: parsed.phone,
            address: parsed.address,
            city: parsed.city,
            state: parsed.state,
            zip: parsed.zip,
            dob: parsed.dob,
            ssn: parsed.ssn,
            ownershipPercentage: parsed.ownershipPercentage,
        };
    }
    async addOwner(applicationId, payload, actorUserId) {
        const owner = this.normalizeOwner(payload);
        const created = await this.repo.createOwner(applicationId, owner);
        await this.timeline.logEvent(applicationId, "owner_added", { ownerId: created.id }, actorUserId);
        return created;
    }
    async updateOwner(applicationId, ownerId, payload, actorUserId) {
        const owner = this.normalizeOwner(payload);
        const updated = await this.repo.updateOwner(ownerId, owner);
        if (updated) {
            await this.timeline.logEvent(applicationId, "owner_updated", { ownerId }, actorUserId);
        }
        return updated;
    }
    async deleteOwner(applicationId, ownerId, actorUserId) {
        await this.repo.deleteOwner(ownerId);
        await this.timeline.logEvent(applicationId, "owner_removed", { ownerId }, actorUserId);
    }
}
