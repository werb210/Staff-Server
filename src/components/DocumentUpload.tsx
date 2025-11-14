import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useDocuments } from "../hooks/useDocuments";
import type { DocumentStatus, DocumentUploadInput } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

interface UploadState {
  file?: File;
  documentType: string;
  applicationId: string;
}

export function DocumentUpload({ applicationId }: { applicationId?: string }) {
  const { documents, uploadDocument: uploadDocumentMutation, loading, error, refresh } =
    useDocuments(applicationId);
  const [uploadState, setUploadState] = useState<UploadState>({
    documentType: "Identification",
    applicationId: applicationId ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isReady = useMemo(
    () => Boolean(uploadState.file && uploadState.applicationId && uploadState.documentType),
    [uploadState]
  );

  useEffect(() => {
    if (applicationId) {
      setUploadState((prev) => ({ ...prev, applicationId }));
    }
  }, [applicationId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    setUploadState((prev) => ({ ...prev, file }));
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const base64 = result.split(",")[1] ?? result;
          resolve(base64);
        } else {
          reject(new Error("Unable to parse file."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const simulateProgress = () => {
    setProgress(0);
    const increments = [10, 30, 55, 75, 90, 100];
    increments.forEach((value, index) => {
      setTimeout(() => setProgress(value), (index + 1) * 120);
    });
  };

  const generateDocumentId = () => {
    const globalCrypto =
      typeof globalThis !== "undefined"
        ? ((globalThis as typeof globalThis & { crypto?: Crypto }).crypto ?? undefined)
        : undefined;
    if (globalCrypto?.randomUUID) {
      return globalCrypto.randomUUID();
    }
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `doc-${Math.random().toString(36).slice(2, 10)}`;
  };

  const handleUpload = async () => {
    if (!uploadState.file || !uploadState.applicationId) return;
    setLocalError(null);
    setSuccess(null);
    setUploading(true);
    simulateProgress();

    try {
      const payload: DocumentUploadInput = {
        applicationId: uploadState.applicationId,
        documentId: generateDocumentId(),
        documentType: uploadState.documentType,
        fileName: uploadState.file.name,
        contentType: uploadState.file.type || "application/octet-stream",
        fileContent: await readFileAsBase64(uploadState.file),
        note: uploadState.documentType,
        uploadedBy: "staff.user",
      };

      const result = await uploadDocumentMutation(payload);
      setSuccess(`Upload ready. Use SAS URL before ${new Date(result.upload.expiresAt).toLocaleTimeString()}.`);
      setUploadState((prev) => ({ ...prev, file: undefined }));
      await refresh();
    } catch (err) {
      const message =
        ((err as { data?: { errors?: string[]; message?: string } }).data?.errors?.[0] ??
          (err as { message?: string })?.message ??
          "Failed to upload document.");
      setLocalError(message);
    } finally {
      setUploading(false);
    }
  };

  const statusColor: Record<DocumentStatus, string> = {
    PENDING: "info",
    ACCEPTED: "success",
    REJECTED: "error",
  };

  const formatStatus = (status: DocumentStatus) =>
    status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <section className="card">
      <header className="card-header">
        <h2>Document Upload</h2>
        <p>Upload applicant documents and track their processing status.</p>
      </header>

      {(error || localError) && <div className="error">{error ?? localError}</div>}
      {success && <div className="success">{success}</div>}
      {loading && <div className="loading">Loading documents…</div>}

      <div className="form-step">
        <div className="grid">
          <label>
            Application ID
            <input
              type="text"
              value={uploadState.applicationId}
              onChange={(event) =>
                setUploadState((prev) => ({ ...prev, applicationId: event.target.value }))
              }
              placeholder="APP-1234"
            />
          </label>
          <label>
            Document Type
            <select
              value={uploadState.documentType}
              onChange={(event) =>
                setUploadState((prev) => ({ ...prev, documentType: event.target.value }))
              }
            >
              <option value="Identification">Identification</option>
              <option value="Income Verification">Income Verification</option>
              <option value="Bank Statements">Bank Statements</option>
              <option value="Credit Report">Credit Report</option>
            </select>
          </label>
          <label>
            File
            <input type="file" onChange={handleFileChange} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="primary" onClick={handleUpload} disabled={!isReady || uploading}>
            {uploading ? `Uploading ${progress}%` : "Upload"}
          </button>
        </div>
      </div>

      {documents.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Version</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded At</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.fileName}</td>
                <td>{doc.version}</td>
                <td>{doc.documentType ?? doc.note ?? "—"}</td>
                <td>
                  <span className={`badge ${statusColor[doc.status] ?? "info"}`}>
                    {formatStatus(doc.status)}
                  </span>
                </td>
                <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                <td>
                  {doc.sasUrl ? (
                    <a href={doc.sasUrl} target="_blank" rel="noreferrer">
                      SAS Link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default DocumentUpload;
