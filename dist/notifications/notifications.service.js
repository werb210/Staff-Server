"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
class NotificationsService {
    database;
    constructor(database = db_1.db) {
        this.database = database;
    }
    async create(userId, type, payload = {}) {
        const [record] = await this.database
            .insert(schema_1.notifications)
            .values({ userId, type, payloadJson: payload })
            .returning();
        return record;
    }
    async listForUser(userId) {
        return this.database
            .select()
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.notifications.createdAt));
    }
    async markAllRead(userId) {
        await this.database.update(schema_1.notifications).set({ read: true }).where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId));
    }
}
exports.NotificationsService = NotificationsService;
