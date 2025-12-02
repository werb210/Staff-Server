import timelineRepo from "../db/repositories/timeline.repo.js";

export const timelineService = {
  listByApplication(applicationId: string) {
    return timelineRepo.findMany({ applicationId });
  },

  addEvent(data: any) {
    return timelineRepo.create({
      ...data,
      createdAt: new Date(),
    });
  },
};

export default timelineService;
