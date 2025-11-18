import { prisma } from "../db/prisma.js";

export type SearchType =
  | "contacts"
  | "companies"
  | "deals"
  | "applications"
  | "documents";

type GlobalSearchParams = {
  q: string;
  type: SearchType | string | null;
  limit: number;
};

type SuggestParams = {
  q: string;
};

type SearchResult = {
  type: SearchType;
  id: string;
  title: string;
  subtitle?: string;
  record: unknown;
};

const allowedTypes: SearchType[] = [
  "contacts",
  "companies",
  "deals",
  "applications",
  "documents",
];

async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.warn("[searchService] query skipped", error);
    return [];
  }
}

function normalizeQuery(q: string) {
  return q.trim();
}

function mapResults(
  type: SearchType,
  rows: Record<string, any>[]
): SearchResult[] {
  return rows.map((row) => ({
    type,
    id: String(row.id ?? ""),
    title:
      row.name ??
      row.title ??
      [row.firstName, row.lastName].filter(Boolean).join(" ") ??
      row.id ??
      "",
    subtitle:
      row.email ??
      row.status ??
      row.productType ??
      row.phone ??
      row.website ??
      undefined,
    record: row,
  }));
}

const searchService = {
  async globalSearch({ q, type, limit }: GlobalSearchParams) {
    const query = normalizeQuery(q);
    if (!query) return [] as SearchResult[];

    const typesToSearch = type && allowedTypes.includes(type as SearchType)
      ? [type as SearchType]
      : allowedTypes;

    const results: SearchResult[] = [];

    for (const searchType of typesToSearch) {
      const rows = await this.searchByType(searchType, query, limit);
      results.push(...mapResults(searchType, rows));
    }

    return results.slice(0, limit);
  },

  async recent() {
    const results: SearchResult[] = [];

    const recentQueries: [SearchType, () => Promise<Record<string, any>[]>][] = [
      ["contacts", () => safeQuery(() => prisma.contact.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }))],
      ["companies", () => safeQuery(() => prisma.company.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }))],
      ["deals", () => safeQuery(() => (prisma as any).deal?.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }) ?? Promise.resolve([]))],
      ["applications", () => safeQuery(() => prisma.application.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }))],
      ["documents", () => safeQuery(() => (prisma as any).document?.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }) ?? Promise.resolve([]))],
    ];

    for (const [type, query] of recentQueries) {
      const rows = await query();
      results.push(...mapResults(type, rows));
    }

    return results;
  },

  async suggest({ q }: SuggestParams) {
    const suggestions = await this.globalSearch({ q, type: null, limit: 10 });
    return suggestions;
  },

  async searchByType(type: SearchType, q: string, limit: number) {
    const query = normalizeQuery(q);

    const containsFilter = (field: string) => ({ contains: query, mode: "insensitive" as const });

    switch (type) {
      case "contacts":
        return safeQuery(() =>
          prisma.contact.findMany({
            where: {
              OR: [
                { firstName: containsFilter("firstName") },
                { lastName: containsFilter("lastName") },
                { email: containsFilter("email") },
                { phone: containsFilter("phone") },
              ],
            },
            take: limit,
          })
        );
      case "companies":
        return safeQuery(() =>
          prisma.company.findMany({
            where: {
              OR: [
                { name: containsFilter("name") },
                { website: containsFilter("website") },
                { phone: containsFilter("phone") },
                { address: containsFilter("address") },
              ],
            },
            take: limit,
          })
        );
      case "deals": {
        const dealModel = (prisma as any).deal;
        if (!dealModel) return [];
        return safeQuery(() =>
          dealModel.findMany({
            where: {
              OR: [
                { status: containsFilter("status") },
                { terms: containsFilter("terms") },
              ],
            },
            take: limit,
          })
        );
      }
      case "applications":
        return safeQuery(() =>
          prisma.application.findMany({
            where: {
              OR: [
                { productType: containsFilter("productType") },
                { status: containsFilter("status") },
                { companyId: containsFilter("companyId") },
                { userId: containsFilter("userId") },
              ],
            },
            take: limit,
          })
        );
      case "documents": {
        const documentModel = (prisma as any).document;
        if (!documentModel) return [];
        return safeQuery(() =>
          documentModel.findMany({
            where: {
              OR: [
                { name: containsFilter("name") },
                { title: containsFilter("title") },
                { id: containsFilter("id") },
              ],
            },
            take: limit,
          })
        );
      }
      default:
        return [];
    }
  },
};

export default searchService;
