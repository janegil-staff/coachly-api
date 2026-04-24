import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("[db] connected to MongoDB");
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    throw err;
  }

  mongoose.connection.on("error", (err) => {
    console.error("[db] error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
