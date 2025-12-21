// server/src/services/authService.ts
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
export async function verifyUserCredentials(email, password) {
    const result = await db
        .select({
        id: users.id,
        email: users.email,
        role: users.role,
        passwordHash: users.password_hash,
        status: users.status,
        isActive: users.is_active,
        phoneVerified: users.phone_verified,
    })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    const user = result[0];
    if (!user)
        return null;
    const isDisabled = (typeof user.isActive === "boolean" && !user.isActive) ||
        (user.status && user.status !== "active") ||
        (typeof user.phoneVerified === "boolean" && !user.phoneVerified);
    if (isDisabled)
        return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
        return null;
    return {
        id: user.id,
        email: user.email,
        role: user.role,
    };
}
