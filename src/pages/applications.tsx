import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api";
import type { Application, ApplicationSummary, LenderProduct } from "../types/api";

interface ApplicationFormState {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  productId: string;
  loanAmount: number;
  loanPurpose: string;
  assignedTo: string;
}

const initialForm: ApplicationFormState = {
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  productId: "385ca198-5b56-4587-a5b4-947ca9b61930",
  loanAmount: 250000,
  loanPurpose: "Working capital",
  assignedTo: "agent.one",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [publicApplications, setPublicApplications] = useState<ApplicationSummary[]>([]);
  const [products, setProducts] = useState<LenderProduct[]>([]);
  const [form, setForm] = useState<ApplicationFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    void apiClient.getApplications().then(setApplications).catch(() => {
      setError("Unable to load applications");
    });
    void apiClient
      .getApplications<ApplicationSummary>({ view: "public" })
      .then(setPublicApplications)
      .catch(() => {
        setError("Unable to load public applications");
      });
    void apiClient.getLenderProducts().then(setProducts).catch(() => {
      /* ignore */
    });
  }, []);

  const handleChange = (field: keyof ApplicationFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [products, form.productId],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!form.applicantName || !form.applicantEmail || !form.loanPurpose) {
      setError("All required fields must be completed.");
      return;
    }
    try {
      setSubmitting(true);
      const created = await apiClient.createApplication({
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        applicantPhone: form.applicantPhone,
        productId: form.productId,
        loanAmount: Number(form.loanAmount),
        loanPurpose: form.loanPurpose,
        assignedTo: form.assignedTo,
      });
      setApplications((prev) => [created, ...prev]);
      setForm(initialForm);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to create application",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Applications</h1>
      <p>Review and create loan applications backed by the stubbed API.</p>

      <section>
        <h2>Create application</h2>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.5rem", maxWidth: 480 }}>
          <label>
            Applicant name
            <input
              value={form.applicantName}
              onChange={(event) => handleChange("applicantName", event.target.value)}
              required
            />
          </label>
          <label>
            Applicant email
            <input
              type="email"
              value={form.applicantEmail}
              onChange={(event) => handleChange("applicantEmail", event.target.value)}
              required
            />
          </label>
          <label>
            Applicant phone
            <input
              value={form.applicantPhone}
              onChange={(event) => handleChange("applicantPhone", event.target.value)}
              placeholder="+15551234567"
            />
          </label>
          <label>
            Loan amount
            <input
              type="number"
              value={form.loanAmount}
              onChange={(event) => handleChange("loanAmount", Number(event.target.value))}
              required
            />
          </label>
          <label>
            Loan purpose
            <input
              value={form.loanPurpose}
              onChange={(event) => handleChange("loanPurpose", event.target.value)}
              required
            />
          </label>
          <label>
            Assigned to
            <input
              value={form.assignedTo}
              onChange={(event) => handleChange("assignedTo", event.target.value)}
            />
          </label>
          <label>
            Product
            <select
              value={form.productId}
              onChange={(event) => handleChange("productId", event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.interestRate.toFixed(2)}%)
                </option>
              ))}
            </select>
          </label>
          {selectedProduct ? (
            <small>
              Recommended score: {selectedProduct.recommendedScore} • Term: {selectedProduct.termMonths} months
            </small>
          ) : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Create"}
          </button>
        </form>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      </section>

      <section>
        <h2>In-flight applications</h2>
        <ApplicationsTable applications={applications} />
      </section>

      <section>
        <h2>Public summaries</h2>
        <ApplicationsTable applications={publicApplications} />
      </section>
    </div>
  );
}

function ApplicationsTable({
  applications,
}: {
  applications: Array<Application | ApplicationSummary>;
}) {
  if (applications.length === 0) {
    return <p>No applications available.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Applicant</th>
          <th>Loan amount</th>
          <th>Purpose</th>
          <th>Status</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((application) => (
          <tr key={application.id}>
            <td>{application.id}</td>
            <td>{application.applicantName}</td>
            <td>${application.loanAmount.toLocaleString()}</td>
            <td>{application.loanPurpose}</td>
            <td>{application.status}</td>
            <td>{application.score ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
