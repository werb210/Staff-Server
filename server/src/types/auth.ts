import type { JwtPayload } from "jsonwebtoken";
import type { Silo } from "./silo.js";

export interface JwtUserPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
  silos: Silo[];
}
