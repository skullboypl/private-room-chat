export function getMessagePreview(message, t) {
  if (!message) return '';
  if (message.sender === 'System') return message.content;
  if (message.type === 'image') return t?.('preview.image') || '📷 Obraz';
  return String(message.content || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}
