import { request } from "./http";
import { ClientPortalSession } from "../types/api";

export interface ClientPortalSignInPayload {
  applicationId?: string;
  applicantEmail?: string;
}

export const signInToClientPortal = (payload: ClientPortalSignInPayload) =>
  request<ClientPortalSession>({
    url: "/api/publicLogin/sign-in",
    method: "POST",
    data: payload,
  });

export const fetchClientPortalSession = (applicationId: string) =>
  request<ClientPortalSession>({
    url: "/api/publicLogin/portal",
    method: "GET",
    params: { applicationId },
  });
