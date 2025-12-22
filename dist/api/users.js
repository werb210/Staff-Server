import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { passwordService } from "../services/password.service.js";
const router = Router();
router.use(requireAuth);
router.use(requireRole("Admin"));
const userSelection = {
    id: users.id,
    email: users.email,
    firstName: users.first_name,
    lastName: users.last_name,
    role: users.role,
    status: users.status,
    companyId: users.company_id,
    createdAt: users.created_at,
    updatedAt: users.updated_at,
    isActive: users.is_active,
};
router.get("/", async (_req, res, next) => {
    try {
        const list = await db.select(userSelection).from(users).orderBy(users.created_at);
        res.json(list);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const [user] = await db
            .select(userSelection)
            .from(users)
            .where(eq(users.id, req.params.id))
            .limit(1);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
router.post("/", async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const passwordHash = await passwordService.hashPassword(password);
        const [created] = await db
            .insert(users)
            .values({
            email: email.trim().toLowerCase(),
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
        })
            .returning(userSelection);
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
export default router;
