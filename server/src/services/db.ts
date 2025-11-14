import { randomUUID } from "crypto";

export type Silo = "BF" | "BI" | "SLF";

interface Table<T> {
  data: T[];
}

class InMemoryDB {
  applications: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  documents: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  lenders: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  products: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  pipeline: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  communications: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  notifications: Record<Silo, Table<any>> = {
    BF: { data: [] },
    BI: { data: [] },
    SLF: { data: [] },
  };

  users: Table<any> = { data: [] };

  auditLogs: any[] = [];

  id() {
    return randomUUID();
  }
}

export const db = new InMemoryDB();
