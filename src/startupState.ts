export type StartupState = {
  configLoaded: boolean;
  dbConnected: boolean;
  migrationsHealthy: boolean;
  schemaReady: boolean;
  criticalServicesReady: boolean;
  pendingMigrations: string[];
};

const state: StartupState = {
  configLoaded: false,
  dbConnected: false,
  migrationsHealthy: false,
  schemaReady: false,
  criticalServicesReady: false,
  pendingMigrations: [],
};

export function setConfigLoaded(loaded: boolean): void {
  state.configLoaded = loaded;
}

export function setDbConnected(connected: boolean): void {
  state.dbConnected = connected;
}

export function setMigrationsState(pendingMigrations: string[]): void {
  state.pendingMigrations = pendingMigrations;
  state.migrationsHealthy = pendingMigrations.length === 0;
}

export function setSchemaReady(ready: boolean): void {
  state.schemaReady = ready;
}

export function setCriticalServicesReady(ready: boolean): void {
  state.criticalServicesReady = ready;
}

export function getStartupState(): StartupState {
  return { ...state, pendingMigrations: [...state.pendingMigrations] };
}

export function resetStartupState(): void {
  state.configLoaded = false;
  state.dbConnected = false;
  state.migrationsHealthy = false;
  state.schemaReady = false;
  state.criticalServicesReady = false;
  state.pendingMigrations = [];
}
