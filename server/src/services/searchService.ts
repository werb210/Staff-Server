// =============================================================================
// server/src/services/searchService.ts
// =============================================================================

import applicationsRepo from "../db/repositories/applications.repo.js";
import companiesRepo from "../db/repositories/companies.repo.js";
import contactsRepo from "../db/repositories/contacts.repo.js";
import usersRepo from "../db/repositories/users.repo.js";

const contains = (value: unknown, query: string) => {
  if (!value) return false;
  return String(value).toLowerCase().includes(query.toLowerCase());
};

const filterList = (list: any[], query: string, keys: string[]) =>
  list.filter((item) => keys.some((key) => contains(item?.[key], query)));

const searchService = {
  /**
   * Global unified search across:
   *  - contacts
   *  - companies
   *  - applications
   *
   * Returns up to 25 results per category.
   */
  async globalSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return { contacts: [], companies: [], applications: [] };
    }

    const q = query.trim();

    const contacts = filterList(await contactsRepo.findMany(), q, ["firstName", "lastName", "email", "phone"]).slice(0, 25);
    const companies = filterList(await companiesRepo.findMany(), q, ["name", "website", "phone", "address"]).slice(0, 25);

    const applications = filterList(
      await applicationsRepo.findMany(),
      q,
      ["id", "status", "pipelineStage", "currentStep"],
    ).slice(0, 25);

    // Enrich applications with user/company placeholder data
    const users = await usersRepo.findMany();
    const appsWithJoins = (await Promise.all(applications)).map((app: any) => ({
      ...app,
      company: companies.find((c: any) => c?.id === app.companyId) ?? null,
      user: (users as any[]).find((u) => (u as any).id === app.userId) ?? null,
    }));

    return {
      contacts,
      companies,
      applications: appsWithJoins,
    };
  },

  /**
   * Search only contacts
   */
  async searchContacts(query: string) {
    if (!query) return [];
    const q = query.trim();

    return filterList(await contactsRepo.findMany(), q, ["firstName", "lastName", "email", "phone"])
      .slice(0, 50);
  },

  /**
   * Search only companies
   */
  async searchCompanies(query: string) {
    if (!query) return [];
    const q = query.trim();

    return filterList(await companiesRepo.findMany(), q, ["name", "website", "phone", "address"])
      .slice(0, 50);
  },

  /**
   * Search only applications
   */
  async searchApplications(query: string) {
    if (!query) return [];
    const q = query.trim();

    const users = await usersRepo.findMany();

    return filterList(await applicationsRepo.findMany(), q, ["id", "status", "pipelineStage", "currentStep"])
      .slice(0, 50)
      .map((app: any) => ({
        ...app,
        company: null,
        user: (users as any[]).find((u) => (u as any).id === app.userId) ?? null,
      }));
  },
};

export default searchService;

// =============================================================================
// END OF FILE
// =============================================================================
