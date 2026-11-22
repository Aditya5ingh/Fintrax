import { createHash, randomBytes } from "crypto";
import { RateLimit } from "@/models";
import { connectDB } from "./db";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newResetToken = () => randomBytes(32).toString("hex");
export async function rateLimit(key: string, maximum = 5, windowMs = 900000) {
  await connectDB();
  const bucket = Math.floor(Date.now() / windowMs);
  const record = await RateLimit.findOneAndUpdate(
    { key: hashToken(`${key}:${bucket}`) },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
    },
    { upsert: true, new: true },
  );
  if (record.count > maximum)
    throw new Error("Too many attempts. Please try again later.");
}
export function checkOrigin(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.NEXTAUTH_URL || "http://localhost:3000").origin
  )
    throw new Error("Invalid request origin");
}
