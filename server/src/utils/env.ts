import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || "5000",
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || "default_secret",
};
