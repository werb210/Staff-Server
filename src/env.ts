const required = ["JWT_SECRET"];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
});
