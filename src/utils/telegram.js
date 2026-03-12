function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isGroupChat(chatType) {
  return chatType === "group" || chatType === "supergroup";
}

export function isPrivateChat(chatType) {
  return chatType === "private";
}

export function getMessageTextAndEntities(msg) {
  if (msg.text) {
    return { text: msg.text, entities: msg.entities || [] };
  }
  if (msg.caption) {
    return { text: msg.caption, entities: msg.caption_entities || [] };
  }
  return { text: "", entities: [] };
}

export function containsOwnerMention(msg, ownerUsername, ownerUserId, botUsername = null, botUserId = null) {
  const ownerMention = `@${ownerUsername.toLowerCase()}`;
  const botMention = botUsername ? `@${String(botUsername).toLowerCase()}` : null;
  const { text, entities } = getMessageTextAndEntities(msg);
  if (!text) return false;

  for (const entity of entities) {
    if (entity.type === "mention") {
      const mentioned = text
        .slice(entity.offset, entity.offset + entity.length)
        .trim()
        .toLowerCase();
      if (mentioned === ownerMention || (botMention && mentioned === botMention)) return true;
    }
    if (
      entity.type === "text_mention" &&
      (entity.user?.id === ownerUserId || (botUserId && entity.user?.id === botUserId))
    ) {
      return true;
    }
  }

  const ownerRegex = new RegExp(`(^|\\s)${escapeRegex(ownerMention)}\\b`, "i");
  if (ownerRegex.test(text)) return true;
  if (!botMention) return false;
  const botRegex = new RegExp(`(^|\\s)${escapeRegex(botMention)}\\b`, "i");
  return botRegex.test(text);
}

export function stripOwnerMention(text, ownerUsername, botUsername = null) {
  if (!text) return "";
  const targets = [ownerUsername, botUsername]
    .filter(Boolean)
    .map((value) => String(value).replace(/^@/, ""));
  if (!targets.length) return text.trim();
  const escaped = targets.map((value) => escapeRegex(value)).join("|");
  const regex = new RegExp(`(^|\\s)@(?:${escaped})\\b`, "ig");
  return text.replace(regex, " ").replace(/\s+/g, " ").trim();
}

export function displayName(user) {
  if (!user) return "Unknown";
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`.trim();
  if (user.first_name) return user.first_name;
  if (user.username) return `@${user.username}`;
  return "Unknown";
}
