import { aiService } from "../services/aiService.js";
import { lenderService } from "../services/lenderService.js";
import { applicationService } from "../services/applicationService.js";

describe("aiService", () => {
  it("produces application summaries", () => {
    const [application] = applicationService.listApplications();
    const summary = aiService.summarizeApplication(application);
    expect(summary).toContain(application.applicantName);
  });

  it("scores lender matches", () => {
    const [application] = applicationService.listApplications();
    const [product] = lenderService.listProducts();
    const { score, explanation } = aiService.scoreLenderMatch(product, application);
    expect(score).toBeGreaterThan(0);
    expect(explanation).toBeTruthy();
  });
});
