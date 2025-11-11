import {
  Application,
  ApplicationDocument,
  BackupRecord,
  CallLog,
  DocumentUploadInput,
  DocumentVersion,
  EmailMessage,
  EmailThread,
  Lender,
  LenderProduct,
  MarketingItem,
  PipelineBoardData,
  RetryJob,
  SmsMessage,
  SmsThread,
} from "../types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiEnvelope<T> = {
  message: string;
  data: T;
};

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

const runtimeEnv = (() => {
  type EnvRecord = Record<string, string | undefined>;
  const globalCandidate =
    typeof globalThis !== "undefined"
      ? ((globalThis as typeof globalThis & { __ENV__?: EnvRecord }).__ENV__ ?? null)
      : null;

  if (globalCandidate) {
    return globalCandidate;
  }

  if (typeof window !== "undefined") {
    const browserCandidate = (window as typeof window & { __ENV__?: EnvRecord }).__ENV__;
    if (browserCandidate) {
      return browserCandidate;
    }
  }

  return {} as EnvRecord;
})();

const getBaseUrl = () =>
  runtimeEnv.VITE_API_BASE_URL ??
  runtimeEnv.REACT_APP_API_BASE_URL ??
  runtimeEnv.API_BASE_URL ??
  process.env.REACT_APP_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  "http://localhost:5000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  method: HttpMethod = "GET"
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    method,
    headers,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error: ApiError = new Error(
      (data as { message?: string })?.message ?? response.statusText
    ) as ApiError;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (data && typeof data === "object" && "data" in data) {
    return (data as ApiEnvelope<T>).data;
  }

  return (data ?? (undefined as unknown as T)) as T;
}

