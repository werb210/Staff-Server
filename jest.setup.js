process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-01234567890123456789012';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET;
process.env.TOKEN_TRANSPORT = process.env.TOKEN_TRANSPORT ?? 'header';
process.env.AZURE_BLOB_ACCOUNT = process.env.AZURE_BLOB_ACCOUNT ?? 'test-account';
process.env.AZURE_BLOB_KEY = process.env.AZURE_BLOB_KEY ?? 'test-key';
process.env.AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'test-container';

export {};
