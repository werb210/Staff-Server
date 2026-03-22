"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const withTimeout_1 = require("../utils/withTimeout");
const router = (0, express_1.Router)();
router.post("/", async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Email required" });
        return;
    }
    await (0, withTimeout_1.withTimeout)((0, db_1.dbQuery)(`insert into crm_leads (email, source)
       values ($1, 'exit_intent')`, [email]));
    res.json({ success: true });
});
exports.default = router;
