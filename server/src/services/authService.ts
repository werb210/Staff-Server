import usersRepo, { User } from "../db/repositories/users.repo";

export interface AuthResult {
  user: User;
}

const authService = {
  async register(email: string, password: string, role: string = "staff"): Promise<AuthResult> {
    const existing = await usersRepo.findByEmail(email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const user = await usersRepo.create({ email, password, role });
    return { user };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    // Find by email
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // NOTE: plain-text for now; replace with proper hashing later
    if (user.password !== password) {
      throw new Error("Invalid credentials");
    }

    return { user };
  },

  async getUserById(id: string): Promise<User | null> {
    return usersRepo.findById(id);
  },
};

export default authService;
