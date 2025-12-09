import { applicationStatusEnum } from "../db/schema";

type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];

export class PipelineService {
  private finalStatuses: ApplicationStatus[] = ["accepted", "declined"];

  initialStatus(productCategory?: string): ApplicationStatus {
    if (productCategory === "startup") return "startup_pipeline";
    return "requires_docs";
  }

  canTransition(current: ApplicationStatus, next: ApplicationStatus) {
    if (this.finalStatuses.includes(current)) return false;
    return applicationStatusEnum.enumValues.includes(next);
  }

  normalizeStatus(current: ApplicationStatus, requested: ApplicationStatus): ApplicationStatus {
    return this.canTransition(current, requested) ? requested : current;
  }
}

export const pipelineService = new PipelineService();
