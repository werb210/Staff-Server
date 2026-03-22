"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOcrFieldDefinitions = getOcrFieldDefinitions;
exports.getOcrFieldsForDocumentType = getOcrFieldsForDocumentType;
const ocrFieldRegistry_1 = require("./ocrFieldRegistry");
function getOcrFieldDefinitions() {
    return (0, ocrFieldRegistry_1.getOcrFieldRegistry)();
}
function getOcrFieldsForDocumentType() {
    return (0, ocrFieldRegistry_1.getOcrFieldRegistry)();
}
