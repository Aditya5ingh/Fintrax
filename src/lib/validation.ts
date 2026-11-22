import { z } from "zod";
import { CURRENCIES } from "./preferences";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Use at most 72 characters")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((v) => Buffer.byteLength(v, "utf8") <= 72),
});
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});
export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  currency: z.enum(CURRENCIES),
  timezone: z
    .string()
    .max(80)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone"),
});
