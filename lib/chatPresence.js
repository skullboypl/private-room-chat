function usernamesFromList(users) {
  if (!Array.isArray(users)) return [];
  return users
    .map((item) => (typeof item === 'string' ? item : item?.username || item?.name || ''))
    .filter(Boolean);
}

/** Komunikat systemowy po świeżym dołączeniu — kto już jest na czacie. */
export function buildPresenceSystemMessage(users, assignedUsername, t) {
  const list = usernamesFromList(users);
  const others = list.filter((name) => name !== assignedUsername);

  if (others.length === 0) {
    return t('chat.presenceAlone');
  }

  return t('chat.presenceOthers', {
    users: others.join(', '),
    count: String(others.length),
  });
}

export function createPresenceSystemMessage(roomName, users, assignedUsername, t, formatTime) {
  return {
    messageId: `presence-${roomName}`,
    sender: 'System',
    content: buildPresenceSystemMessage(users, assignedUsername, t),
    timestamp: formatTime(new Date()),
    encrypted: false,
    type: 'text',
  };
}
