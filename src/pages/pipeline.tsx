import { useEffect, useState } from "react";
import { apiClient } from "../api";
import type { PipelineBoardData } from "../types/api";

export default function PipelinePage() {
  const [board, setBoard] = useState<PipelineBoardData>({
    stages: [],
    assignments: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .getPipeline()
      .then(setBoard)
      .catch(() => setError("Unable to load pipeline"));
  }, []);

  const totalLoanVolume = board.stages.reduce(
    (sum, stage) => sum + stage.totalLoanAmount,
    0,
  );

  return (
    <div>
      <h1>Pipeline</h1>
      <p>Monitor aggregated loan stages built from the in-memory sample data.</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <p>
        Total stages: {board.stages.length} • Aggregate volume: ${totalLoanVolume.toLocaleString()}
      </p>

      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Count</th>
            <th>Total loan amount</th>
            <th>Average score</th>
            <th>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {board.stages.map((stage) => (
            <tr key={stage.id}>
              <td>{stage.name}</td>
              <td>{stage.count}</td>
              <td>${stage.totalLoanAmount.toLocaleString()}</td>
              <td>{stage.averageScore ? stage.averageScore.toFixed(1) : "—"}</td>
              <td>{new Date(stage.lastUpdatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
