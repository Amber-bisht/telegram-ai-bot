import mongoose from "mongoose";

const GroupMessageSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    name: { type: String, default: "Unknown" },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const GroupMemorySchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, unique: true, index: true },
    chatTitle: { type: String, default: null },
    messages: { type: [GroupMessageSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("GroupMemory", GroupMemorySchema);