function getQueryString(params?: Record<string, string | number | undefined>) {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const apiClient = {
  // Applications
  getApplications<T = Application>(params?: Record<string, string | number | undefined>) {
    return request<T[]>(`/api/applications${getQueryString(params)}`);
  },
  getApplication(id: string) {
    return request<Application>(`/api/applications/${id}`);
  },
  createApplication(payload: Partial<Application>) {
    return request<Application>(`/api/applications`, {
      body: JSON.stringify(payload),
    }, "POST");
  },
  updateApplication(id: string, payload: Partial<Application>) {
    return request<Application>(`/api/applications/${id}`, {
      body: JSON.stringify(payload),
    }, "PUT");
  },
  deleteApplication(id: string) {
    return request<void>(`/api/applications/${id}`, {}, "DELETE");
  },
  assignApplication(id: string, payload: { assignedTo: string; stage?: Application["status"] }) {
    return request<Application>(`/api/applications/${id}/assign`, {
      body: JSON.stringify(payload),
    }, "POST");
  },
  updateApplicationStatus(id: string, status: Application["status"]) {
    return request<Application>(`/api/applications/${id}/status`, {
      body: JSON.stringify({ status }),
    }, "POST");
  },

  // Documents
  getDocuments(applicationId?: string) {
    return request<ApplicationDocument[]>(
      `/api/documents${getQueryString({ applicationId })}`
    );
  },
  async uploadDocument(payload: DocumentUploadInput) {
    const metadata = await request<ApplicationDocument>(
      `/api/documents`,
      {
        body: JSON.stringify({
          id: payload.documentId,
          applicationId: payload.applicationId,
          fileName: payload.fileName,
          contentType: payload.contentType ?? "application/pdf",
          uploadedBy: payload.uploadedBy ?? "staff.app",
          note: payload.note,
        }),
      },
      "POST",
    );

    const upload = await request<{ uploadUrl: string; expiresAt: string }>(
      `/api/documents/${metadata.id}/upload-url`,
      {
        body: JSON.stringify({ fileName: payload.fileName }),
      },
      "POST",
    );

    return { metadata, upload };
  },
  getDocumentVersions(id: string) {
    return request<DocumentVersion[]>(`/api/documents/${id}/versions`);
  },
  getDocumentDownloadUrl(id: string, version?: number) {
    return request<{ sasUrl: string; version: number }>(
      `/api/documents/${id}/download${getQueryString({ version })}`,
    );
  },
  updateDocumentStatus(id: string, status: string) {
    return request<ApplicationDocument>(
      `/api/documents/${id}/status`,
      {
        body: JSON.stringify({ status }),
      },
      "POST",
    );
  },
  getDocumentStatus(id: string) {
    return request<{ id: string; status: string; version: number; lastUpdatedAt: string }>(
      `/api/documents/${id}/status`,
    );
  },

  // Lenders & products
  getLenders() {
    return request<Lender[]>(`/api/lenders`);
  },
  createLender(payload: Partial<Lender> & { name: string; contactEmail: string }) {
    return request<Lender>(
      `/api/lenders`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  updateLender(id: string, payload: Partial<Lender>) {
    return request<Lender>(
      `/api/lenders/${id}`,
      {
        body: JSON.stringify(payload),
      },
      "PUT",
    );
  },
  deleteLender(id: string) {
    return request<void>(`/api/lenders/${id}`, {}, "DELETE");
  },
  getLenderProducts(lenderId?: string) {
    if (lenderId) {
      return request<LenderProduct[]>(`/api/lenders/${lenderId}/products`);
    }
    return request<LenderProduct[]>(`/api/lenders/products`);
  },
  createLenderProduct(lenderId: string, payload: Partial<LenderProduct> & { name: string; interestRate: number; minAmount: number; maxAmount: number; termMonths: number; documentation: LenderProduct["documentation"]; recommendedScore: number }) {
    return request<LenderProduct>(
      `/api/lenders/${lenderId}/products`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  updateLenderProduct(lenderId: string, productId: string, payload: Partial<LenderProduct>) {
    return request<LenderProduct>(
      `/api/lenders/${lenderId}/products/${productId}`,
      {
        body: JSON.stringify(payload),
      },
      "PUT",
    );
  },
  deleteLenderProduct(lenderId: string, productId: string) {
    return request<void>(
      `/api/lenders/${lenderId}/products/${productId}`,
      {},
      "DELETE",
    );
  },
  getLenderRequirements(lenderId: string) {
    return request<{ documentType: string; required: boolean; description: string }[]>(
      `/api/lenders/${lenderId}/requirements`
    );
  },
  sendToLender(applicationId: string, lenderId: string) {
    return request<Record<string, unknown>>(
      `/api/lenders/send-to-lender`,
      {
        body: JSON.stringify({ applicationId, lenderId }),
      },
      "POST"
    );
  },
  getLenderReports() {
    return request<Record<string, unknown>[]>(`/api/lenders/reports`);
  },

  // Communication
  sendSms(payload: { to: string; from?: string; body: string }) {
    return request<SmsMessage>(
      `/api/communication/sms`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
    );
  },
  receiveSms(payload: { from: string; to?: string; body: string }) {
    return request<SmsMessage>(
      `/api/communication/sms/receive`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  sendEmail(payload: { to: string; subject: string; body: string; from?: string }) {
    return request<EmailMessage>(
      `/api/communication/email`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
    );
  },
  receiveEmail(payload: { from: string; to: string; subject: string; body: string }) {
    return request<EmailMessage>(
      `/api/communication/email/receive`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  logCall(payload: Pick<CallLog, "to" | "from" | "durationSeconds" | "notes" | "outcome">) {
    return request<CallLog>(
      `/api/communication/calls`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
    );
  },
  getSmsMessages() {
    return request<SmsMessage[]>(`/api/communication/sms`);
  },
  getSmsThreads() {
    return request<SmsThread[]>(`/api/communication/sms/threads`);
  },
  getEmailMessages() {
    return request<EmailMessage[]>(`/api/communication/email`);
  },
  getEmailThreads() {
    return request<EmailThread[]>(`/api/communication/email/threads`);
  },
  getCallLogs() {
    return request<CallLog[]>(`/api/communication/calls`);
  },

  // Marketing
  getMarketingAds() {
    return request<MarketingItem[]>(`/api/marketing/ads`);
  },
  getMarketingAutomations() {
    return request<MarketingItem[]>(`/api/marketing/automation`);
  },
  toggleAd(id: string, active: boolean) {
    return request<MarketingItem>(
      `/api/marketing/ads/${id}/toggle`,
      {
        body: JSON.stringify({ active }),
      },
      "POST",
    );
  },
  toggleAutomation(id: string, active: boolean) {
    return request<MarketingItem>(
      `/api/marketing/automation/${id}/toggle`,
      {
        body: JSON.stringify({ active }),
      },
      "POST",
    );
  },

  // Admin
  getRetryQueue() {
    return request<RetryJob[]>(`/api/admin/retry-queue`);
  },
  retryJob(id: string) {
    return request<RetryJob>(
      `/api/admin/retry-queue/retry`,
      {
        body: JSON.stringify({ id }),
      },
      "POST",
    );
  },
  getBackups() {
    return request<BackupRecord[]>(`/api/admin/backups`);
  },
  createBackup(name: string) {
    return request<BackupRecord>(
      `/api/admin/backups`,
      {
        body: JSON.stringify({ name }),
      },
      "POST",
    );
  },

  // Pipeline
  async getPipeline(): Promise<PipelineBoardData> {
    return request<PipelineBoardData>(`/api/pipeline`);
  },
  transitionPipeline(payload: { applicationId: string; toStage: string; fromStage?: string; assignedTo?: string; note?: string }) {
    return request<{ application: Application; board: PipelineBoardData }>(
      `/api/pipeline/transition`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  assignPipeline(payload: { id: string; assignedTo: string; stage?: string; note?: string }) {
    return request<{ application: Application; assignment: { id: string; assignedTo: string; stage?: string; assignedAt: string; note?: string }; board: PipelineBoardData }>(
      `/api/pipeline/assign`,
      {
        body: JSON.stringify(payload),
      },
      "POST",
    );
  },
  getPipelineAssignments() {
    return request<PipelineBoardData["assignments"]>(`/api/pipeline/assignments`);
  },

  // Health
  getHealth() {
    return request<Record<string, unknown>>(`/api/health`);
  },
  getBuildGuard() {
    return request<Record<string, unknown>>(`/api/_int/build-guard`);
  },
};

export type ApiClient = typeof apiClient;
