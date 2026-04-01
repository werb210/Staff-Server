type QueryResult = {
  rows: unknown[];
  rowCount: number;
};

const query = async (..._args: any[]): Promise<QueryResult> => {
  return { rows: [], rowCount: 0 };
};

type PrismaModelStub = {
  findMany: (..._args: any[]) => Promise<unknown[]>;
  findUnique: (..._args: any[]) => Promise<unknown | null>;
  create: (..._args: any[]) => Promise<unknown>;
  update: (..._args: any[]) => Promise<unknown>;
  delete: (..._args: any[]) => Promise<unknown | null>;
  upsert: (..._args: any[]) => Promise<unknown>;
};

const createModelStub = (): PrismaModelStub => ({
  findMany: async () => [],
  findUnique: async () => null,
  create: async (args?: any) => args?.data ?? null,
  update: async (args?: any) => args?.data ?? null,
  delete: async () => null,
  upsert: async (args?: any) => args?.create ?? null,
});

export const db: any = new Proxy(
  {
    query,
    $connect: async () => undefined,
    $disconnect: async () => undefined,
  },
  {
    get(target, prop: string | symbol) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }

      if (typeof prop === "string") {
        return createModelStub();
      }

      return undefined;
    },
  }
);

export const queryDb: any = Object.assign(
  (...args: any[]) => query(...args),
  { query }
);

export const getPrisma = () => {
  return db;
};
