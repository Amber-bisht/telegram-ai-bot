import mongoose from "mongoose";

const FeedNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const OwnerFeedSchema = new mongoose.Schema(
  {
    ownerUserId: { type: Number, required: true, unique: true, index: true },
    notes: { type: [FeedNoteSchema], default: [] },
    knowledgeNotes: { type: [FeedNoteSchema], default: [] },
    ignoredUserIds: { type: [Number], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("OwnerFeed", OwnerFeedSchema);
