"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPS_KILL_SWITCH_KEYS = void 0;
exports.listKillSwitches = listKillSwitches;
exports.setKillSwitch = setKillSwitch;
exports.isKillSwitchEnabled = isKillSwitchEnabled;
const db_1 = require("../../db");
const config_1 = require("../../config");
exports.OPS_KILL_SWITCH_KEYS = [
    "replay",
    "exports",
    "lender_transmission",
    "ocr",
];
function getEnvKillSwitch(key) {
    if (key === "replay") {
        return (0, config_1.getOpsKillSwitchReplay)();
    }
    if (key === "exports") {
        return (0, config_1.getOpsKillSwitchExports)();
    }
    if (key === "ocr") {
        return (0, config_1.getOpsKillSwitchOcr)();
    }
    return (0, config_1.getOpsKillSwitchLenderTransmission)();
}
async function listKillSwitches() {
    const result = await db_1.pool.query("select key, enabled from ops_kill_switches");
    const dbMap = new Map(result.rows.map((row) => [row.key, row.enabled]));
    return exports.OPS_KILL_SWITCH_KEYS.map((key) => {
        const envEnabled = getEnvKillSwitch(key);
        const dbEnabled = dbMap.get(key) ?? false;
        return {
            key,
            enabled: envEnabled || dbEnabled,
            envEnabled,
            dbEnabled,
        };
    });
}
async function setKillSwitch(key, enabled) {
    await db_1.pool.query(`insert into ops_kill_switches (key, enabled, updated_at)
     values ($1, $2, now())
     on conflict (key)
     do update set enabled = excluded.enabled, updated_at = excluded.updated_at`, [key, enabled]);
}
async function isKillSwitchEnabled(key) {
    if (getEnvKillSwitch(key)) {
        return true;
    }
    const result = await db_1.pool.query("select enabled from ops_kill_switches where key = $1", [key]);
    return result.rows[0]?.enabled ?? false;
}
