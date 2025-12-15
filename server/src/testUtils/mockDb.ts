import { randomUUID } from "crypto";
import { users, auditLogs } from "../db/schema";

type UserRecord = typeof users.$inferInsert;
type AuditRecord = typeof auditLogs.$inferInsert;

export function createMockDb() {
  const userStore: UserRecord[] = [];
  const auditStore: AuditRecord[] = [];

  const db = {
    findUserByEmail: async (email: string) => userStore.find((u) => u.email === email) ?? null,
    findUserById: async (id: string) => userStore.find((u) => u.id === id) ?? null,
    select: () => ({
      from: (table: any) => ({
        where: (_where: any) => ({
          limit: async (_count: number) => {
            if (table === users) {
              return userStore;
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
