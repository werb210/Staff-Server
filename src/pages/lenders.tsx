import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../api";
import type { Lender, LenderProduct } from "../types/api";

const defaultApplicationId = "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15";

export default function LendersPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [products, setProducts] = useState<LenderProduct[]>([]);
  const [requirements, setRequirements] = useState<
    { documentType: string; required: boolean; description: string }[]
  >([]);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>(
    "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
  );
  const [applicationId, setApplicationId] = useState(defaultApplicationId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.getLenders().then(setLenders).catch(() => setLenders([]));
    void apiClient.getLenderReports().then(setReports).catch(() => setReports([]));
  }, []);

  useEffect(() => {
    if (!selectedLender) return;
    void apiClient.getLenderProducts(selectedLender).then(setProducts).catch(() => {
      setProducts([]);
    });
    void apiClient
      .getLenderRequirements(selectedLender)
      .then(setRequirements)
      .catch(() => setRequirements([]));
  }, [selectedLender]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await apiClient.sendToLender(applicationId, selectedLender);
      setStatusMessage(`Queued package with status: ${result.status ?? "queued"}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to queue package");
    }
  };

  return (
    <div>
      <h1>Lenders</h1>
      <p>Explore lender integrations, requirements, and AI scoring.</p>

      <section>
        <h2>Select lender</h2>
        <select value={selectedLender} onChange={(event) => setSelectedLender(event.target.value)}>
          {lenders.map((lender) => (
            <option key={lender.id} value={lender.id}>
              {lender.name} ({lender.status})
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2>Send application</h2>
        <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label>
            Application ID
            <input value={applicationId} onChange={(event) => setApplicationId(event.target.value)} />
          </label>
          <button type="submit">Send to lender</button>
        </form>
        {statusMessage ? <p>{statusMessage}</p> : null}
      </section>

      <section>
        <h2>Products</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Rate</th>
              <th>Amount range</th>
              <th>Term (months)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.interestRate.toFixed(2)}%</td>
                <td>
                  ${product.minAmount.toLocaleString()} - ${product.maxAmount.toLocaleString()}
                </td>
                <td>{product.termMonths}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Required documents</h3>
        <ul>
          {requirements.map((requirement) => (
            <li key={requirement.documentType}>
              <strong>{requirement.documentType}</strong> – {requirement.description} (
              {requirement.required ? "required" : "optional"})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Reports</h2>
        <table>
          <thead>
            <tr>
              <th>Lender</th>
              <th>Total applications</th>
              <th>Average decision time</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={String(report.id)}>
                <td>{report.lenderId as string}</td>
                <td>{report.totalApplications as number}</td>
                <td>{report.avgDecisionTimeHours as number} hours</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
