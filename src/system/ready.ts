import type { Deps } from "./deps";

export function isReady(deps: Deps): boolean {
  return deps.db.ready === true;
}
