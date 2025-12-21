import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { closeDatabase, db } from "../db";
import { users } from "../db/schema";
async function run() {
    const password = process.env.ADMIN_RESET_PASSWORD;
    const targetEmail = (process.env.TARGET_EMAIL ?? "admin@boreal.financial").trim().toLowerCase();
    if (!password) {
        throw new Error("ADMIN_RESET_PASSWORD is required in the environment");
    }
    const password_hash = await bcrypt.hash(password, 12);
    const updated = await db
        .update(users)
        .set({ password_hash })
        .where(eq(users.email, targetEmail))
        .returning({ id: users.id, email: users.email });
    if (!updated || updated.length === 0) {
        throw new Error(`No user found for ${targetEmail}`);
    }
}
let exitCode = 0;
run()
    .then(() => {
    console.log("Admin password reset OK");
})
    .catch((error) => {
    console.error("Failed to reset admin password", error);
    exitCode = 1;
})
    .finally(async () => {
    await closeDatabase().catch(() => undefined);
    process.exit(exitCode);
});
