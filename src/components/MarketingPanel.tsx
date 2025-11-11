import { useEffect, useState } from "react";
import { apiClient } from "../api";
import "../styles/layout.css";
import "./FormStyles.css";

interface MarketingItem {
  id: string;
  name?: string;
  status?: string;
  description?: string;
  active?: boolean;
  [key: string]: unknown;
}

export function MarketingPanel() {
  const [ads, setAds] = useState<MarketingItem[]>([]);
  const [automations, setAutomations] = useState<MarketingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [adsData, automationData] = await Promise.all([
          apiClient.getMarketingAds(),
          apiClient.getMarketingAutomations(),
        ]);
        if (!isMounted) return;
        setAds(adsData as MarketingItem[]);
        setAutomations(automationData as MarketingItem[]);
      } catch (err) {
        const message =
          (err as { message?: string })?.message ?? "Unable to load marketing data.";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAd = async (item: MarketingItem) => {
    try {
      setError(null);
      await apiClient.toggleAd(item.id, !item.active);
      setAds((prev) =>
        prev.map((ad) => (ad.id === item.id ? { ...ad, active: !item.active } : ad))
      );
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to update ad.";
      setError(message);
    }
  };

  const toggleAutomation = async (item: MarketingItem) => {
    try {
      setError(null);
      await apiClient.toggleAutomation(item.id, !item.active);
      setAutomations((prev) =>
        prev.map((automation) =>
          automation.id === item.id ? { ...automation, active: !item.active } : automation
        )
      );
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to update automation.";
      setError(message);
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

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading marketing data…</div>}

      {!loading && (
        <div className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Ads</h3>
            </div>
            {ads.length ? (
              renderItems(ads, toggleAd)
            ) : (
              <p>No ads configured.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Automations</h3>
            </div>
            {automations.length ? (
              renderItems(automations, toggleAutomation)
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
