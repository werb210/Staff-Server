import { request } from "./http";

export const getHealth = () =>
  request<Record<string, unknown>>({
    url: "/api/health",
    method: "GET",
  });

export const getBuildGuard = () =>
  request<Record<string, unknown>>({
    url: "/api/_int/build-guard",
    method: "GET",
  });

export const getInternalHealth = () =>
  request<Record<string, unknown>>({
    url: "/api/_int/health",
    method: "GET",
  });
