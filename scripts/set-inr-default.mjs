import nextEnv from "@next/env";
import mongoose from "mongoose";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection
    .collection("accounts")
    .updateMany({ currency: { $ne: "INR" } }, { $set: { currency: "INR" } });
  console.log(
    `Updated ${result.modifiedCount} account currency preferences to INR. Expense records were preserved.`,
  );
} finally {
  await mongoose.disconnect();
}
