// server/src/services/chatService.ts
import { db } from '../db/db.js';
import { messages } from '../db/schema/messages.js';
import { eq } from 'drizzle-orm';

declare const broadcast: (payload: any) => void;

//
// ======================================================
//  SEND MESSAGE
// ======================================================
//
export async function sendMessage(
  applicationId: string,
  sender: 'client' | 'staff' | 'ai',
  body: string
) {
  const [saved] = await db
    .insert(messages)
    .values({
      applicationId,
      sender,
      body,
      createdAt: new Date(),
    })
    .returning();

  //
  // Real-time broadcast to everyone connected to this silo
  //
  broadcast({
    type: 'message',
    applicationId,
    message: saved,
  });

  return saved;
}

//
// ======================================================
//  GET ALL MESSAGES FOR APPLICATION
// ======================================================
//
export async function getMessages(applicationId: string) {
  const list = await db
    .select()
    .from(messages)
    .where(eq(messages.applicationId, applicationId))
    .orderBy(messages.createdAt);

  return list;
}
