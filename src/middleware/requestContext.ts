export function getRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getRequestDbProcessIds(): string[] {
  return [];
}
