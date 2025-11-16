// server/src/db/schema.ts

export interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  status: string;
  createdAt: Date;
}

export interface Lender {
  id: string;
  name: string;
  country: string;
  active: boolean;
}
