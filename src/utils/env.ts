export function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}
