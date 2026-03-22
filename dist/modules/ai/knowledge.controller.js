"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIKnowledgeController = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const db_1 = require("../../db");
const knowledge_service_1 = require("./knowledge.service");
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({ storage });
const knowledgeDocs = [];
exports.AIKnowledgeController = {
    async upload(req, res) {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }
        const sheetId = (0, uuid_1.v4)();
        knowledgeDocs.push({
            id: sheetId,
            filename: file.originalname,
            buffer: file.buffer,
            uploadedAt: Date.now(),
        });
        const extractedText = file.buffer.toString("utf8").trim();
        if (extractedText.length > 0) {
            await (0, knowledge_service_1.embedAndStore)(db_1.pool, extractedText, "sheet", sheetId);
        }
        res.json({ success: true, sheetId });
    },
    list(_req, res) {
        res.json({
            documents: knowledgeDocs.map((doc) => ({
                id: doc.id,
                filename: doc.filename,
                uploadedAt: doc.uploadedAt,
            })),
        });
    },
};
