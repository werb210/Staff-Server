"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeApiFetch = exports.apiFetch = void 0;
const api_1 = require("../config/api");
const buildUrl = (path) => `${api_1.API_BASE}${path}`;
const logRequest = (method, path) => {
    console.log("[CLIENT → API]", {
        url: buildUrl(path),
        method,
    });
};
const apiFetch = (path, options) => {
    logRequest(options?.method?.toLowerCase() ?? "get", path);
    return fetch(buildUrl(path), {
        ...options,
    });
};
exports.apiFetch = apiFetch;
const api = {
    get: async (path, opts) => {
        logRequest("get", path);
        const res = await fetch(buildUrl(path), { ...opts });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return res["json"]();
    },
    post: async (path, body, opts) => {
        logRequest("post", path);
        const res = await fetch(buildUrl(path), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            ...opts,
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return res["json"]();
    },
};
exports.default = api;
/**
 * REQUIRED: restore named exports expected by client
 */
const safeApiFetch = async (...args) => {
    try {
        return await api.get(...args);
    }
    catch (err) {
        console.error("safeApiFetch error", err);
        return null;
    }
};
exports.safeApiFetch = safeApiFetch;
