import { useState } from "react";
import { useMarketing } from "../hooks/useMarketing";
import type { MarketingItem } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

export function MarketingPanel() {
  const { ads, automations, loading, error, toggleAd, toggleAutomation } = useMarketing();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleToggleAd = async (id: string, active: boolean) => {
    try {
      setLocalError(null);
      await toggleAd(id, !active);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Failed to update ad.";
      setLocalError(message);
    }
  };

  const handleToggleAutomation = async (id: string, active: boolean) => {
    try {
      setLocalError(null);
      await toggleAutomation(id, !active);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to update automation.";
      setLocalError(message);
    }
  };

  const renderItems = (items: MarketingItem[], onToggle: (item: MarketingItem) => void) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.name ?? item.id}</td>
            <td>{item.description ?? "No description"}</td>
            <td>
              <span className={`badge ${item.active ? "success" : "warning"}`}>
                {item.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="table-actions">
              <button className="primary" onClick={() => onToggle(item)}>
                {item.active ? "Deactivate" : "Activate"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="card">
      <header className="card-header">
        <h2>Marketing</h2>
        <p>Monitor advertising campaigns and automation workflows.</p>
      </header>

      {(error || localError) && <div className="error">{error ?? localError}</div>}
      {loading && <div className="loading">Loading marketing data…</div>}

      {!loading && (
        <div className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Ads</h3>
            </div>
            {ads.length ? (
              renderItems(ads, (item) => handleToggleAd(item.id, item.active ?? false))
            ) : (
              <p>No ads configured.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Automations</h3>
            </div>
            {automations.length ? (
              renderItems(automations, (item) =>
                handleToggleAutomation(item.id, item.active ?? false),
              )
            ) : (
              <p>No automations configured.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default MarketingPanel;
