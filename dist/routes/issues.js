"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const issues = [];
const createIssueSchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
    screenshot: zod_1.z.string().optional(),
});
router.post("/", async (req, res, next) => {
    const parsed = createIssueSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid payload" });
        return;
    }
    const issue = {
        id: (0, uuid_1.v4)(),
        message: parsed.data.message,
        screenshot: parsed.data.screenshot,
        createdAt: new Date(),
        resolved: false,
    };
    issues.push(issue);
    res.json({ success: true, id: issue.id });
});
router.patch("/:id/resolve", (req, res) => {
    const issue = issues.find((entry) => entry.id === req.params.id);
    if (issue)
        issue.resolved = true;
    res.json({ success: true });
});
exports.default = router;
