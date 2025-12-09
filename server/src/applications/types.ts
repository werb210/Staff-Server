import {
  applicantOwners,
  applicationStatusHistory,
  applicationTimelineEvents,
  applications,
} from "../db/schema";

export type ApplicationRecord = typeof applications.$inferSelect;
export type NewApplicationRecord = typeof applications.$inferInsert;
export type OwnerRecord = typeof applicantOwners.$inferSelect;
export type StatusHistoryRecord = typeof applicationStatusHistory.$inferSelect;
export type TimelineEventRecord = typeof applicationTimelineEvents.$inferSelect;

export interface ApplicationsRepository {
  createApplication(data: NewApplicationRecord): Promise<ApplicationRecord>;
  updateApplication(id: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord | null>;
  findApplicationById(id: string): Promise<ApplicationRecord | null>;
  listApplications(): Promise<ApplicationRecord[]>;

  listOwners(applicationId: string): Promise<OwnerRecord[]>;
  createOwner(
    applicationId: string,
    data: Omit<typeof applicantOwners.$inferInsert, "applicationId">,
  ): Promise<OwnerRecord>;
  updateOwner(ownerId: string, updates: Partial<OwnerRecord>): Promise<OwnerRecord | null>;
  deleteOwner(ownerId: string): Promise<void>;

  addStatusHistory(entry: typeof applicationStatusHistory.$inferInsert): Promise<void>;
  listStatusHistory(applicationId: string): Promise<StatusHistoryRecord[]>;

  addTimelineEvent(event: typeof applicationTimelineEvents.$inferInsert): Promise<void>;
  listTimeline(applicationId: string): Promise<TimelineEventRecord[]>;
}
