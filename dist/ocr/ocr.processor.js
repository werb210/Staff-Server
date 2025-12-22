import { getFile } from "../services/blobService.js";
class MockProvider {
    async extract(buffer) {
        return buffer.toString("utf-8");
    }
}
export class OcrProcessor {
    provider;
    constructor(provider) {
        this.provider = provider ?? new MockProvider();
    }
    async run(request) {
        const buffer = await getFile(request.blobKey);
        return this.provider.extract(buffer);
    }
}
