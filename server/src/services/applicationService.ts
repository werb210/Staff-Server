import { db, type Silo } from "./db.js";

export const applicationService = {
  listBySilo(silo: Silo) {
    return db.applications[silo].data;
  },

  create(data: any) {
    const silo = data.silo as Silo;
    const record = { id: db.id(), ...data, createdAt: new Date().toISOString() };
    db.applications[silo].data.push(record);
    return record;
  },

  getById(silo: Silo, id: string) {
    return db.applications[silo].data.find((a) => a.id === id);
  },

  update(silo: Silo, id: string, updates: any) {
    const list = db.applications[silo].data;
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    return list[idx];
  },

  remove(silo: Silo, id: string) {
    const list = db.applications[silo].data;
    const exists = list.some((a) => a.id === id);
    db.applications[silo].data = list.filter((a) => a.id !== id);
    return exists;
  },
};
