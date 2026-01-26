export enum ApplicationStage {
  RECEIVED = "RECEIVED",
  DOCUMENTS_REQUIRED = "DOCUMENTS_REQUIRED",
  IN_REVIEW = "IN_REVIEW",
  START_UP = "START_UP",
  OFF_TO_LENDER = "OFF_TO_LENDER",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export const PIPELINE_STATES = Object.values(
  ApplicationStage
) as ApplicationStage[];

export type PipelineState = ApplicationStage;

export function isPipelineState(value: string): value is PipelineState {
  return (PIPELINE_STATES as readonly string[]).includes(value);
}

export const LEGAL_TRANSITIONS: Record<PipelineState, readonly PipelineState[]> = {
  [ApplicationStage.RECEIVED]: [ApplicationStage.DOCUMENTS_REQUIRED],
  [ApplicationStage.DOCUMENTS_REQUIRED]: [ApplicationStage.IN_REVIEW],
  [ApplicationStage.IN_REVIEW]: [
    ApplicationStage.START_UP,
    ApplicationStage.DOCUMENTS_REQUIRED,
    ApplicationStage.DECLINED,
  ],
  [ApplicationStage.START_UP]: [
    ApplicationStage.OFF_TO_LENDER,
    ApplicationStage.DOCUMENTS_REQUIRED,
    ApplicationStage.DECLINED,
  ],
  [ApplicationStage.OFF_TO_LENDER]: [
    ApplicationStage.ACCEPTED,
    ApplicationStage.DECLINED,
    ApplicationStage.DOCUMENTS_REQUIRED,
  ],
  [ApplicationStage.ACCEPTED]: [],
  [ApplicationStage.DECLINED]: [],
};

export function canTransition(
  current: PipelineState,
  next: PipelineState
): boolean {
  return (LEGAL_TRANSITIONS[current] ?? []).includes(next);
}
