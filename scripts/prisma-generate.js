#!/usr/bin/env node
const { execSync } = require("child_process");

const placeholderUrl =
  "postgresql://user:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Using placeholder connection string for Prisma Client generation.",
  );
  process.env.DATABASE_URL = placeholderUrl;
}

try {
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (error) {
  console.error("Failed to generate Prisma Client", error);
  process.exit(1);
}
