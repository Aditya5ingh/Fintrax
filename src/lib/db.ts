import mongoose from "mongoose";
const cache = globalThis as typeof globalThis & {
  mongo?: Promise<typeof mongoose>;
};
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (!cache.mongo)
    cache.mongo = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .catch((e) => {
        cache.mongo = undefined;
        throw e;
      });
  return cache.mongo;
}
