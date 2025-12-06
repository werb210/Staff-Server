// server/src/types/repo-shims.d.ts
// Type-only shims so controllers/services stop complaining about missing methods
// on the in-memory repositories. Runtime implementations already exist.

// Companies repo
declare module "../db/repositories/companies.repo" {
  type CompanyRecord = {
    id: string;
    name?: string;
    [key: string]: any;
  };

  const _default: {
    findMany(filter?: any): Promise<CompanyRecord[]>;
    findById(id: string): Promise<CompanyRecord | null>;
    create(data: any): Promise<CompanyRecord>;
    update(id: string, data: any): Promise<CompanyRecord | null>;
    delete(id: string): Promise<CompanyRecord | null>;
  };

  export default _default;
}

// Contacts repo
declare module "../db/repositories/contacts.repo" {
  type ContactRecord = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyId?: string;
    [key: string]: any;
  };

  const _default: {
    findMany(filter?: any): Promise<ContactRecord[]>;
    findById(id: string): Promise<ContactRecord | null>;
    create(data: any): Promise<ContactRecord>;
    update(id: string, data: any): Promise<ContactRecord | null>;
    delete(id: string): Promise<ContactRecord | null>;
  };

  export default _default;
}

// Products repo
declare module "../db/repositories/products.repo" {
  type ProductRecord = {
    id: string;
    name?: string;
    [key: string]: any;
  };

  const _default: {
    findMany(filter?: any): Promise(ProductRecord[]>;
    findById(id: string): Promise(ProductRecord | null>;
    create(data: any): Promise<ProductRecord>;
    update(id: string, data: any): Promise<ProductRecord | null>;
    delete(id: string): Promise<ProductRecord | null>;
  };

  export default _default;
}
