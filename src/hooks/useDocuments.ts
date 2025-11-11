import { useCallback, useEffect, useState } from "react";
import {
  getDocumentDownloadUrl,
  getDocumentVersions,
  listDocuments,
  updateDocumentStatus,
  uploadDocument,
} from "../api/documents";
import { ApplicationDocument, DocumentUploadInput, DocumentVersion } from "../types/api";

export function useDocuments(applicationId?: string) {
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listDocuments(applicationId);
      setDocuments(data);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load documents.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadDocument = useCallback(
    async (payload: DocumentUploadInput) => {
      const result = await uploadDocument(payload);
      setDocuments((prev) => [result.metadata, ...prev.filter((doc) => doc.id !== result.metadata.id)]);
      return result;
    },
    [],
  );

  const updateStatus = useCallback(async (id: string, status: string) => {
    const updated = await updateDocumentStatus(id, status);
    setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
    return updated;
  }, []);

  const getVersions = useCallback(async (id: string): Promise<DocumentVersion[]> => {
    return getDocumentVersions(id);
  }, []);

  const getDownloadUrl = useCallback(async (id: string, version?: number) => {
    return getDocumentDownloadUrl(id, version);
  }, []);

  return {
    documents,
    loading,
    error,
    refresh,
    uploadDocument,
    updateStatus,
    getVersions,
    getDownloadUrl,
  };
}

export type UseDocumentsReturn = ReturnType<typeof useDocuments>;
