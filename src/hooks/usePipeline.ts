import { useCallback, useEffect, useState } from "react";
import {
  assignPipelineStage,
  getPipelineBoard,
  transitionPipeline,
} from "../api/pipeline";
import { PipelineBoardData } from "../types/api";

const emptyBoard: PipelineBoardData = { stages: [], assignments: [] };

export function usePipeline() {
  const [board, setBoard] = useState<PipelineBoardData>(emptyBoard);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getPipelineBoard();
      setBoard(data);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load pipeline.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const transition = useCallback(
    async (payload: { applicationId: string; toStage: string; fromStage?: string; assignedTo?: string; note?: string }) => {
      const result = await transitionPipeline(payload);
      setBoard(result.board);
      return result;
    },
    [],
  );

  const assign = useCallback(
    async (payload: { id: string; assignedTo: string; stage?: string; note?: string }) => {
      const result = await assignPipelineStage(payload);
      setBoard(result.board);
      return result;
    },
    [],
  );

  return {
    board,
    loading,
    error,
    refresh,
    transition,
    assign,
  };
}

export type UsePipelineReturn = ReturnType<typeof usePipeline>;
