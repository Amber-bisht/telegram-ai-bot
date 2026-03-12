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

export function containsOwnerMention(msg, ownerUsername, ownerUserId) {
  const targetMention = `@${ownerUsername.toLowerCase()}`;
  const { text, entities } = getMessageTextAndEntities(msg);
  if (!text) return false;

  for (const entity of entities) {
    if (entity.type === "mention") {
      const mentioned = text
        .slice(entity.offset, entity.offset + entity.length)
        .trim()
        .toLowerCase();
      if (mentioned === targetMention) return true;
    }
    if (entity.type === "text_mention" && entity.user?.id === ownerUserId) {
      return true;
    }
  }

  const mentionRegex = new RegExp(`(^|\\s)${escapeRegex(targetMention)}\\b`, "i");
  return mentionRegex.test(text);
}

export function stripOwnerMention(text, ownerUsername) {
  if (!text) return "";
  const regex = new RegExp(`(^|\\s)@${escapeRegex(ownerUsername)}\\b`, "ig");
  return text.replace(regex, " ").replace(/\s+/g, " ").trim();
}

export function displayName(user) {
  if (!user) return "Unknown";
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`.trim();
  if (user.first_name) return user.first_name;
  if (user.username) return `@${user.username}`;
  return "Unknown";
}
