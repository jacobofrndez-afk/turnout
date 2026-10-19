// Twilio WhatsApp sandbox adapter. Active only when TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set.
import twilio from "twilio";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

export async function sendWhatsApp(to: string, body: string): Promise<string> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const msg = await client.messages.create({ from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`, to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`, body });
  return msg.sid;
}
