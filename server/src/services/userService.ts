import { randomUUID } from "crypto";
import { UserSchema, type User } from "../schemas/user.schema.js";

export interface UserCreateInput {
  name: string;
  email: string;
  role: User["role"];
}

export class UserService {
  private readonly users = new Map<string, User>();

  constructor(seed?: User[]) {
    seed?.forEach((user) => this.users.set(user.id, user));
  }

  public listUsers(): User[] {
    return Array.from(this.users.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  public getUser(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  public createUser(input: UserCreateInput): User {
    const user = UserSchema.parse({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role,
    });
    this.users.set(user.id, user);
    return user;
  }
}

export const createUserService = (seed?: User[]): UserService => new UserService(seed);
