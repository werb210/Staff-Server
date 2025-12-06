declare module "../src/db/repositories/companies.repo" {
  export interface Company {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  const companiesRepo: {
    findMany(filter?: any): Promise<Company[]>;
    findById(id: string): Promise<Company | null>;
    create(data: any): Promise<Company>;
    update(id: string, data: any): Promise<Company>;
    delete(id: string): Promise<void>;
  };

  export default companiesRepo;
}

declare module "../src/db/repositories/contacts.repo" {
  export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  const contactsRepo: {
    findMany(filter?: any): Promise<Contact[]>;
    findById(id: string): Promise<Contact | null>;
    create(data: any): Promise<Contact>;
    update(id: string, data: any): Promise<Contact>;
    delete(id: string): Promise<void>;
  };

  export default contactsRepo;
}

declare module "../src/db/repositories/products.repo" {
  export interface Product {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  const productsRepo: {
    findMany(filter?: any): Promise<Product[]>;
    findById(id: string): Promise<Product | null>;
    create(data: any): Promise<Product>;
    update(id: string, data: any): Promise<Product>;
    delete(id: string): Promise<void>;
  };

  export default productsRepo;
}
