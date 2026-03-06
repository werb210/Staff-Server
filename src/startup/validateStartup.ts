export function validateStartup() {
  const required = ["NODE_ENV", "DATABASE_URL"];

  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    console.error("Missing environment variables:", missing.join(", "));
    process.exit(1);
  }

  console.log("Startup validation passed");
}
