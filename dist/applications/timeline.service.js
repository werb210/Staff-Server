export class TimelineService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async logEvent(applicationId, eventType, metadata = {}, actorUserId) {
        await this.repo.addTimelineEvent({
            applicationId,
            eventType,
            metadata,
            actorUserId: actorUserId ?? null,
            timestamp: new Date(),
        });
    }
    async listEvents(applicationId) {
        return this.repo.listTimeline(applicationId);
    }
}
