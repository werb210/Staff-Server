import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../api";
import { CallLog, EmailMessage, SmsMessage } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

type Tab = "sms" | "email" | "calls";

export function CommunicationPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("sms");
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    to: "",
    from: "",
    subject: "",
    body: "",
    message: "",
    durationSeconds: 60,
    notes: "",
    outcome: "Completed",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sms, emails, calls] = await Promise.all([
          apiClient.getSmsMessages(),
          apiClient.getEmailMessages(),
          apiClient.getCallLogs(),
        ]);
        if (!isMounted) return;
        setSmsMessages(sms);
        setEmailMessages(emails);
        setCallLogs(calls);
      } catch (err) {
        const message =
          (err as { message?: string })?.message ?? "Failed to load communications.";
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formState.to) {
      setError("Recipient is required.");
      return;
    }

    if (activeTab !== "calls" && !formState.message && !formState.body) {
      setError("Message content cannot be empty.");
      return;
    }

    try {
      if (activeTab === "sms") {
        const sms = await apiClient.sendSms({
          to: formState.to,
          from: formState.from || "",
          message: formState.message,
        });
        setSmsMessages((prev) => [sms, ...prev]);
      }

      if (activeTab === "email") {
        const email = await apiClient.sendEmail({
          to: formState.to,
          subject: formState.subject,
          body: formState.body,
        });
        setEmailMessages((prev) => [email, ...prev]);
      }

      if (activeTab === "calls") {
        const call = await apiClient.logCall({
          to: formState.to,
          from: formState.from || "",
          durationSeconds: Number(formState.durationSeconds) || 0,
          notes: formState.notes,
          outcome: formState.outcome,
        });
        setCallLogs((prev) => [call, ...prev]);
      }

      setFormState({
        to: "",
        from: "",
        subject: "",
        body: "",
        message: "",
        durationSeconds: 60,
        notes: "",
        outcome: "Completed",
      });
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Failed to send communication.";
      setError(message);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "sms":
        return (
          <div className="panel-body">
            <label>
              To
              <input
                type="tel"
                value={formState.to}
                onChange={(event) => setFormState((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
            <label>
              From
              <input
                type="tel"
                value={formState.from}
                onChange={(event) => setFormState((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>
            <label>
              Message
              <textarea
                rows={3}
                value={formState.message}
                onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
              />
            </label>
          </div>
        );
      case "email":
        return (
          <div className="panel-body">
            <label>
              To
              <input
                type="email"
                value={formState.to}
                onChange={(event) => setFormState((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
            <label>
              Subject
              <input
                type="text"
                value={formState.subject}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subject: event.target.value }))
                }
              />
            </label>
            <label>
              Body
              <textarea
                rows={4}
                value={formState.body}
                onChange={(event) => setFormState((prev) => ({ ...prev, body: event.target.value }))}
              />
            </label>
          </div>
        );
      case "calls":
        return (
          <div className="panel-body">
            <label>
              To
              <input
                type="tel"
                value={formState.to}
                onChange={(event) => setFormState((prev) => ({ ...prev, to: event.target.value }))}
              />
            </label>
            <label>
              From
              <input
                type="tel"
                value={formState.from}
                onChange={(event) => setFormState((prev) => ({ ...prev, from: event.target.value }))}
              />
            </label>
            <label>
              Duration (seconds)
              <input
                type="number"
                min={0}
                value={formState.durationSeconds}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, durationSeconds: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              Outcome
              <select
                value={formState.outcome}
                onChange={(event) => setFormState((prev) => ({ ...prev, outcome: event.target.value }))}
              >
                <option value="Completed">Completed</option>
                <option value="Voicemail">Voicemail</option>
                <option value="No Answer">No Answer</option>
              </select>
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  const renderList = () => {
    switch (activeTab) {
      case "sms":
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>To</th>
                <th>From</th>
                <th>Message</th>
                <th>Sent At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {smsMessages.map((sms) => (
                <tr key={sms.id}>
                  <td>{sms.to}</td>
                  <td>{sms.from}</td>
                  <td>{sms.message}</td>
                  <td>{new Date(sms.sentAt).toLocaleString()}</td>
                  <td>{sms.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "email":
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>To</th>
                <th>Subject</th>
                <th>Sent At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {emailMessages.map((email) => (
                <tr key={email.id}>
                  <td>{email.to}</td>
                  <td>{email.subject}</td>
                  <td>{new Date(email.sentAt).toLocaleString()}</td>
                  <td>{email.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "calls":
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>To</th>
                <th>From</th>
                <th>Duration</th>
                <th>Outcome</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {callLogs.map((call) => (
                <tr key={call.id}>
                  <td>{call.to}</td>
                  <td>{call.from}</td>
                  <td>{call.durationSeconds}s</td>
                  <td>{call.outcome}</td>
                  <td>{new Date(call.startedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>Communications</h2>
        <p>Review and send SMS, emails, and log calls with applicants.</p>
      </header>

      <div className="tabs">
        {([
          { id: "sms", label: "SMS" },
          { id: "email", label: "Email" },
          { id: "calls", label: "Calls" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "primary" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? <div className="loading">Loading messages…</div> : null}

      <form className="panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <h3>{activeTab === "sms" ? "Send SMS" : activeTab === "email" ? "Send Email" : "Log Call"}</h3>
          <button type="submit" className="primary">
            {activeTab === "calls" ? "Log Call" : "Send"}
          </button>
        </div>
        {renderTabContent()}
      </form>

      <div className="panel">{renderList()}</div>
    </section>
  );
}

export default CommunicationPanel;
