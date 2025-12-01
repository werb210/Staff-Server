// server/src/services/chatService.ts
import messagesRepo from '../db/repositories/messages.repo.js';

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
  const saved = await messagesRepo.create({
    applicationId,
    sender,
    body,
    createdAt: new Date(),
  });

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
  const list = await messagesRepo.findMany({ applicationId });

  return (await list).sort(
    (a: any, b: any) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime(),
  );
}
