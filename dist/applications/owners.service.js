"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnersService = void 0;
const applications_validators_1 = require("./applications.validators");
const applications_repository_1 = require("./applications.repository");
const timeline_service_1 = require("./timeline.service");
class OwnersService {
    repo;
    timeline;
    constructor(repo = new applications_repository_1.DrizzleApplicationsRepository(), timeline) {
        this.repo = repo;
        this.timeline = timeline ?? new timeline_service_1.TimelineService(repo);
    }
    normalizeOwner(payload) {
        const parsed = applications_validators_1.ownerSchema.parse(payload);
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
exports.OwnersService = OwnersService;
