"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const db_1 = require("./db");
const migrations_1 = require("./migrations");
async function main() {
    (0, config_1.assertEnv)();
    await (0, db_1.checkDb)();
    await (0, migrations_1.runMigrations)();
    await (0, migrations_1.assertNoPendingMigrations)();
    await (0, db_1.assertSchema)();
}
if (require.main === module) {
    main().catch((err) => {
        console.error("migration_check_failed", err);
        process.exit(1);
    });
}
