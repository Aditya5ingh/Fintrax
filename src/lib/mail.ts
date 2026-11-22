import nodemailer from "nodemailer";
export async function sendReset(email: string, token: string) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM)
    throw new Error("Email provider not configured");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  const url = new URL("/reset-password", process.env.NEXTAUTH_URL);
  url.searchParams.set("token", token);
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your FinanceFlow password",
    text: `Reset your password using this link within 20 minutes: ${url.toString()}\nIf you did not request this, ignore this email.`,
  });
}
