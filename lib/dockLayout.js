export const DOCK_WINDOW_WIDTH = 300;
export const DOCK_WINDOW_GAP = 12;
export const DOCK_HORIZONTAL_PADDING = 32;
export const DOCK_RAIL_RESERVE = 168;

export function countVisibleWindows(viewportWidth) {
  const available = Math.max(0, viewportWidth - DOCK_HORIZONTAL_PADDING - DOCK_RAIL_RESERVE);
  return Math.max(1, Math.floor((available + DOCK_WINDOW_GAP) / (DOCK_WINDOW_WIDTH + DOCK_WINDOW_GAP)));
}

export function pickVisibleExpanded(expandedRooms, focusedRoom, maxVisible) {
  if (expandedRooms.length <= maxVisible) return expandedRooms;

  const picked = new Set();
  if (focusedRoom && expandedRooms.includes(focusedRoom)) {
    picked.add(focusedRoom);
  }

  for (let i = expandedRooms.length - 1; i >= 0 && picked.size < maxVisible; i -= 1) {
    picked.add(expandedRooms[i]);
  }

  return expandedRooms.filter((name) => picked.has(name));
}

export function trimExpandedToViewport(expandedRooms, focusedRoom, viewportWidth, exclude = new Set()) {
  const dockExpanded = expandedRooms.filter((name) => !exclude.has(name));
  const maxVisible = countVisibleWindows(viewportWidth);
  const visible = pickVisibleExpanded(dockExpanded, focusedRoom, maxVisible);
  const visibleSet = new Set(visible);

  return expandedRooms.filter((name) => {
    if (!dockExpanded.includes(name)) return true;
    return visibleSet.has(name);
  });
}
