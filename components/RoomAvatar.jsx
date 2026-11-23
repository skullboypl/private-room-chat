'use client';

import { getRoomAvatarInitials, getRoomAvatarStyle } from '@/lib/roomAvatar';

export default function RoomAvatar({ roomName, className = '' }) {
  return (
    <span
      className={className}
      style={getRoomAvatarStyle(roomName)}
      aria-hidden="true"
    >
      {getRoomAvatarInitials(roomName)}
    </span>
  );
}
