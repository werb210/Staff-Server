import { useCallback, useState } from "react";
import {
  ClientPortalSignInPayload,
  fetchClientPortalSession,
  signInToClientPortal,
} from "../api/publicLogin";
import { ClientPortalSession } from "../types/api";

export function useClientPortal() {
  const [session, setSession] = useState<ClientPortalSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (payload: ClientPortalSignInPayload) => {
    try {
      setLoading(true);
      setError(null);
      const data = await signInToClientPortal(payload);
      setSession(data);
      return data;
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to sign in.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(
    async (applicationId: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchClientPortalSession(applicationId);
        setSession(data);
        return data;
      } catch (err) {
        const message = (err as { message?: string })?.message ?? "Unable to load the portal.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return { session, loading, error, signIn, refresh, reset };
}

export type UseClientPortalReturn = ReturnType<typeof useClientPortal>;
