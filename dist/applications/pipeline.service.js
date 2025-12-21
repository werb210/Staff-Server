"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineService = exports.PipelineService = void 0;
const schema_1 = require("../db/schema");
class PipelineService {
    finalStatuses = ["accepted", "declined"];
    initialStatus(productCategory) {
        if (productCategory === "startup")
            return "startup_pipeline";
        return "requires_docs";
    }
    canTransition(current, next) {
        if (this.finalStatuses.includes(current))
            return false;
        return schema_1.applicationStatusEnum.enumValues.includes(next);
    }
    normalizeStatus(current, requested) {
        return this.canTransition(current, requested) ? requested : current;
    }
}
exports.PipelineService = PipelineService;
exports.pipelineService = new PipelineService();
