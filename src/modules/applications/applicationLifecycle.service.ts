import { AppError } from "../../middleware/errors";
import {
  ApplicationStage,
  LEGAL_TRANSITIONS,
  PIPELINE_STATES,
  type PipelineState,
  isPipelineState,
} from "./pipelineState";

const TERMINAL_APPLICATION_STATUSES = new Set([
  "completed",
  "declined",
  "withdrawn",
  "expired",
]);

type TransitionCheck = {
  shouldTransition: boolean;
  reason: "ok" | "no_change" | "invalid";
};

function normalizeStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }
  const normalized = status.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isTerminalApplicationStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized ? TERMINAL_APPLICATION_STATUSES.has(normalized) : false;
}

export function resolveNextPipelineStage(
  current: PipelineState
): PipelineState | null {
  const allowed = LEGAL_TRANSITIONS[current] ?? [];
  if (allowed.length === 0) {
    return null;
  }
  for (const stage of PIPELINE_STATES) {
    if (allowed.includes(stage)) {
      return stage;
    }
  }
  const fallback = allowed[0];
  return fallback && isPipelineState(fallback) ? fallback : null;
}

export function assertPipelineTransition(params: {
  currentStage: string | null;
  nextStage: string;
  status?: string | null;
}): TransitionCheck {
  if (!isPipelineState(params.nextStage)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  if (!params.currentStage || !isPipelineState(params.currentStage)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  if (
    params.currentStage === ApplicationStage.STARTUP &&
    params.nextStage === ApplicationStage.OFF_TO_LENDER
  ) {
    return { shouldTransition: true, reason: "ok" };
  }
  if (isTerminalApplicationStatus(params.status)) {
    throw new AppError("invalid_transition", "Application is in a terminal state.", 400);
  }
  if (params.currentStage === params.nextStage) {
    return { shouldTransition: false, reason: "no_change" };
  }
  if (!LEGAL_TRANSITIONS[params.currentStage]?.includes(params.nextStage)) {
    throw new AppError("invalid_transition", "Invalid pipeline transition.", 400);
  }
  return { shouldTransition: true, reason: "ok" };
}

export function assertPipelineState(value: string | null): PipelineState {
  if (!value || !isPipelineState(value)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  return value;
}

export { ApplicationStage };
