"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_ORIGINS = exports.CLIENT_BASE = exports.PUBLIC_BASE = exports.API_BASE = void 0;
exports.API_BASE = process.env.API_BASE_URL ||
    "https://api.staff.boreal.financial";
exports.PUBLIC_BASE = process.env.PUBLIC_BASE_URL ||
    "https://staff.boreal.financial";
exports.CLIENT_BASE = process.env.CLIENT_BASE_URL ||
    "https://client.boreal.financial";
exports.ALLOWED_ORIGINS = [exports.PUBLIC_BASE, exports.CLIENT_BASE];
