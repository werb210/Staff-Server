import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
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
export async function findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const customFinder = db.findUserByEmail;
    if (typeof customFinder === "function") {
        return customFinder(normalizedEmail);
    }
    const user = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
    });
    return user ?? null;
}
export async function findUserById(id) {
    const customFinder = db.findUserById;
    if (typeof customFinder === "function") {
        return customFinder(id);
    }
    const user = await db.query.users.findFirst({
        where: eq(users.id, id),
    });
    return user ?? null;
}
export function mapAuthenticated(user) {
    return user ? toAuthenticated(user) : null;
}
