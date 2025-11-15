import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

export const smsService = {
  send(to: string, body: string) {
    return client.messages.create({
      to,
      from: process.env.TWILIO_FROM,
      body
    });
  }
};
