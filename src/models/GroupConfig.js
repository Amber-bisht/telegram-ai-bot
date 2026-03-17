import mongoose from "mongoose";

const ButtonSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

const GroupConfigSchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, unique: true, index: true },
    rulesText: { type: String, default: null },
    rulesButtons: { type: [ButtonSchema], default: [] },
    lastWelcomeId: { type: Number, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("GroupConfig", GroupConfigSchema);
