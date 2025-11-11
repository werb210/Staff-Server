import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api";
import { CallLog, EmailMessage, EmailThread, SmsMessage, SmsThread } from "../types/api";

function addSmsToThreads(threads: SmsThread[], message: SmsMessage): SmsThread[] {
  const contact = message.direction === "outbound" ? message.to : message.from;
  const existing = threads.find((thread) => thread.contact === contact);
  const messages = existing ? [message, ...existing.messages] : [message];
  const updatedThread: SmsThread = existing
    ? { ...existing, messages }
    : { contact, messages };
  const filtered = threads.filter((thread) => thread.contact !== contact);
  return [updatedThread, ...filtered].map((thread) => ({
    ...thread,
    messages: [...thread.messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
  }));
}

function addEmailToThreads(threads: EmailThread[], message: EmailMessage): EmailThread[] {
  const contact = message.direction === "outbound" ? message.to : message.from;
  const existing = threads.find((thread) => thread.contact === contact);
  const messages = existing ? [message, ...existing.messages] : [message];
  const updatedThread: EmailThread = existing
    ? { ...existing, messages }
    : { contact, messages };
  const filtered = threads.filter((thread) => thread.contact !== contact);
  return [updatedThread, ...filtered].map((thread) => ({
    ...thread,
    messages: [...thread.messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
  }));
}

export function useCommunication() {
  const [smsThreads, setSmsThreads] = useState<SmsThread[]>([]);
  const [emailThreads, setEmailThreads] = useState<EmailThread[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [sms, email, calls] = await Promise.all([
        apiClient.getSmsThreads(),
        apiClient.getEmailThreads(),
        apiClient.getCallLogs(),
      ]);
      setSmsThreads(sms);
      setEmailThreads(email);
      setCallLogs(calls);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load communications.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendSms = useCallback(async (payload: { to: string; from?: string; body: string }) => {
    const message = await apiClient.sendSms(payload);
    setSmsThreads((prev) => addSmsToThreads(prev, message));
    return message;
  }, []);

  const receiveSms = useCallback(async (payload: { from: string; to?: string; body: string }) => {
    const message = await apiClient.receiveSms(payload);
    setSmsThreads((prev) => addSmsToThreads(prev, message));
    return message;
  }, []);

  const sendEmail = useCallback(
    async (payload: { to: string; subject: string; body: string; from?: string }) => {
      const message = await apiClient.sendEmail(payload);
      setEmailThreads((prev) => addEmailToThreads(prev, message));
      return message;
    },
    [],
  );

  const receiveEmail = useCallback(
    async (payload: { from: string; to: string; subject: string; body: string }) => {
      const message = await apiClient.receiveEmail(payload);
      setEmailThreads((prev) => addEmailToThreads(prev, message));
      return message;
    },
    [],
  );

  const logCall = useCallback(
    async (payload: Pick<CallLog, "to" | "from" | "durationSeconds" | "notes" | "outcome">) => {
      const call = await apiClient.logCall(payload);
      setCallLogs((prev) => [call, ...prev]);
      return call;
    },
    [],
  );

  return {
    smsThreads,
    emailThreads,
    callLogs,
    loading,
    error,
    refresh,
    sendSms,
    receiveSms,
    sendEmail,
    receiveEmail,
    logCall,
  };
}

export type UseCommunicationReturn = ReturnType<typeof useCommunication>;
