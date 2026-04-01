import { deps } from "./deps";

let lastReady = 0;

export function isReady() {
  if (deps.db.ready) {
    lastReady = Date.now();
    return true;
  }

  return Date.now() - lastReady < 5000;
}
