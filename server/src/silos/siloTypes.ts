export const AllSilos = ["BF", "BI", "SLF"] as const;
export type Silo = (typeof AllSilos)[number];
