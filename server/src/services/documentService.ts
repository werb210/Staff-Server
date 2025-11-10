// Auto-generated stub by Codex
// Stub document service with minimal helpers

export type DocumentRecord = {
  id: string;
  name: string;
};

class DocumentService {
  listDocuments(): DocumentRecord[] {
    return [{ id: "doc-1", name: "Stub Document" }];
  }

  uploadDocument(): DocumentRecord {
    return { id: "doc-1", name: "Uploaded" };
  }
}

export const documentService = new DocumentService();
