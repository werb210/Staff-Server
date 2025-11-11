import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../api";
import type { ApplicationDocument } from "../types/api";

interface DocumentFormState {
  applicationId: string;
  documentId: string;
  fileName: string;
}

const initialDocumentForm: DocumentFormState = {
  applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
  documentId: "9d7c1c70-0d21-4f32-8fd3-bf366d9d14d4",
  fileName: "supporting.pdf",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [form, setForm] = useState<DocumentFormState>(initialDocumentForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.getDocuments().then(setDocuments).catch(() => {
      setError("Unable to load documents");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const { metadata, upload } = await apiClient.uploadDocument({
        applicationId: form.applicationId,
        documentId: form.documentId,
        fileName: form.fileName,
        fileContent: "stub", // placeholder for demo
      });
      setDocuments((prev) => [metadata, ...prev]);
      setStatusMessage(`Upload URL generated: ${upload.uploadUrl}`);
      setForm(initialDocumentForm);
    } catch (uploadError) {
      setStatusMessage(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  };

  return (
    <div>
      <h1>Documents</h1>
      <p>Track document uploads and review AI-generated summaries.</p>

      <section>
        <h2>Register document</h2>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.5rem", maxWidth: 420 }}>
          <label>
            Application ID
            <input
              value={form.applicationId}
              onChange={(event) => setForm((prev) => ({ ...prev, applicationId: event.target.value }))}
              required
            />
          </label>
          <label>
            Document ID
            <input
              value={form.documentId}
              onChange={(event) => setForm((prev) => ({ ...prev, documentId: event.target.value }))}
              required
            />
          </label>
          <label>
            File name
            <input
              value={form.fileName}
              onChange={(event) => setForm((prev) => ({ ...prev, fileName: event.target.value }))}
              required
            />
          </label>
          <button type="submit">Generate upload link</button>
        </form>
        {statusMessage ? <p style={{ color: "green" }}>{statusMessage}</p> : null}
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      </section>

      <section>
        <h2>Stored documents</h2>
        <DocumentsTable documents={documents} />
      </section>
    </div>
  );
}

function DocumentsTable({ documents }: { documents: ApplicationDocument[] }) {
  if (documents.length === 0) {
    return <p>No documents available.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>File name</th>
          <th>Status</th>
          <th>Uploaded</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => (
          <tr key={document.id}>
            <td>{document.id}</td>
            <td>{document.fileName}</td>
            <td>{document.status}</td>
            <td>{new Date(document.uploadedAt).toLocaleString()}</td>
            <td>{document.aiSummary ?? "Pending"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
