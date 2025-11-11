import { request } from "./http";
import {
  ApplicationDocument,
  DocumentUploadInput,
  DocumentVersion,
} from "../types/api";

export const listDocuments = (applicationId?: string) =>
  request<ApplicationDocument[]>({
    url: "/api/documents",
    method: "GET",
    params: applicationId ? { applicationId } : undefined,
  });

const saveDocument = (payload: DocumentUploadInput) =>
  request<ApplicationDocument>({
    url: "/api/documents",
    method: "POST",
    data: {
      id: payload.documentId,
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      contentType: payload.contentType ?? "application/pdf",
      uploadedBy: payload.uploadedBy ?? "staff.app",
      note: payload.note,
    },
  });

const createUploadUrl = (id: string, fileName: string) =>
  request<{ uploadUrl: string; expiresAt: string }>({
    url: `/api/documents/${id}/upload-url`,
    method: "POST",
    data: { fileName },
  });

export const uploadDocument = async (payload: DocumentUploadInput) => {
  const metadata = await saveDocument(payload);
  const upload = await createUploadUrl(metadata.id, payload.fileName);
  return { metadata, upload };
};

export const updateDocumentStatus = (id: string, status: string) =>
  request<ApplicationDocument>({
    url: `/api/documents/${id}/status`,
    method: "POST",
    data: { status },
  });

export const getDocumentVersions = (id: string) =>
  request<DocumentVersion[]>({
    url: `/api/documents/${id}/versions`,
    method: "GET",
  });

export const getDocumentDownloadUrl = (id: string, version?: number) =>
  request<{ sasUrl: string; version: number }>({
    url: `/api/documents/${id}/download`,
    method: "GET",
    params: version ? { version } : undefined,
  });

export const getDocumentStatus = (id: string) =>
  request<{ id: string; status: string; version: number; lastUpdatedAt: string }>({
    url: `/api/documents/${id}/status`,
    method: "GET",
  });
