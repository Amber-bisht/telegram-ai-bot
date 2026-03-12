import Groq from "groq-sdk";

function compactText(value, maxLen = 240) {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const text = compactText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function extractJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function heuristicMemoryExtract(messageText) {
  const text = (messageText || "").trim();
  if (!text) {
    return {
      shouldStore: false,
      name: null,
      facts: [],
      pastQuestions: [],
      summary: null
    };
  }

  const lowered = text.toLowerCase();
  const nameMatch = text.match(/\b(?:my name is|i am|i'm)\s+([a-z][a-z0-9_-]{1,24})\b/i);
  const interestMatch = text.match(/\binterested in\s+([a-z0-9\s/+_-]{2,80})/i);
  const question = text.includes("?") ? compactText(text, 200) : null;
  const facts = [];

  if (interestMatch) {
    facts.push(`Interested in ${interestMatch[1].trim()}`);
  }

  const shouldStore =
    Boolean(nameMatch) ||
    Boolean(interestMatch) ||
    Boolean(question) ||
    /\bmy\s+name\s+is\b/.test(lowered);

  return {
    shouldStore,
    name: nameMatch ? nameMatch[1] : null,
    facts,
    pastQuestions: question ? [question] : [],
    summary: shouldStore ? compactText(text, 200) : null
  };
}

export class GroqService {
  constructor({ apiKey, model }) {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateOwnerReply({
    assistantName,
    ownerName,
    ownerUsername,
    groupTitle,
    currentDateTime,
    ownerFeedNotes,
    messageText,
    userMemory,
    fromName
  }) {
    const memoryContext = {
      name: userMemory?.name || null,
      facts: userMemory?.facts || [],
      pastQuestions: userMemory?.pastQuestions || [],
      conversationSummaries: userMemory?.conversationSummaries || []
    };

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: [
              `You are ${assistantName}, assistant to ${ownerName}.`,
              `The owner username is @${ownerUsername}.`,
              `Write replies as if they are directly from ${ownerName} in first person.`,
              "Never mention being a bot, AI, assistant, automation, or system.",
              "Keep responses concise and useful (1-4 short sentences).",
              "Use known user context and owner feed instructions only when relevant."
            ].join(" ")
          },
          {
            role: "user",
            content: [
              `Current datetime: ${currentDateTime || new Date().toISOString()}`,
              `Group: ${groupTitle || "Unknown Group"}`,
              `User: ${fromName || "Unknown"}`,
              `Incoming message: ${messageText}`,
              `Known user memory: ${JSON.stringify(memoryContext)}`,
              `Owner feed memory: ${JSON.stringify((ownerFeedNotes || []).slice(-25))}`
            ].join("\n")
          }
        ]
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) return reply;
    } catch (error) {
      console.error("Groq reply generation failed:", error.message);
    }

    const knownName = userMemory?.name || fromName || "there";
    return `Hi ${knownName}. Thanks for tagging me. Could you share a bit more detail so I can help properly?`;
  }

  async extractMeaningfulMemory({ messageText, botReply }) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: [
              "Extract only meaningful long-term user memory from one Telegram message.",
              "Ignore generic greetings and one-off chatter.",
              "Return ONLY valid JSON with keys:",
              'shouldStore (boolean), name (string|null), facts (string[]), pastQuestions (string[]), summary (string|null).'
            ].join(" ")
          },
          {
            role: "user",
            content: [
              `Message from user: ${messageText}`,
              `Bot reply: ${botReply}`
            ].join("\n")
          }
        ]
      });

      const content = completion.choices?.[0]?.message?.content || "";
      const parsed = extractJsonObject(content);
      if (!parsed) {
        return heuristicMemoryExtract(messageText);
      }

      const normalized = {
        shouldStore: Boolean(parsed.shouldStore ?? parsed.should_store),
        name: compactText(parsed.name, 80),
        facts: normalizeStringArray(parsed.facts),
        pastQuestions: normalizeStringArray(parsed.pastQuestions || parsed.past_questions),
        summary: compactText(parsed.summary, 220)
      };

      if (
        !normalized.shouldStore &&
        !normalized.name &&
        normalized.facts.length === 0 &&
        normalized.pastQuestions.length === 0 &&
        !normalized.summary
      ) {
        return { ...normalized, shouldStore: false };
      }

      return normalized;
    } catch (error) {
      console.error("Groq memory extraction failed:", error.message);
      return heuristicMemoryExtract(messageText);
    }
  }
}
