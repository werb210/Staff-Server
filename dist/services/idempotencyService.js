"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReplay = saveReplay;
const replayStore = new Map();
function saveReplay(key, payload) {
    if (!replayStore.has(key)) {
        replayStore.set(key, payload);
    }
    return replayStore.get(key);
}
