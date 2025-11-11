import { request } from "./http";
import { Application, ApplicationSummary } from "../types/api";

export const listApplications = (params?: Record<string, string | number | undefined>) =>
  request<Application[]>({
    url: "/api/applications",
    method: "GET",
    params,
  });

export const listPublicApplications = () =>
  request<ApplicationSummary[]>({
    url: "/api/applications",
    method: "GET",
    params: { view: "public" },
  });

export const getApplication = (id: string) =>
  request<Application>({
    url: `/api/applications/${id}`,
    method: "GET",
  });

export const createApplication = (payload: Partial<Application>) =>
  request<Application>({
    url: "/api/applications",
    method: "POST",
    data: payload,
  });

export const updateApplication = (id: string, payload: Partial<Application>) =>
  request<Application>({
    url: `/api/applications/${id}`,
    method: "PUT",
    data: payload,
  });

export const deleteApplication = (id: string) =>
  request<void>({
    url: `/api/applications/${id}`,
    method: "DELETE",
  });

export const assignApplication = (payload: {
  id: string;
  assignedTo: string;
  stage?: Application["status"];
}) =>
  request<Application>({
    url: `/api/applications/${payload.id}/assign`,
    method: "POST",
    data: { assignedTo: payload.assignedTo, stage: payload.stage },
  });

export const updateApplicationStatus = (id: string, status: Application["status"]) =>
  request<Application>({
    url: `/api/applications/${id}/status`,
    method: "POST",
    data: { status },
  });

export const publishApplication = (id: string, publishedBy: string) =>
  request<Application>({
    url: `/api/applications/${id}/publish`,
    method: "POST",
    data: { publishedBy },
  });

export const submitApplication = (id: string, submittedBy: string) =>
  request<Application>({
    url: `/api/applications/${id}/submit`,
    method: "POST",
    data: { submittedBy },
  });

export const completeApplication = (id: string, completedBy: string) =>
  request<Application>({
    url: `/api/applications/${id}/complete`,
    method: "POST",
    data: { completedBy },
  });
