// Auto-generated stub by Codex
// Stub application service providing minimal in-memory responses

export type ApplicationRecord = {
  id: string;
  status: string;
};

class ApplicationService {
  private applications: ApplicationRecord[] = [];

  listApplications(): ApplicationRecord[] {
    return [...this.applications];
  }

  createApplication(): ApplicationRecord {
    const application: ApplicationRecord = { id: "app-1", status: "draft" };
    this.applications.push(application);
    return application;
  }

  submitApplication(): { message: string } {
    return { message: "submitted" };
  }

  uploadDocument(): { message: string } {
    return { message: "uploaded" };
  }

  completeApplication(): { message: string } {
    return { message: "completed" };
  }
}

export const applicationService = new ApplicationService();
