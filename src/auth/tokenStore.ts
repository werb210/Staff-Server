const tokenVersionStore = new Map<string, number>();

export function getTokenVersion(userId: string): number {
  return tokenVersionStore.get(userId) || 0;
}

export function bumpTokenVersion(userId: string): void {
  tokenVersionStore.set(userId, getTokenVersion(userId) + 1);
}
