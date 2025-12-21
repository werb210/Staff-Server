"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const requireAuth_1 = require("../middleware/requireAuth");
const requireRole_1 = require("../middleware/requireRole");
const password_service_1 = require("../services/password.service");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.use((0, requireRole_1.requireRole)("Admin"));
const userSelection = {
    id: schema_1.users.id,
    email: schema_1.users.email,
    firstName: schema_1.users.first_name,
    lastName: schema_1.users.last_name,
    role: schema_1.users.role,
    status: schema_1.users.status,
    companyId: schema_1.users.company_id,
    createdAt: schema_1.users.created_at,
    updatedAt: schema_1.users.updated_at,
    isActive: schema_1.users.is_active,
};
router.get("/", async (_req, res, next) => {
    try {
        const list = await db_1.db.select(userSelection).from(schema_1.users).orderBy(schema_1.users.created_at);
        res.json(list);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const [user] = await db_1.db
            .select(userSelection)
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id))
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
        const passwordHash = await password_service_1.passwordService.hashPassword(password);
        const [created] = await db_1.db
            .insert(schema_1.users)
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
exports.default = router;
