import {
  Application,
  ApplicationDocument,
  BackupRecord,
  CallLog,
  DocumentUploadInput,
  EmailMessage,
  HealthStatus,
  Lender,
  LenderProduct,
  PipelineBoardData,
  RetryJob,
  SmsMessage,
} from "../types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

const runtimeEnv = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof import.meta !== "undefined" && (import.meta as any)?.env
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((import.meta as any).env as Record<string, string | undefined>)
      : {};
  } catch (error) {
    return {} as Record<string, string | undefined>;
  }
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
  getApplications(params?: Record<string, string | number | undefined>) {
    return request<Application[]>(
      `/api/applications${getQueryString(params)}`
    );
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
    return request<ApplicationDocument>(
      `/api/documents`,
      {
        body: JSON.stringify(payload),
      },
      "POST"
    );
  },

  // Lenders & products
  getLenders() {
    return request<Lender[]>(`/api/lenders`);
  },
  getLenderProducts(lenderId?: string) {
    return request<LenderProduct[]>(
      `/api/lender-products${getQueryString({ lenderId })}`
    );
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
  toggleAd(id: string, active: boolean) {
    return request<Record<string, unknown>>(
      `/api/marketing/ads/${id}`,
      {
        body: JSON.stringify({ active }),
      },
      "PUT"
    );
  },
  toggleAutomation(id: string, active: boolean) {
    return request<Record<string, unknown>>(
      `/api/marketing/automation/${id}`,
      {
        body: JSON.stringify({ active }),
      },
      "PUT"
    );
  },

  // Admin
  getRetryQueue() {
    return request<RetryJob[]>(`/api/admin/retry-queue`);
  },
  getBackups() {
    return request<BackupRecord[]>(`/api/admin/backups`);
  },

  // Pipeline
  getPipeline() {
    return request<PipelineBoardData>(`/api/pipeline`);
  },

  // Health
  getHealth() {
    return request<HealthStatus[]>(`/api/_int/health`);
  },
  getBuildGuard() {
    return request<HealthStatus | Record<string, unknown>>(`/api/build-guard`);
  },
};

export type ApiClient = typeof apiClient;
