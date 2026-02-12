export async function retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    return retry(fn, retries - 1);
  }
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  return retry(fn, attempts - 1);
}
