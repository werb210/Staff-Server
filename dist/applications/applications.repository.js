import { asc, eq } from "drizzle-orm";
import { applicantOwners, applicationStatusHistory, applicationTimelineEvents, applications, } from "../db/schema";
import { db } from "../db";
export class DrizzleApplicationsRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async createApplication(data) {
        const [created] = await this.database.insert(applications).values(data).returning();
        return created;
    }
    async updateApplication(id, updates) {
        const [updated] = await this.database
            .update(applications)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(applications.id, id))
            .returning();
        return updated ?? null;
    }
    async findApplicationById(id) {
        const [found] = await this.database.select().from(applications).where(eq(applications.id, id)).limit(1);
        return found ?? null;
    }
    async listApplications() {
        return this.database.select().from(applications).orderBy(asc(applications.createdAt));
    }
    async listOwners(applicationId) {
        return this.database
            .select()
            .from(applicantOwners)
            .where(eq(applicantOwners.applicationId, applicationId))
            .orderBy(asc(applicantOwners.createdAt));
    }
    async createOwner(applicationId, data) {
        const [created] = await this.database
            .insert(applicantOwners)
            .values({ ...data, applicationId })
            .returning();
        return created;
    }
    async updateOwner(ownerId, updates) {
        const [updated] = await this.database
            .update(applicantOwners)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(applicantOwners.id, ownerId))
            .returning();
        return updated ?? null;
    }
    async deleteOwner(ownerId) {
        await this.database.delete(applicantOwners).where(eq(applicantOwners.id, ownerId));
    }
    async addStatusHistory(entry) {
        await this.database.insert(applicationStatusHistory).values(entry);
    }
    async listStatusHistory(applicationId) {
        return this.database
            .select()
            .from(applicationStatusHistory)
            .where(eq(applicationStatusHistory.applicationId, applicationId))
            .orderBy(asc(applicationStatusHistory.timestamp));
    }
    async addTimelineEvent(event) {
        await this.database.insert(applicationTimelineEvents).values(event);
    }
    async listTimeline(applicationId) {
        return this.database
            .select()
            .from(applicationTimelineEvents)
            .where(eq(applicationTimelineEvents.applicationId, applicationId))
            .orderBy(asc(applicationTimelineEvents.timestamp));
    }
}
