function req(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`ENV_MISSING_${name}`);
  }
  return v;
}

const port = process.env.PORT || "8080";
if (!/^\d+$/.test(port)) {
  throw new Error("ENV_INVALID_PORT");
}

const nodeEnv = process.env.NODE_ENV || "production";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("ENV_INVALID_NODE_ENV");
}

if (nodeEnv === "production") {
  req("JWT_SECRET");
}

export const ENV = {
  PORT: port,
  NODE_ENV: nodeEnv,
  DATABASE_URL: process.env.DATABASE_URL || "",
};

export { req };
