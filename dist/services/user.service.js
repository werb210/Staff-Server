"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.mapAuthenticated = mapAuthenticated;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
function toAuthenticated(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.first_name,
        lastName: user.last_name,
    };
}
async function findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const customFinder = db_1.db.findUserByEmail;
    if (typeof customFinder === "function") {
        return customFinder(normalizedEmail);
    }
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail),
    });
    return user ?? null;
}
async function findUserById(id) {
    const customFinder = db_1.db.findUserById;
    if (typeof customFinder === "function") {
        return customFinder(id);
    }
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, id),
    });
    return user ?? null;
}
function mapAuthenticated(user) {
    return user ? toAuthenticated(user) : null;
}
