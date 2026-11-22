import mongoose, { Schema } from "mongoose";
import { DEFAULT_CURRENCY, CURRENCIES } from "@/lib/preferences";
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    sessionVersion: { type: Number, default: 0 },
    resetHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);
const accountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "User",
    },
    currency: { type: String, enum: CURRENCIES, default: DEFAULT_CURRENCY },
    timezone: { type: String, default: "UTC" },
  },
  { timestamps: true },
);
const rateSchema = new Schema({
  key: { type: String, unique: true },
  count: Number,
  expiresAt: { type: Date, index: { expires: 0 } },
});
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Account =
  mongoose.models.Account || mongoose.model("Account", accountSchema);
export const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", rateSchema);
const expenseModelSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      max: 999999999,
      validate: Number.isSafeInteger,
    },
    currency: {
      type: String,
      required: true,
      enum: CURRENCIES,
    },
    date: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true },
);
expenseModelSchema.index({ userId: 1, currency: 1, date: -1, _id: -1 });
export const Expense =
  mongoose.models.Expense || mongoose.model("Expense", expenseModelSchema);
const incomeModelSchema = expenseModelSchema.clone();
incomeModelSchema.add({
  status: {
    type: String,
    enum: ["received", "expected"],
    required: true,
    default: "received",
  },
});
export const Income =
  mongoose.models.Income || mongoose.model("Income", incomeModelSchema);
