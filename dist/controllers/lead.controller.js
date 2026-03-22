"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeads = exports.createLead = void 0;
const uuid_1 = require("uuid");
const leads = [];
const createLead = (req, res) => {
    const body = req.body;
    if (!body.companyName || !body.fullName || !body.email) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const newLead = {
        id: (0, uuid_1.v4)(),
        createdAt: new Date(),
        ...body,
    };
    leads.push(newLead);
    return res.status(201).json({
        success: true,
        leadId: newLead.id,
    });
};
exports.createLead = createLead;
const getLeads = (_req, res) => {
    return res.json(leads);
};
exports.getLeads = getLeads;
