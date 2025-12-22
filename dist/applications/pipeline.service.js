import { applicationStatusEnum } from "../db/schema";
export class PipelineService {
    finalStatuses = ["accepted", "declined"];
    initialStatus(productCategory) {
        if (productCategory === "startup")
            return "startup_pipeline";
        return "requires_docs";
    }
    canTransition(current, next) {
        if (this.finalStatuses.includes(current))
            return false;
        return applicationStatusEnum.enumValues.includes(next);
    }
    normalizeStatus(current, requested) {
        return this.canTransition(current, requested) ? requested : current;
    }
}
export const pipelineService = new PipelineService();
