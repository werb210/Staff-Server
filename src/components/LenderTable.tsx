import { useMemo, useState } from "react";
import { useLenders } from "../hooks/useLenders";
import "../styles/layout.css";
import "./FormStyles.css";

export function LenderTable() {
  const { lenders, loading, error } = useLenders();
  const [message, setMessage] = useState<string | null>(null);

  const handleSend = (lenderName: string, productName?: string) => {
    setMessage(`Application sent to ${lenderName}${productName ? ` for ${productName}` : ""}.`);
    setTimeout(() => setMessage(null), 3000);
  };

  const rows = useMemo(() => {
    return lenders.flatMap((lender) =>
      lender.products.length
        ? lender.products.map((product) => ({ lenderName: lender.name, contactEmail: lender.contactEmail, product }))
        : [{ lenderName: lender.name, contactEmail: lender.contactEmail, product: null }],
    );
  }, [lenders]);

  return (
    <section className="card">
      <header className="card-header">
        <h2>Lenders &amp; Products</h2>
        <p>Review current lender partners and their active products.</p>
      </header>

      {loading && <div className="loading">Loading lenders…</div>}
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {!loading && !error && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Lender</th>
              <th>Contact</th>
              <th>Product</th>
              <th>Interest Rate</th>
              <th>Amount Range</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.lenderName}-${row.product?.id ?? index}`}>
                <td>{row.lenderName}</td>
                <td>{row.contactEmail}</td>
                <td>{row.product?.name ?? "No active products"}</td>
                <td>{row.product ? `${row.product.interestRate.toFixed(2)}%` : "—"}</td>
                <td>
                  {row.product
                    ? `$${row.product.minAmount.toLocaleString()} - $${row.product.maxAmount.toLocaleString()}`
                    : "—"}
                </td>
                <td>
                  {row.product ? (
                    <span className={`badge ${row.product.active ? "success" : "warning"}`}>
                      {row.product.active ? "Active" : "Paused"}
                    </span>
                  ) : (
                    <span className="badge warning">Pending</span>
                  )}
                </td>
                <td className="table-actions">
                  <button
                    onClick={() => handleSend(row.lenderName, row.product?.name)}
                    className="primary"
                  >
                    Send to Lender
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default LenderTable;
