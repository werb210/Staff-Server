import { afterEach, jest } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.AZURE_POSTGRES_URL = process.env.AZURE_POSTGRES_URL || "postgres://user:pass@localhost:5432/testdb";
process.env.AZURE_BLOB_ACCOUNT = process.env.AZURE_BLOB_ACCOUNT || "test";
process.env.AZURE_BLOB_KEY = process.env.AZURE_BLOB_KEY || "test";
process.env.AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-123456789";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret-123456789";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret-123456789";
process.env.TOKEN_TRANSPORT = process.env.TOKEN_TRANSPORT || "both";

afterEach(() => {
  jest.clearAllMocks();
});
