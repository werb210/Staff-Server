"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_controller_1 = require("../controllers/lead.controller");
const router = (0, express_1.Router)();
router.post("/crm/lead", lead_controller_1.createLead);
router.get("/crm/lead", lead_controller_1.getLeads);
exports.default = router;
