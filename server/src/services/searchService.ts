// =============================================================================
// server/src/services/searchService.ts
// BLOCK 25 — Full Prisma rewrite (Contacts, Companies, Applications)
// =============================================================================

import db from "../db/index";

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

    // --------------------------------------------
    // CONTACTS
    // --------------------------------------------
    const contacts = await db.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    // --------------------------------------------
    // COMPANIES
    // --------------------------------------------
    const companies = await db.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { website: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    // --------------------------------------------
    // APPLICATIONS
    // --------------------------------------------
    const applications = await db.application.findMany({
      where: {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { status: { contains: q, mode: "insensitive" } },
          { productType: { contains: q, mode: "insensitive" } },
          {
            company: {
              name: { contains: q, mode: "insensitive" },
            },
          },
          {
            user: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    return {
      contacts,
      companies,
      applications,
    };
  },

  /**
   * Search only contacts
   */
  async searchContacts(query: string) {
    if (!query) return [];
    const q = query.trim();

    return db.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });
  },

  /**
   * Search only companies
   */
  async searchCompanies(query: string) {
    if (!query) return [];
    const q = query.trim();

    return db.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { website: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });
  },

  /**
   * Search only applications
   */
  async searchApplications(query: string) {
    if (!query) return [];
    const q = query.trim();

    return db.application.findMany({
      where: {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { status: { contains: q, mode: "insensitive" } },
          { productType: { contains: q, mode: "insensitive" } },
          {
            company: {
              name: { contains: q, mode: "insensitive" },
            },
          },
          {
            user: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      include: {
        company: true,
        user: true,
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });
  },
};

export default searchService;

// =============================================================================
// END OF FILE
// =============================================================================
