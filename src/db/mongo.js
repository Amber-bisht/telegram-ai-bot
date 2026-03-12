import mongoose from "mongoose";

export async function connectMongo(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });
  return mongoose.connection;
}
