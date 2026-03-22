"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLenderWithProducts = exports.updateLender = exports.createLender = exports.getLenderById = exports.getLenders = void 0;
const lender_service_1 = require("../services/lenders/lender.service");
const lender_validation_1 = require("../validation/lender.validation");
const getLenders = async (_req, res) => {
    const data = await lender_service_1.lenderService.list();
    res.json({ success: true, data });
};
exports.getLenders = getLenders;
const getLenderById = async (req, res) => {
    const data = await lender_service_1.lenderService.getById(String(req.params.id));
    res.json({ success: true, data });
};
exports.getLenderById = getLenderById;
const createLender = async (req, res) => {
    const parsed = lender_validation_1.createLenderSchema.parse(req.body);
    const data = await lender_service_1.lenderService.create(parsed);
    res.json({ success: true, data });
};
exports.createLender = createLender;
const updateLender = async (req, res) => {
    const data = await lender_service_1.lenderService.update(String(req.params.id), req.body);
    res.json({ success: true, data });
};
exports.updateLender = updateLender;
const getLenderWithProducts = async (req, res) => {
    const data = await lender_service_1.lenderService.getWithProducts(String(req.params.id));
    res.json({ success: true, data });
};
exports.getLenderWithProducts = getLenderWithProducts;
