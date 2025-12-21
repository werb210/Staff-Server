"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleApplicationsRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const db_1 = require("../db");
class DrizzleApplicationsRepository {
    database;
    constructor(database = db_1.db) {
        this.database = database;
    }
    async createApplication(data) {
        const [created] = await this.database.insert(schema_1.applications).values(data).returning();
        return created;
    }
    async updateApplication(id, updates) {
        const [updated] = await this.database
            .update(schema_1.applications)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, id))
            .returning();
        return updated ?? null;
    }
    async findApplicationById(id) {
        const [found] = await this.database.select().from(schema_1.applications).where((0, drizzle_orm_1.eq)(schema_1.applications.id, id)).limit(1);
        return found ?? null;
    }
    async listApplications() {
        return this.database.select().from(schema_1.applications).orderBy((0, drizzle_orm_1.asc)(schema_1.applications.createdAt));
    }
    async listOwners(applicationId) {
        return this.database
            .select()
            .from(schema_1.applicantOwners)
            .where((0, drizzle_orm_1.eq)(schema_1.applicantOwners.applicationId, applicationId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.applicantOwners.createdAt));
    }
    async createOwner(applicationId, data) {
        const [created] = await this.database
            .insert(schema_1.applicantOwners)
            .values({ ...data, applicationId })
            .returning();
        return created;
    }
    async updateOwner(ownerId, updates) {
        const [updated] = await this.database
            .update(schema_1.applicantOwners)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.applicantOwners.id, ownerId))
            .returning();
        return updated ?? null;
    }
    async deleteOwner(ownerId) {
        await this.database.delete(schema_1.applicantOwners).where((0, drizzle_orm_1.eq)(schema_1.applicantOwners.id, ownerId));
    }
    async addStatusHistory(entry) {
        await this.database.insert(schema_1.applicationStatusHistory).values(entry);
    }
    async listStatusHistory(applicationId) {
        return this.database
            .select()
            .from(schema_1.applicationStatusHistory)
            .where((0, drizzle_orm_1.eq)(schema_1.applicationStatusHistory.applicationId, applicationId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.applicationStatusHistory.timestamp));
    }
    async addTimelineEvent(event) {
        await this.database.insert(schema_1.applicationTimelineEvents).values(event);
    }
    async listTimeline(applicationId) {
        return this.database
            .select()
            .from(schema_1.applicationTimelineEvents)
            .where((0, drizzle_orm_1.eq)(schema_1.applicationTimelineEvents.applicationId, applicationId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.applicationTimelineEvents.timestamp));
    }
}
exports.DrizzleApplicationsRepository = DrizzleApplicationsRepository;
