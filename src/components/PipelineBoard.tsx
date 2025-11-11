import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { PipelineBoardData, PipelineStage } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

export function PipelineBoard() {
  const [board, setBoard] = useState<PipelineBoardData>({ stages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPipeline = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getPipeline();
        if (!isMounted) return;
        setBoard(data);
      } catch (err) {
        const message = (err as { message?: string })?.message ?? "Failed to load pipeline.";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPipeline();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderStage = (stage: PipelineStage) => (
    <div key={stage.id} className="kanban-column">
      <div className="panel-header">
        <h3>
          {stage.name}
          <span className="badge info">{stage.applications.length}</span>
        </h3>
      </div>
      <div className="kanban-cards">
        {stage.applications.length ? (
          stage.applications.map((application) => (
            <article key={application.id} className="kanban-card">
              <h4>{application.applicantName}</h4>
              <p>{application.loanPurpose}</p>
              <dl>
                <div>
                  <dt>Amount</dt>
                  <dd>${application.loanAmount.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{application.status}</dd>
                </div>
              </dl>
              <small>Updated {new Date(application.updatedAt ?? application.createdAt).toLocaleString()}</small>
            </article>
          ))
        ) : (
          <p className="empty">No applications</p>
        )}
      </div>
    </div>
  );

  return (
    <section className="card">
      <header className="card-header">
        <h2>Pipeline</h2>
        <p>Track applications across pipeline stages.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading pipeline…</div>}

      {!loading && !error && (
        <div className="kanban-board">
          {board.stages.sort((a, b) => a.position - b.position).map(renderStage)}
        </div>
      )}
    </section>
  );
}

export default PipelineBoard;
