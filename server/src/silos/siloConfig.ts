import type { Silo } from "./siloTypes.js";

/**
 * Configuration for each silo.
 * This determines:
 *  - data isolation
 *  - document isolation
 *  - lender isolation
 *  - routing restrictions
 *  - AI rules (later)
 */
export const SiloConfig: Record<Silo, {
  name: string;
  color: string;
  allowCrossAccess: boolean;
}> = {
  BF: {
    name: "Boreal Financial",
    color: "#1F4FFF",
    allowCrossAccess: false
  },
  BI: {
    name: "Boreal Intelligence",
    color: "#FF7A1F",
    allowCrossAccess: false
  },
  SLF: {
    name: "Site Level Financial",
    color: "#0BBE4F",
    allowCrossAccess: false
  }
};
