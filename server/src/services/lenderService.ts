import { db, type Silo } from "./db.js";

export const lenderService = {
  list(silo: Silo) {
    return db.lenders[silo].data;
  },

  create(silo: Silo, data: any) {
    const record = { id: db.id(), ...data, createdAt: new Date().toISOString() };
    db.lenders[silo].data.push(record);
    return record;
  },

  update(silo: Silo, id: string, updates: any) {
    const list = db.lenders[silo].data;
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    return list[idx];
  },

  remove(silo: Silo, id: string) {
    const list = db.lenders[silo].data;
    const exists = list.some((l) => l.id === id);
    db.lenders[silo].data = list.filter((l) => l.id !== id);
    return exists;
  },

  listProducts(silo: Silo, lenderId: string) {
    return db.products[silo].data.filter((p) => p.lenderId === lenderId);
  },

  createProduct(silo: Silo, lenderId: string, data: any) {
    const record = {
      id: db.id(),
      lenderId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    db.products[silo].data.push(record);
    return record;
  },
};
