import { useEffect, useState } from "react";
import { getBuildGuard, getHealth } from "../api/health";
import { HealthStatus } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

type ServiceStatus = HealthStatus & { source: "health" | "build-guard" };

const POLL_INTERVAL = 15000;

export function HealthMonitor() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async (showSpinner = false) => {
    try {
      setError(null);
      if (showSpinner) {
        setLoading(true);
      }
      const [health, buildGuard] = await Promise.all([
        getHealth(),
        getBuildGuard(),
      ]);

      const normalized: ServiceStatus[] = [
        ...(Array.isArray(health)
          ? health.map((status) => ({ ...status, source: "health" as const }))
          : []),
      ];

      if (buildGuard && typeof buildGuard === "object" && "status" in buildGuard) {
        normalized.push({
          service: (buildGuard as { service?: string }).service ?? "Build Guard",
          status: ((buildGuard as { status: string }).status as ServiceStatus["status"]) ?? "degraded",
          checkedAt: new Date().toISOString(),
          source: "build-guard",
          details: buildGuard as Record<string, unknown>,
        });
      }

      setStatuses(normalized);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to load health status.";
      setError(message);
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadStatus(true);
    const interval = setInterval(() => {
      void loadStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const getDotClass = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy":
        return "green";
      case "down":
        return "red";
      default:
        return "yellow";
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>System Health</h2>
        <p>Live status of backend services.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Checking services…</div>}

      <div className="panel">
        {statuses.length ? (
          <ul className="health-list">
            {statuses.map((status) => (
              <li key={`${status.source}-${status.service}`} className="status-indicator">
                <span className={`status-dot ${getDotClass(status.status)}`}></span>
                <span>
                  {status.service} <small>({status.status})</small>
                </span>
                <small>Checked {new Date(status.checkedAt).toLocaleTimeString()}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No status information available.</p>
        )}
      </div>
    </section>
  );
}

export default HealthMonitor;
