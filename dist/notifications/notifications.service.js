import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";
export class NotificationsService {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async create(userId, type, payload = {}) {
        const [record] = await this.database
            .insert(notifications)
            .values({ userId, type, payloadJson: payload })
            .returning();
        return record;
    }
    async listForUser(userId) {
        return this.database
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(asc(notifications.createdAt));
    }
    async markAllRead(userId) {
        await this.database.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
    }
}
