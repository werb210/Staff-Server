import { usePipeline } from "../hooks/usePipeline";
import type { Application, PipelineStage } from "../types/api";
import "../styles/layout.css";
import "./FormStyles.css";

export function PipelineBoard() {
  const { board, loading, error, refresh } = usePipeline();

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
          stage.applications.map((application) => renderCard(application))
        ) : (
          <p className="empty">No applications</p>
        )}
      </div>
    </div>
  );

  const renderCard = (application: Application) => (
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
        {application.assignedTo && (
          <div>
            <dt>Assigned</dt>
            <dd>{application.assignedTo}</dd>
          </div>
        )}
      </dl>
      <small>
        Updated {new Date(application.updatedAt ?? application.createdAt).toLocaleString()}
      </small>
    </article>
  );

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Pipeline</h2>
          <p>Track applications across pipeline stages.</p>
        </div>
        <button type="button" className="secondary" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading pipeline…</div>}

      {!loading && !error && (
        <div className="kanban-board">
          {[...board.stages].sort((a, b) => a.position - b.position).map(renderStage)}
        </div>
      )}
    </section>
  );
}

export default PipelineBoard;
