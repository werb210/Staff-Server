// Ambient Prisma client type declarations to allow compilation when a generated
// client is unavailable in this environment. These are intentionally loose and
// should be replaced by the real Prisma client types in production.

declare module '@prisma/client' {
  export type Application = any;
  export type Company = any;
  export type Contact = any;
  export type Lender = any;
  export type User = any;

  export class PrismaClient {
    [key: string]: any;
  }

  export namespace Prisma {
    type ApplicationUncheckedCreateInput = any;
    type ApplicationUncheckedUpdateInput = any;
    type CompanyGetPayload<T = any> = any;
    type CompanyUncheckedCreateInput = any;
    type CompanyUncheckedUpdateInput = any;
    type ContactGetPayload<T = any> = any;
    type ContactUncheckedCreateInput = any;
    type ContactUncheckedUpdateInput = any;
    type LenderUncheckedCreateInput = any;
    type LenderUncheckedUpdateInput = any;
    type Sql = any;

    function sql(strings: TemplateStringsArray, ...values: any[]): Sql;
    function join(values: any[], separator?: string): Sql;
  }

  export const Prisma: typeof Prisma;
  export default PrismaClient;
}

declare global {
  // Broadcast helper defined at runtime in server/src/index.ts
  // eslint-disable-next-line no-var
  var broadcast: (payload: any) => void;
}

export {};
