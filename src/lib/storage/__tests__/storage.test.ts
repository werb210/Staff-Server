// BF_AZURE_OCR_TERMSHEET_v44 — storage interface test
import { describe, it, expect, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";
import { LocalBackend } from "../local.js";

describe("BF_AZURE_OCR_TERMSHEET_v44 storage", () => {
  let backend: LocalBackend;
  beforeEach(() => {
    backend = new LocalBackend(path.join(os.tmpdir(), `bf-storage-${Date.now()}-${Math.random()}`));
  });
  it("put + get roundtrip", async () => {
    const buf = Buffer.from("hello-bf");
    const r = await backend.put({ buffer: buf, filename: "x.txt", contentType: "text/plain", pathPrefix: "applications/abc" });
    expect(r.blobName.startsWith("applications/abc/")).toBe(true);
    expect(r.hash).toMatch(/^[a-f0-9]{64}$/);
    const got = await backend.get(r.blobName);
    expect(got?.buffer.toString()).toBe("hello-bf");
  });
  it("describe", () => {
    expect(backend.describe().kind).toBe("local");
  });
});
