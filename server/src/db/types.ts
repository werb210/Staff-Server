import { companies } from "./schema/companies";
import { contacts } from "./schema/contacts";
import { products } from "./schema/products";

export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Product = typeof products.$inferSelect;
