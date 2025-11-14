import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { db, type Silo } from "./db.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const client = twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_AUTH!
);

export const communicationService = {
  async sendSMS(silo: Silo, { to, message }: any) {
    const record = {
      id: db.id(),
      direction: "outgoing",
      to,
      message,
      silo,
      sentAt: new Date().toISOString(),
    };
    db.communications[silo].data.push(record);

    await client.messages.create({
      from: process.env.TWILIO_FROM!,
      to,
      body: message,
    });

    return record;
  },

  async sendEmail(silo: Silo, { to, subject, html }: any) {
    const record = {
      id: db.id(),
      to,
      subject,
      html,
      silo,
      sentAt: new Date().toISOString(),
    };

    db.communications[silo].data.push(record);

    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM!,
      subject,
      html,
    });

    return record;
  },
};
