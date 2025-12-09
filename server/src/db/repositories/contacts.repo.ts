import { db } from "../db";
import { contacts } from "../schema/contacts";
import { eq } from "drizzle-orm";
import { Contact } from "../types";

class ContactsRepo {
  async findMany(filter?: any): Promise<Contact[]> {
    if (filter?.name) {
      return db
        .select()
        .from(contacts)
        .where(eq(contacts.name, filter.name));
    }

    return db.select().from(contacts);
  }

  async findById(id: string): Promise<Contact | null> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));

    return result[0] ?? null;
  }

  async create(data: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
    const result = await db.insert(contacts).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<Contact>): Promise<Contact | null> {
    const result = await db
      .update(contacts)
      .set(data)
      .where(eq(contacts.id, id))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(contacts).where(eq(contacts.id, id));
    return true;
  }
}

export default new ContactsRepo();
