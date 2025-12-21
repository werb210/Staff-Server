"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrProcessor = void 0;
const blobService_1 = require("../services/blobService");
class MockProvider {
    async extract(buffer) {
        return buffer.toString("utf-8");
    }
}
class OcrProcessor {
    provider;
    constructor(provider) {
        this.provider = provider ?? new MockProvider();
    }
    async run(request) {
        const buffer = await (0, blobService_1.getFile)(request.blobKey);
        return this.provider.extract(buffer);
    }
}
exports.OcrProcessor = OcrProcessor;
