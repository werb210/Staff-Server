"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfigLoaded = setConfigLoaded;
exports.setDbConnected = setDbConnected;
exports.setMigrationsState = setMigrationsState;
exports.setSchemaReady = setSchemaReady;
exports.getStartupState = getStartupState;
exports.resetStartupState = resetStartupState;
const state = {
    configLoaded: false,
    dbConnected: false,
    migrationsHealthy: false,
    schemaReady: false,
    pendingMigrations: [],
};
function setConfigLoaded(loaded) {
    state.configLoaded = loaded;
}
function setDbConnected(connected) {
    state.dbConnected = connected;
}
function setMigrationsState(pendingMigrations) {
    state.pendingMigrations = pendingMigrations;
    state.migrationsHealthy = pendingMigrations.length === 0;
}
function setSchemaReady(ready) {
    state.schemaReady = ready;
}
function getStartupState() {
    return { ...state, pendingMigrations: [...state.pendingMigrations] };
}
function resetStartupState() {
    state.configLoaded = false;
    state.dbConnected = false;
    state.migrationsHealthy = false;
    state.schemaReady = false;
    state.pendingMigrations = [];
}
