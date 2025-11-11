import { FormEvent, useMemo, useState } from "react";
import { useApplications } from "../hooks/useApplications";
import { Application } from "../types/api";
import "./FormStyles.css";

type Step = 0 | 1 | 2;

const initialForm: Partial<Application> & {
  desiredDocuments: string[];
} = {
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  loanAmount: 0,
  loanPurpose: "",
  status: "draft",
  desiredDocuments: [],
};

const documentOptions = [
  "Identification",
  "Income Verification",
  "Bank Statements",
  "Credit Report",
];

const DEFAULT_PRODUCT_ID = "385ca198-5b56-4587-a5b4-947ca9b61930";

export function ApplicationForm() {
  const { createApplication } = useApplications();
  const [step, setStep] = useState<Step>(0);
  const [formState, setFormState] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLastStep = useMemo(() => step === 2, [step]);

  const updateForm = <K extends keyof typeof formState>(key: K, value: typeof formState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleDocumentToggle = (doc: string) => {
    updateForm(
      "desiredDocuments",
      formState.desiredDocuments.includes(doc)
        ? formState.desiredDocuments.filter((item) => item !== doc)
        : [...formState.desiredDocuments, doc]
    );
  };

  const next = () => {
    setError(null);
    setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
  };

  const back = () => {
    setError(null);
    setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev));
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!formState.applicantName || !formState.applicantEmail) {
        setError("Applicant name and email are required.");
        return false;
      }
    }
    if (step === 1) {
      if (!formState.loanAmount || formState.loanAmount <= 0) {
        setError("Loan amount must be greater than zero.");
        return false;
      }
      if (!formState.loanPurpose) {
        setError("Loan purpose is required.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateStep()) return;

    if (!isLastStep) {
      next();
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<Application> & { desiredDocuments: string[] } = {
        applicantName: formState.applicantName?.trim() ?? "",
        applicantEmail: formState.applicantEmail?.trim() ?? "",
        applicantPhone: formState.applicantPhone?.trim(),
        loanAmount: Number(formState.loanAmount ?? 0),
        loanPurpose: formState.loanPurpose?.trim() ?? "",
        status: formState.status ?? "draft",
        desiredDocuments: formState.desiredDocuments,
      };
      await createApplication({
        applicantName: payload.applicantName,
        applicantEmail: payload.applicantEmail,
        applicantPhone: payload.applicantPhone,
        loanAmount: payload.loanAmount,
        loanPurpose: payload.loanPurpose,
        status: payload.status as Application["status"],
        productId: DEFAULT_PRODUCT_ID,
      });
      setSuccess("Application submitted successfully!");
      setFormState(initialForm);
      setStep(0);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to submit application.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <header className="card-header">
        <h2>New Application</h2>
        <p>Collect applicant information and required documents.</p>
      </header>

      <div className="steps-indicator">
        {["Applicant", "Loan", "Documents"].map((label, index) => (
          <div key={label} className={`step ${step === index ? "active" : step > index ? "complete" : ""}`}>
            <span className="step-index">{index + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <section className="form-step">
        {step === 0 && (
          <div className="grid">
            <label>
              Applicant Name
              <input
                type="text"
                value={formState.applicantName}
                onChange={(event) => updateForm("applicantName", event.target.value)}
                required
              />
            </label>
            <label>
              Applicant Email
              <input
                type="email"
                value={formState.applicantEmail}
                onChange={(event) => updateForm("applicantEmail", event.target.value)}
                required
              />
            </label>
            <label>
              Applicant Phone
              <input
                type="tel"
                value={formState.applicantPhone ?? ""}
                onChange={(event) => updateForm("applicantPhone", event.target.value)}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid">
            <label>
              Loan Amount
              <input
                type="number"
                min={0}
                step={100}
                value={formState.loanAmount ?? 0}
                onChange={(event) => updateForm("loanAmount", Number(event.target.value))}
                required
              />
            </label>
            <label>
              Loan Purpose
              <input
                type="text"
                value={formState.loanPurpose ?? ""}
                onChange={(event) => updateForm("loanPurpose", event.target.value)}
                required
              />
            </label>
            <label>
              Initial Status
              <select
                value={formState.status ?? "draft"}
                onChange={(event) =>
                  updateForm("status", event.target.value as Application["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid">
            <fieldset className="checkbox-group">
              <legend>Select Required Documents</legend>
              {documentOptions.map((doc) => (
                <label key={doc} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formState.desiredDocuments.includes(doc)}
                    onChange={() => handleDocumentToggle(doc)}
                  />
                  {doc}
                </label>
              ))}
            </fieldset>
          </div>
        )}
      </section>

      <footer className="form-actions">
        <button type="button" onClick={back} disabled={step === 0 || submitting}>
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="primary"
        >
          {submitting ? "Submitting..." : isLastStep ? "Submit" : "Next"}
        </button>
      </footer>
    </form>
  );
}

export default ApplicationForm;
