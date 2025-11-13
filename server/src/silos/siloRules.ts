import type { Silo } from "./siloTypes.js";

/**
 * Hard silo enforcement:
 *  - No contact leakage between silos
 *  - No lenders shared between silos
 *  - No documents shared between silos
 *  - No applications shared between silos
 */

export function enforceSiloAccess(
  userSilos: Silo[] | undefined,
  targetSilo: Silo
): boolean {
  if (!userSilos) return false;
  return userSilos.includes(targetSilo);
}

export function verifySiloOrThrow(
  userSilos: Silo[] | undefined,
  targetSilo: Silo
) {
  if (!enforceSiloAccess(userSilos, targetSilo)) {
    throw new Error(`Access denied: silo ${targetSilo}`);
  }
}
