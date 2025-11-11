import { useCallback, useEffect, useState } from "react";
import {
  assignApplication as assignApplicationApi,
  createApplication as createApplicationApi,
  deleteApplication as deleteApplicationApi,
  listApplications,
  updateApplication as updateApplicationApi,
  updateApplicationStatus as updateApplicationStatusApi,
} from "../api/applications";
import { Application } from "../types/api";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listApplications();
      setApplications(data);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load applications.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createApplication = useCallback(async (payload: Partial<Application>) => {
    const created = await createApplicationApi(payload);
    setApplications((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateApplication = useCallback(
    async (id: string, payload: Partial<Application>) => {
      const updated = await updateApplicationApi(id, payload);
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
      return updated;
    },
    [],
  );

  const deleteApplication = useCallback(async (id: string) => {
    await deleteApplicationApi(id);
    setApplications((prev) => prev.filter((app) => app.id !== id));
  }, []);

  const assignApplication = useCallback(
    async (id: string, assignedTo: string, stage?: Application["status"]) => {
      const updated = await assignApplicationApi({ id, assignedTo, stage });
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
      return updated;
    },
    [],
  );

  const updateStatus = useCallback(async (id: string, status: Application["status"]) => {
    const updated = await updateApplicationStatusApi(id, status);
    setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
    return updated;
  }, []);

  return {
    applications,
    loading,
    error,
    refresh,
    createApplication,
    updateApplication,
    deleteApplication,
    assignApplication,
    updateStatus,
  };
}

export type UseApplicationsReturn = ReturnType<typeof useApplications>;
