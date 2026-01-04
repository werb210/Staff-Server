export const PIPELINE_STATES = [
  "NEW",
  "REQUIRES_DOCS",
  "UNDER_REVIEW",
  "LENDER_SUBMITTED",
  "APPROVED",
  "DECLINED",
  "FUNDED",
] as const;

export type PipelineState = (typeof PIPELINE_STATES)[number];

export function isPipelineState(value: string): value is PipelineState {
  return (PIPELINE_STATES as readonly string[]).includes(value);
}

export const LEGAL_TRANSITIONS: Record<PipelineState, readonly PipelineState[]> = {
  NEW: ["REQUIRES_DOCS"],
  REQUIRES_DOCS: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["LENDER_SUBMITTED"],
  LENDER_SUBMITTED: ["APPROVED", "DECLINED"],
  APPROVED: ["FUNDED"],
  DECLINED: [],
  FUNDED: [],
};

export function canTransition(
  current: PipelineState,
  next: PipelineState
): boolean {
  return (LEGAL_TRANSITIONS[current] ?? []).includes(next);
}
