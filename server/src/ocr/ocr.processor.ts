import { getFile } from "../services/blobService";
import { OcrRequest } from "./ocr.types";

export interface OcrProvider {
  extract(buffer: Buffer): Promise<string>;
}

class MockProvider implements OcrProvider {
  async extract(buffer: Buffer): Promise<string> {
    return buffer.toString("utf-8");
  }
}

export class OcrProcessor {
  private provider: OcrProvider;

  constructor(provider?: OcrProvider) {
    this.provider = provider ?? new MockProvider();
  }

  async run(request: OcrRequest): Promise<string> {
    const buffer = await getFile(request.blobKey);
    return this.provider.extract(buffer);
  }
}
