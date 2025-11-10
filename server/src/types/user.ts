export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "applicant" | "loan-officer" | "admin";
  createdAt: string;
  updatedAt: string;
}
