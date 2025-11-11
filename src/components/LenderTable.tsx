import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { Lender, LenderProduct } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

interface LenderWithProducts extends Lender {
  products: LenderProduct[];
}

export function LenderTable() {
  const [lenders, setLenders] = useState<LenderWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [lendersResponse, productsResponse] = await Promise.all([
          apiClient.getLenders(),
          apiClient.getLenderProducts(),
        ]);

        if (!isMounted) return;

        const grouped = lendersResponse.map((lender) => ({
          ...lender,
          products: productsResponse.filter((product) => product.lenderId === lender.id),
        }));

        setLenders(grouped);
      } catch (err) {
        const message =
          (err as { message?: string })?.message ?? "Unable to load lenders.";
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

  const handleSend = (lenderName: string, productName?: string) => {
    setMessage(`Application sent to ${lenderName}${productName ? ` for ${productName}` : ""}.`);
    setTimeout(() => setMessage(null), 3000);
  };

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
            {lenders.flatMap((lender) =>
              lender.products.length ? (
                lender.products.map((product) => (
                  <tr key={`${lender.id}-${product.id}`}>
                    <td>{lender.name}</td>
                    <td>{lender.contactEmail}</td>
                    <td>{product.name}</td>
                    <td>{product.interestRate.toFixed(2)}%</td>
                    <td>
                      ${product.minAmount.toLocaleString()} - ${product.maxAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${product.active ? "success" : "warning"}`}>
                        {product.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button onClick={() => handleSend(lender.name, product.name)} className="primary">
                        Send to Lender
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr key={lender.id}>
                  <td>{lender.name}</td>
                  <td>{lender.contactEmail}</td>
                  <td colSpan={4}>No active products</td>
                  <td className="table-actions">
                    <button onClick={() => handleSend(lender.name)} className="primary">
                      Send to Lender
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default LenderTable;
