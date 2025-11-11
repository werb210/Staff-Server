import { useState } from "react";
import { useAdmin } from "../hooks/useAdmin";
import type { RetryJob } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

export function AdminDashboard() {
  const { retryJobs, backups, loading, error, retryJob, createBackup } = useAdmin();
  const [localError, setLocalError] = useState<string | null>(null);
  const [backupName, setBackupName] = useState<string>("manual-backup");

  const handleRetry = async (job: RetryJob) => {
    try {
      setLocalError(null);
      await retryJob(job.id);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Failed to retry job.";
      setLocalError(message);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLocalError(null);
      await createBackup(backupName || `manual-${Date.now()}`);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Failed to create backup.";
      setLocalError(message);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>Admin Dashboard</h2>
        <p>Monitor retry queues and backup operations.</p>
      </header>

      {(error || localError) && <div className="error">{error ?? localError}</div>}
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
                    <th>Action</th>
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
                      <td className="table-actions">
                        <button className="secondary" onClick={() => void handleRetry(job)}>
                          Retry
                        </button>
                      </td>
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
            <div className="panel-body">
              <label>
                Backup Name
                <input
                  type="text"
                  value={backupName}
                  onChange={(event) => setBackupName(event.target.value)}
                />
              </label>
              <button className="primary" type="button" onClick={() => void handleCreateBackup()}>
                Create Backup
              </button>
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
