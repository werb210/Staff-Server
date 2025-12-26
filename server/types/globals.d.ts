declare global {
  // Broadcast helper defined at runtime in server/src/index.ts
  // eslint-disable-next-line no-var
  var broadcast: (payload: any) => void;
}

export {};
