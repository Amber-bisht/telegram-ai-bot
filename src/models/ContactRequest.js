import mongoose from "mongoose";

const ContactRequestSchema = new mongoose.Schema(
  {
    requesterUserId: { type: Number, required: true, index: true },
    requesterName: { type: String, default: null },
    requesterUsername: { type: String, default: null },
    groupId: { type: Number, required: true, index: true },
    groupTitle: { type: String, default: null },
    groupUsername: { type: String, default: null },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("ContactRequest", ContactRequestSchema);
