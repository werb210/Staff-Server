import type { Express } from "express";
import JSZip from "jszip";
import { db, type Silo } from "./db.js";
import { downloadBuffer, uploadBuffer } from "./azureBlob.js";

export const documentService = {
  async upload(silo: Silo, appId: string, file: Express.Multer.File) {
    const id = db.id();
    const key = `${silo}/documents/${id}-${file.originalname}`;

    await uploadBuffer(key, file.buffer, file.mimetype);

    const record = {
      id,
      applicationId: appId,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      key,
      status: "pending",
      uploadedAt: new Date().toISOString(),
    };

    db.documents[silo].data.push(record);
    return record;
  },

  async get(silo: Silo, id: string) {
    return db.documents[silo].data.find((d) => d.id === id);
  },

  async download(silo: Silo, id: string) {
    const doc = await this.get(silo, id);
    if (!doc) throw new Error("Document not found");
    const buffer = await downloadBuffer(doc.key);
    return { buffer, mimeType: doc.mimeType, name: doc.name };
  },

  async accept(silo: Silo, id: string, userId: string) {
    const doc = await this.get(silo, id);
    if (!doc) throw new Error("Document not found");
    doc.status = "accepted";
    (doc as any).acceptedBy = userId;
    (doc as any).acceptedAt = new Date().toISOString();
    return doc;
  },

  async reject(silo: Silo, id: string, userId: string) {
    const doc = await this.get(silo, id);
    if (!doc) throw new Error("Document not found");
    doc.status = "rejected";
    (doc as any).rejectedBy = userId;
    (doc as any).rejectedAt = new Date().toISOString();
    return doc;
  },

  async downloadAll(silo: Silo, appId: string) {
    const docs = db.documents[silo].data.filter((d) => d.applicationId === appId);
    const zip = new JSZip();

    for (const doc of docs) {
      const buffer = await downloadBuffer(doc.key);
      zip.file(doc.name, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `documents-${appId}.zip`;
    return { zipBuffer, fileName };
  },
};
