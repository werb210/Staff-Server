import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { BackupRecord, RetryJob } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

export function AdminDashboard() {
  const [retryJobs, setRetryJobs] = useState<RetryJob[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [jobs, backupRecords] = await Promise.all([
          apiClient.getRetryQueue(),
          apiClient.getBackups(),
        ]);
        if (!isMounted) return;
        setRetryJobs(jobs);
        setBackups(backupRecords);
      } catch (err) {
        const message =
          (err as { message?: string })?.message ?? "Failed to load admin data.";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdminData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="card">
      <header className="card-header">
        <h2>Admin Dashboard</h2>
        <p>Monitor retry queues and backup operations.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading admin data…</div>}

      {!loading && (
        <div className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Retry Queue</h3>
            </div>
            {retryJobs.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Queue</th>
                    <th>Attempt</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {retryJobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.id}</td>
                      <td>{job.queue}</td>
                      <td>{job.attempt}</td>
                      <td>{job.status}</td>
                      <td>{new Date(job.scheduledFor).toLocaleString()}</td>
                      <td>{job.lastError ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No retry jobs found.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Backups</h3>
            </div>
            {backups.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>{backup.id}</td>
                      <td>{backup.status}</td>
                      <td>{new Date(backup.startedAt).toLocaleString()}</td>
                      <td>{backup.completedAt ? new Date(backup.completedAt).toLocaleString() : "—"}</td>
                      <td>{backup.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No backups recorded.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;
