import { request } from "./http";
import { CallLog, EmailMessage, SmsMessage } from "../types/api";

export const listSmsMessages = () =>
  request<SmsMessage[]>({
    url: "/api/communication/sms",
    method: "GET",
  });

export const sendSms = (payload: { to: string; from?: string; body: string }) =>
  request<SmsMessage>({
    url: "/api/communication/sms/send",
    method: "POST",
    data: payload,
  });

export const receiveSms = (payload: { from: string; to?: string; body: string }) =>
  request<SmsMessage>({
    url: "/api/communication/sms/receive",
    method: "POST",
    data: payload,
  });

export const listEmailMessages = () =>
  request<EmailMessage[]>({
    url: "/api/communication/email",
    method: "GET",
  });

export const sendEmail = (payload: { to: string; subject: string; body: string; from?: string }) =>
  request<EmailMessage>({
    url: "/api/communication/email/send",
    method: "POST",
    data: payload,
  });

export const receiveEmail = (payload: { from: string; to: string; subject: string; body: string }) =>
  request<EmailMessage>({
    url: "/api/communication/email/receive",
    method: "POST",
    data: payload,
  });

export const listCallLogs = () =>
  request<CallLog[]>({
    url: "/api/communication/calls",
    method: "GET",
  });

export const logCall = (payload: Pick<CallLog, "to" | "from" | "durationSeconds" | "notes" | "outcome">) =>
  request<CallLog>({
    url: "/api/communication/calls/log",
    method: "POST",
    data: payload,
  });
