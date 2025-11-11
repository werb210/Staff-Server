import { FormEvent, useMemo, useState } from "react";
import { useCommunication } from "../hooks/useCommunication";
import type { CallLog } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

type Tab = "sms" | "email" | "calls";

export function CommunicationPanel() {
  const {
    smsThreads,
    emailThreads,
    callLogs,
    loading,
    error,
    sendSms,
    receiveSms,
    sendEmail,
    receiveEmail,
    logCall,
  } = useCommunication();

  const [activeTab, setActiveTab] = useState<Tab>("sms");
  const [localError, setLocalError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    to: "",
    from: "",
    subject: "",
    body: "",
    durationSeconds: 60,
    notes: "",
    outcome: "completed" as CallLog["outcome"],
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!formState.to) {
      setLocalError("Recipient is required.");
      return;
    }

    if (activeTab !== "calls" && !formState.body) {
      setLocalError("Message content cannot be empty.");
      return;
    }

    try {
      if (activeTab === "sms") {
        await sendSms({ to: formState.to, from: formState.from || undefined, body: formState.body });
      }

      if (activeTab === "email") {
        await sendEmail({ to: formState.to, subject: formState.subject, body: formState.body });
      }

      if (activeTab === "calls") {
        await logCall({
          to: formState.to,
          from: formState.from || "",
          durationSeconds: Number(formState.durationSeconds) || 0,
          notes: formState.notes,
          outcome: formState.outcome,
        });
      }

      setFormState({
        to: "",
        from: "",
        subject: "",
        body: "",
        durationSeconds: 60,
        notes: "",
        outcome: "completed",
      });
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Failed to send communication.";
      setLocalError(message);
    }
  };

  const renderThreads = () => {
    switch (activeTab) {
      case "sms":
        return (
          <ul className="thread-list">
            {smsThreads.map((thread) => (
              <li key={thread.contact}>
                <strong>{thread.contact}</strong>
                <p>{thread.messages[0]?.body}</p>
                <small>Last: {new Date(thread.messages[0]?.sentAt ?? Date.now()).toLocaleString()}</small>
              </li>
            ))}
            {smsThreads.length === 0 && <li>No SMS conversations yet.</li>}
          </ul>
        );
      case "email":
        return (
          <ul className="thread-list">
            {emailThreads.map((thread) => (
              <li key={thread.contact}>
                <strong>{thread.contact}</strong>
                <p>{thread.messages[0]?.subject}</p>
                <small>Last: {new Date(thread.messages[0]?.sentAt ?? Date.now()).toLocaleString()}</small>
              </li>
            ))}
            {emailThreads.length === 0 && <li>No email conversations yet.</li>}
          </ul>
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
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {callLogs.map((call) => (
                <tr key={call.id}>
                  <td>{call.to}</td>
                  <td>{call.from}</td>
                  <td>{call.durationSeconds}s</td>
                  <td>{call.outcome}</td>
                  <td>{call.notes ?? "—"}</td>
                </tr>
              ))}
              {callLogs.length === 0 && (
                <tr>
                  <td colSpan={5}>No calls logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  const inboundActions = useMemo(() => {
    if (activeTab === "sms") {
      return (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            void receiveSms({
              from: formState.to || "+15551234567",
              to: formState.from || undefined,
              body: "Thanks for reaching out!",
            })
          }
        >
          Receive SMS
        </button>
      );
    }

    if (activeTab === "email") {
      return (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            void receiveEmail({
              from: formState.to || "customer@example.com",
              to: formState.from || "ops@boreal.example",
              subject: `Re: ${formState.subject || "Follow up"}`,
              body: "Appreciate the update!",
            })
          }
        >
          Receive Email
        </button>
      );
    }

    return null;
  }, [activeTab, formState.to, formState.from, formState.subject, receiveSms, receiveEmail]);

  const renderTabForm = () => {
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
                value={formState.body}
                onChange={(event) => setFormState((prev) => ({ ...prev, body: event.target.value }))}
              />
            </label>
            {inboundActions}
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
            {inboundActions}
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
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    outcome: event.target.value as CallLog["outcome"],
                  }))
                }
              >
                <option value="completed">Completed</option>
                <option value="no-answer">No Answer</option>
                <option value="busy">Busy</option>
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

  return (
    <section className="card">
      <header className="card-header">
        <h2>Communications</h2>
        <p>Track SMS, email, and call interactions with applicants.</p>
      </header>

      {(error || localError) && <div className="error">{error ?? localError}</div>}
      {loading && <div className="loading">Loading communications…</div>}

      <div className="tabs">
        <button
          className={activeTab === "sms" ? "active" : ""}
          onClick={() => setActiveTab("sms")}
        >
          SMS
        </button>
        <button
          className={activeTab === "email" ? "active" : ""}
          onClick={() => setActiveTab("email")}
        >
          Email
        </button>
        <button
          className={activeTab === "calls" ? "active" : ""}
          onClick={() => setActiveTab("calls")}
        >
          Calls
        </button>
      </div>

      <form className="panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <h3>{activeTab === "sms" ? "SMS" : activeTab === "email" ? "Email" : "Calls"}</h3>
        </div>
        {renderTabForm()}
        <div className="panel-actions">
          <button type="submit" className="primary">
            {activeTab === "calls" ? "Log Call" : "Send"}
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-header">
          <h3>Recent Activity</h3>
        </div>
        {renderThreads()}
      </div>
    </section>
  );
}

export default CommunicationPanel;
