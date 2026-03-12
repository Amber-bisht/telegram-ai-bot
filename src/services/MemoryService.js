import ContactRequest from "../models/ContactRequest.js";
import OwnerFeed from "../models/OwnerFeed.js";
import UserMemory from "../models/UserMemory.js";

function compactText(value, maxLen = 220) {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

function dedupeStrings(values, maxItems = 30) {
  const seen = new Set();
  const result = [];

  for (const raw of values) {
    const text = compactText(raw);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }

  return result;
}

function toGroupInfo(chat) {
  if (!chat) return null;
  return {
    id: chat.id,
    title: chat.title || null,
    username: chat.username || null
  };
}

export class MemoryService {
  constructor({ cache }) {
    this.cache = cache;
    this.ownerFeedCache = new Map();
  }

  async touchUser(user, chat) {
    const now = new Date();
    const doc = await UserMemory.findOneAndUpdate(
      { userId: user.id },
      {
        $setOnInsert: {
          userId: user.id,
          name: user.first_name || null,
          facts: [],
          conversationSummaries: [],
          pastQuestions: []
        },
        $set: {
          username: user.username || null,
          lastSeenGroup: toGroupInfo(chat),
          lastInteractionAt: now
        },
        $inc: {
          messageCount: 1
        }
      },
      { upsert: true, new: true, lean: true }
    );

    this.cache.set(user.id, doc);
    return doc;
  }

  async getUserMemory(userId) {
    const cached = this.cache.get(userId);
    if (cached) return cached;

    const doc = await UserMemory.findOne({ userId }).lean();
    if (!doc) return null;

    this.cache.set(userId, doc);
    return doc;
  }

  async mergeExtractedMemory(userId, extracted) {
    if (!extracted || !extracted.shouldStore) return this.getUserMemory(userId);

    const current = (await this.getUserMemory(userId)) || {};
    const patch = {};

    if (extracted.name && (!current.name || current.name.toLowerCase() === "unknown")) {
      patch.name = compactText(extracted.name, 80);
    }

    const nextFacts = dedupeStrings([...(current.facts || []), ...(extracted.facts || [])], 40);
    if (JSON.stringify(nextFacts) !== JSON.stringify(current.facts || [])) {
      patch.facts = nextFacts;
    }

    const extractedQuestions = [
      ...(extracted.pastQuestions || []),
      ...(extracted.pastQuestion ? [extracted.pastQuestion] : [])
    ];
    const nextQuestions = dedupeStrings([...(current.pastQuestions || []), ...extractedQuestions], 40);
    if (JSON.stringify(nextQuestions) !== JSON.stringify(current.pastQuestions || [])) {
      patch.pastQuestions = nextQuestions;
    }

    const nextSummaries = dedupeStrings(
      [
        ...(current.conversationSummaries || []),
        ...(extracted.summary ? [extracted.summary] : []),
        ...(extracted.conversationSummaries || [])
      ],
      20
    );
    if (JSON.stringify(nextSummaries) !== JSON.stringify(current.conversationSummaries || [])) {
      patch.conversationSummaries = nextSummaries;
    }

    if (!Object.keys(patch).length) return current;

    const updated = await UserMemory.findOneAndUpdate({ userId }, { $set: patch }, { new: true, lean: true });
    if (updated) this.cache.set(userId, updated);
    return updated;
  }

  async logContactRequest({ message, user, chat }) {
    await ContactRequest.create({
      requesterUserId: user.id,
      requesterName: user.first_name || null,
      requesterUsername: user.username || null,
      groupId: chat.id,
      groupTitle: chat.title || null,
      groupUsername: chat.username || null,
      message: compactText(message, 800) || ""
    });

    const updated = await UserMemory.findOneAndUpdate(
      { userId: user.id },
      {
        $setOnInsert: {
          userId: user.id,
          name: user.first_name || null,
          facts: [],
          conversationSummaries: [],
          pastQuestions: []
        },
        $set: {
          username: user.username || null,
          lastSeenGroup: toGroupInfo(chat),
          lastInteractionAt: new Date()
        },
        $inc: {
          contactRequestCount: 1
        }
      },
      { upsert: true, new: true, lean: true }
    );

    this.cache.set(user.id, updated);
  }

  async getStats() {
    const [totalUsers, totalContactRequests] = await Promise.all([
      UserMemory.countDocuments(),
      ContactRequest.countDocuments()
    ]);

    return {
      totalUsers,
      totalContactRequests,
      cache: this.cache.stats()
    };
  }

  async listRecentMemories(limit = 10) {
    return UserMemory.find({})
      .sort({ lastInteractionAt: -1, updatedAt: -1 })
      .limit(limit)
      .lean();
  }

  async clearUser(userId) {
    await UserMemory.deleteOne({ userId });
    this.cache.delete(userId);
  }

  async getOwnerFeed(ownerUserId) {
    const key = String(ownerUserId);
    const cached = this.ownerFeedCache.get(key);
    if (cached) return [...cached];

    const doc = await OwnerFeed.findOne({ ownerUserId }).lean();
    const notes = (doc?.notes || [])
      .map((note) => compactText(note.text, 800))
      .filter(Boolean);

    this.ownerFeedCache.set(key, notes);
    return [...notes];
  }

  async addOwnerFeed(ownerUserId, rawText) {
    const text = compactText(rawText, 800);
    if (!text) {
      throw new Error("Feed text is empty.");
    }

    const updated = await OwnerFeed.findOneAndUpdate(
      { ownerUserId },
      {
        $setOnInsert: { ownerUserId },
        $push: {
          notes: {
            $each: [{ text, createdAt: new Date() }],
            $slice: -120
          }
        }
      },
      { upsert: true, new: true, lean: true }
    );

    const notes = (updated?.notes || [])
      .map((note) => compactText(note.text, 800))
      .filter(Boolean);

    this.ownerFeedCache.set(String(ownerUserId), notes);
    return {
      added: text,
      notes
    };
  }
}
