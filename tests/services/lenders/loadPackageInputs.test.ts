// BF_SERVER_v76_BLOCK_1_9
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Buffer } from "node:buffer";
const storeGet = vi.fn();
vi.mock("../../../src/lib/storage/index.js", () => ({ getStorage: () => ({ get: storeGet, put: vi.fn(), delete: vi.fn(), ping: vi.fn(), describe: () => ({ kind: "local" as const }) }) }));
import { loadPackageInputs } from "../../../src/services/lenders/loadPackageInputs";
function fakePool(handler: (sql: string, args: unknown[]) => unknown[]): any { return { query: vi.fn(async (sql: string, args: unknown[] = []) => ({ rows: handler(sql, args) })) }; }
beforeEach(() => { storeGet.mockReset(); });
describe("loadPackageInputs", () => { it("smoke", async () => { const pool=fakePool((sql)=>{ if(sql.includes("metadata, name")) return [{name:"Acme",requested_amount:1,product_category:null,product_type:null,metadata:{business:{name:"Acme"}}}]; if(sql.includes("signnow_document_id")) return [{signnow_document_id:null,signed_application_blob_name:null}]; return [];}); const out=await loadPackageInputs({pool,applicationId:"app-1"}); expect(out.fields.length).toBeGreaterThan(0); expect(out.signedApplicationPdf?.slice(0,5).toString("latin1")).toBe("%PDF-"); }); });
