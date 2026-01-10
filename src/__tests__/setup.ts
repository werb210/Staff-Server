import { installProcessHandlers } from "../observability/processHandlers";
import { setCriticalServicesReady, setDbConnected, setMigrationsState, setSchemaReady } from "../startupState";

process.env.NODE_ENV = "test";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";

setDbConnected(true);
setMigrationsState([]);
setSchemaReady(true);
setCriticalServicesReady(true);
installProcessHandlers();
