import applicationsRepo from "../db/repositories/applications.repo.js";
import companiesRepo from "../db/repositories/companies.repo.js";
import contactsRepo from "../db/repositories/contacts.repo.js";

export const searchService = {
  global: async (term: string) => {
    const apps = await applicationsRepo.search(term).catch(() => []);
    const companies = await companiesRepo.findMany({ name: term }).catch(() => []);
    const contacts = await contactsRepo.findMany({ name: term }).catch(() => []);

    return { applications: apps, companies, contacts };
  },
};

export default searchService;
