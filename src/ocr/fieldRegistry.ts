import { getOcrFieldRegistry, type OcrFieldDefinition } from "./ocrFieldRegistry";

export type { OcrFieldDefinition };

export function getOcrFieldDefinitions(): OcrFieldDefinition[] {
  return getOcrFieldRegistry();
}

export function getOcrFieldsForDocumentType(): OcrFieldDefinition[] {
  return getOcrFieldRegistry();
}
