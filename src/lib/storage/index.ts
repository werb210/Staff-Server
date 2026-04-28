// BF_AZURE_OCR_TERMSHEET_v44 — storage factory
import path from "node:path";
import { AzureBlobBackend } from "./azureBlob.js";
import { LocalBackend } from "./local.js";
import type { StorageBackend } from "./types.js";

let _instance: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (_instance) return _instance;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER_BF || "bf-documents";
  if (conn) {
    _instance = new AzureBlobBackend(container, conn);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[STORAGE] AZURE_STORAGE_CONNECTION_STRING is required in production");
    }
    _instance = new LocalBackend(path.join(process.cwd(), "uploads", "bf"));
  }
  return _instance;
}

export function __resetStorageForTests() { _instance = null; }
export type { StorageBackend, PutResult } from "./types.js";
