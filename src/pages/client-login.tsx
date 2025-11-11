import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useClientPortal } from "../hooks/useClientPortal";

interface FormState {
  applicationId: string;
  applicantEmail: string;
}

const initialState: FormState = {
  applicationId: "",
  applicantEmail: "",
};

const statusClassMap: Record<string, string> = {
  draft: "warning",
  submitted: "info",
  review: "info",
  approved: "success",
  completed: "success",
};

const sanitize = (value: string) => value.trim();

export default function ClientLoginPage() {
  const { session, loading, error, signIn, reset } = useClientPortal();
  const [form, setForm] = useState<FormState>(initialState);
  const [touched, setTouched] = useState(false);

  const statusBadgeClass = useMemo(() => {
    if (!session) {
      return "badge info";
    }
    const normalized = session.status?.toLowerCase() ?? "";
    const variant = statusClassMap[normalized] ?? "info";
    return `badge ${variant}`;
  }, [session]);

  const handleChange = (event: FormEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const payload = {
      applicationId: sanitize(form.applicationId) || undefined,
      applicantEmail: sanitize(form.applicantEmail) || undefined,
    };

    if (!payload.applicationId && !payload.applicantEmail) {
      return;
    }

    try {
      await signIn(payload);
    } catch (err) {
      console.error("Portal sign-in failed", err);
    }
  };

  const handleReset = () => {
    setForm(initialState);
    setTouched(false);
    reset();
  };

  const showValidationError =
    touched && !sanitize(form.applicationId) && !sanitize(form.applicantEmail);

  return (
    <>
      <Head>
        <title>Client Portal Sign-In</title>
      </Head>
      <section className="portal-card" aria-live="polite">
        <header className="portal-header">
          <div>
            <h1>Access Your Application</h1>
            <p className="portal-subtitle">
              Enter your application ID or the email you used to apply. We will
              guide you back to your secure client portal.
            </p>
          </div>
          {session ? (
            <button type="button" className="portal-reset" onClick={handleReset}>
              Start a new lookup
            </button>
          ) : null}
        </header>
        <form className="portal-form" onSubmit={handleSubmit} noValidate>
          <div className="portal-field">
            <label htmlFor="applicationId">Application ID</label>
            <input
              id="applicationId"
              name="applicationId"
              type="text"
              placeholder="e.g. c27e0c87-3bd5-47cc-8d14-5c569ea2cc15"
              value={form.applicationId}
              onInput={handleChange}
              autoComplete="off"
            />
            <small>Use the ID from your confirmation email.</small>
          </div>
          <div className="portal-field">
            <label htmlFor="applicantEmail">Email address</label>
            <input
              id="applicantEmail"
              name="applicantEmail"
              type="email"
              placeholder="you@example.com"
              value={form.applicantEmail}
              onInput={handleChange}
              autoComplete="email"
              required={!form.applicationId}
            />
            <small>We will use this to locate your application securely.</small>
          </div>
          {showValidationError ? (
            <p className="portal-error" role="alert">
              Provide your application ID or email so we can find your record.
            </p>
          ) : null}
          {error ? (
            <p className="portal-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-actions">
            <button type="submit" disabled={loading} className="portal-submit">
              {loading ? "Locating application…" : "Continue to portal"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="portal-secondary"
              disabled={loading && !session}
            >
              Clear
            </button>
          </div>
        </form>
        {session ? (
          <article className="portal-session">
            <h2>Welcome back, {session.applicantName}</h2>
            <p className="portal-session-message">{session.message}</p>
            <dl className="portal-session-details">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={statusBadgeClass}>{session.status}</span>
                </dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>{session.nextStep}</dd>
              </div>
              <div>
                <dt>Last update</dt>
                <dd>{new Date(session.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
            <Link href={session.redirectUrl} className="portal-link">
              Go to your secure portal
            </Link>
          </article>
        ) : (
          <p className="portal-hint">
            Need help? <a href="/support">Talk to a human</a> and our team will
            get you back on track.
          </p>
        )}
      </section>
    </>
  );
}
