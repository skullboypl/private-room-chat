const { randomUUID } = require('crypto');

const CHANNEL_ID_PATTERN = /^[\w-]{8,64}$/i;

function normalizeRoomChannelId(id) {
  const value = String(id || '').trim().slice(0, 64);
  if (!value || !CHANNEL_ID_PATTERN.test(value)) return '';
  return value;
}

function generateRoomChannelId() {
  return randomUUID();
}

module.exports = {
  normalizeRoomChannelId,
  generateRoomChannelId,
};
