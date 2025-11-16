export interface Deal {
  id: string;
  name: string;
  status: string;
  amount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
