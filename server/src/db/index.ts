export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
}

export const db = {
  users: [] as DbUser[],
};
