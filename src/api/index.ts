import {
  Application,
  ApplicationDocument,
  BackupRecord,
  CallLog,
  DocumentUploadInput,
  EmailMessage,
  Lender,
  LenderProduct,
  PipelineBoardData,
  RetryJob,
  SmsMessage,
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

  // Documents
  getDocuments(applicationId?: string) {
    return request<ApplicationDocument[]>(
      `/api/documents${getQueryString({ applicationId })}`
    );
  },
  uploadDocument(payload: DocumentUploadInput) {
    return request<{ metadata: ApplicationDocument; upload: { uploadUrl: string; expiresAt: string } }>(
      `/api/applications/upload`,
      {
        body: JSON.stringify({
          applicationId: payload.applicationId,
          documentId: payload.documentId,
          fileName: payload.fileName,
          contentType: "application/pdf",
        }),
      },
      "POST"
    );
  },

  // Lenders & products
  getLenders() {
    return request<Lender[]>(`/api/lenders`);
  },
  getLenderProducts(lenderId?: string) {
    if (lenderId) {
      return request<LenderProduct[]>(`/api/lenders/${lenderId}/products`);
    }
    return request<LenderProduct[]>(`/api/lenders/products`);
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
  sendSms(payload: Pick<SmsMessage, "to" | "from" | "message">) {
    return request<SmsMessage>(
      `/api/communication/sms`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
    );
  },
  sendEmail(payload: Pick<EmailMessage, "to" | "subject" | "body"> & { from?: string }) {
    return request<EmailMessage>(
      `/api/communication/email`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
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
  getEmailMessages() {
    return request<EmailMessage[]>(`/api/communication/email`);
  },
  getCallLogs() {
    return request<CallLog[]>(`/api/communication/calls`);
  },

  // Marketing
  getMarketingAds() {
    return request<Record<string, unknown>[]>(`/api/marketing/ads`);
  },
  getMarketingAutomations() {
    return request<Record<string, unknown>[]>(`/api/marketing/automation`);
  },

  // Admin
  getRetryQueue() {
    return request<RetryJob[]>(`/api/admin/retry-queue`);
  },
  getBackups() {
    return request<BackupRecord[]>(`/api/admin/backups`);
  },

  // Pipeline
  async getPipeline(): Promise<PipelineBoardData> {
    const stages = await request<PipelineBoardData["stages"]>(`/api/pipeline`);
    return { stages };
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
