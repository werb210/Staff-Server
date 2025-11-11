import {
  ApplicationPortalNotFoundError,
  applicationService,
} from "../services/applicationService.js";

describe("applicationService", () => {
  it("creates applications with required fields", () => {
    const application = applicationService.createApplication({
      applicantName: "Test Borrower",
      applicantEmail: "borrower@example.com",
      loanAmount: 100000,
      loanPurpose: "Inventory",
      productId: "385ca198-5b56-4587-a5b4-947ca9b61930",
    });

    expect(application.id).toBeDefined();
    expect(application.status).toBe("draft");
    expect(application.loanAmount).toBe(100000);
  });

  it("publishes applications with AI summary", () => {
    const [first] = applicationService.listApplications();
    const published = applicationService.publishApplication(first.id, "tester");

    expect(published.status).toBe("approved");
    expect(published.summary).toContain("tester");
  });

  it("builds pipeline stages with totals", () => {
    const pipeline = applicationService.buildPipeline();

    expect(pipeline.length).toBeGreaterThan(0);
    expect(pipeline[0]).toHaveProperty("totalLoanAmount");
  });

  it("creates a client portal session for an existing applicant", () => {
    const [first] = applicationService.listApplications();
    const session = applicationService.createClientPortalSession({
      applicantEmail: first.applicantEmail,
      silo: "BF",
    });

    expect(session.applicationId).toBe(first.id);
    expect(session.redirectUrl).toContain(first.id);
    expect(session.message).toContain(first.applicantName.split(" ")[0]!);
  });

  it("throws when no application matches the portal request", () => {
    expect(() =>
      applicationService.createClientPortalSession({
        applicantEmail: "missing@example.com",
        silo: "BF",
      }),
    ).toThrow(ApplicationPortalNotFoundError);
  });
});
