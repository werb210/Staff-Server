import type { Silo } from "../silos/siloTypes.js";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "marketing" | "lender" | "referrer";
  silos: Silo[];
}
