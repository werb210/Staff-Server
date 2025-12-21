"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDb = createMockDb;
const crypto_1 = require("crypto");
const schema_1 = require("../db/schema");
function createMockDb() {
    const userStore = [];
    const auditStore = [];
    const db = {
        findUserByEmail: async (email) => {
            const normalized = email.trim().toLowerCase();
            return userStore.find((u) => u.email === normalized) ?? null;
        },
        findUserById: async (id) => userStore.find((u) => u.id === id) ?? null,
        select: (selection) => ({
            from: (table) => ({
                where: (_where) => ({
                    limit: async (_count) => {
                        if (table === schema_1.users) {
                            const emailFilter = typeof _where?.value === "string" ? _where.value : undefined;
                            const results = emailFilter
                                ? userStore.filter((u) => u.email === emailFilter)
                                : [...userStore];
                            if (!selection)
                                return results;
                            return results.map((row) => {
                                const mapped = {};
                                for (const key of Object.keys(selection)) {
                                    const column = selection[key];
                                    const columnName = typeof column?.name === "string" ? column.name : key;
                                    mapped[key] = row[columnName];
                                }
                                return mapped;
                            });
                        }
                        return [];
                    },
                }),
            }),
        }),
        insert: (table) => ({
            values: (payload) => {
                const rows = Array.isArray(payload) ? payload : [payload];
                if (table === schema_1.auditLogs) {
                    const saved = rows.map((row) => ({
                        ...row,
                        id: row.id ?? (0, crypto_1.randomUUID)(),
                    }));
                    auditStore.push(...saved);
                    return { returning: async () => saved };
                }
                if (table === schema_1.users) {
                    const saved = rows.map((row) => ({
                        ...row,
                        id: row.id ?? (0, crypto_1.randomUUID)(),
                    }));
                    userStore.push(...saved);
                    return { returning: async () => saved };
                }
                return { returning: async () => rows };
            },
        }),
        query: {
            users: {
                findFirst: async ({ where }) => {
                    if (typeof where === "function") {
                        return where(userStore);
                    }
                    const email = where?.value ?? where?.email ?? undefined;
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
