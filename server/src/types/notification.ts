export interface Notification {
  id: string;
  silo: string;
  message: string;
  createdAt: Date;
  sentAt: Date | null;
}
