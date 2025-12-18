import { randomUUID } from "crypto";
import { users, auditLogs } from "../db/schema";

type UserRecord = typeof users.$inferInsert;
type AuditRecord = typeof auditLogs.$inferInsert;

export function createMockDb() {
  const userStore: UserRecord[] = [];
  const auditStore: AuditRecord[] = [];

  const db = {
    findUserByEmail: async (email: string) => {
      const normalized = email.trim().toLowerCase();
      return userStore.find((u) => u.email === normalized) ?? null;
    },
    findUserById: async (id: string) => userStore.find((u) => u.id === id) ?? null,
    select: (selection?: Record<string, any>) => ({
      from: (table: any) => ({
        where: (_where: any) => ({
          limit: async (_count: number) => {
            if (table === users) {
              const emailFilter = typeof _where?.value === "string" ? _where.value : undefined;
              const results = emailFilter
                ? userStore.filter((u) => u.email === emailFilter)
                : [...userStore];

              if (!selection) return results as any;

              return results.map((row) => {
                const mapped: Record<string, any> = {};
                for (const key of Object.keys(selection)) {
                  const column = selection[key];
                  const columnName = typeof column?.name === "string" ? column.name : key;
                  mapped[key] = (row as any)[columnName];
                }
                return mapped;
              });
            }
            return [];
          },
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (payload: any) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        if (table === auditLogs) {
          const saved = rows.map((row) => ({
            ...row,
            id: row.id ?? randomUUID(),
          }));
          auditStore.push(...saved);
          return { returning: async () => saved } as any;
        }
        if (table === users) {
          const saved = rows.map((row) => ({
            ...row,
            id: row.id ?? randomUUID(),
          }));
          userStore.push(...saved);
          return { returning: async () => saved } as any;
        }
        return { returning: async () => rows } as any;
      },
    }),
    query: {
      users: {
        findFirst: async ({ where }: any) => {
          if (typeof where === "function") {
            return where(userStore);
          }
          const email = (where as any)?.value ?? (where as any)?.email ?? undefined;
          if (email) {
            return userStore.find((u) => u.email === email) ?? null;
          }
          return null;
        },
      },
    },
  };

  return { db, userStore, auditStore };
}
