type GlobalState = {
  metrics: {
    requests: number;
    errors: number;
  };
  rateLimit: {
    window: number;
    count: number;
  };
};

const globalScope = globalThis as typeof globalThis & {
  __BF_STATE__?: GlobalState;
};

export const globalState = globalScope.__BF_STATE__ ||= {
  metrics: { requests: 0, errors: 0 },
  rateLimit: { window: 0, count: 0 },
};

export const deps = {
  db: {
    ready: false,
    client: null as any,
  },
  metrics: globalState.metrics,
  rateLimit: globalState.rateLimit,
};

export type Deps = typeof deps;
