export const DISCOVER_SORT_NAME = 'name';
export const DISCOVER_SORT_NAME_DESC = 'nameDesc';
export const DISCOVER_SORT_USERS = 'users';
export const DISCOVER_SORT_USERS_ASC = 'usersAsc';

export const DISCOVER_SORT_OPTIONS = [
  DISCOVER_SORT_NAME,
  DISCOVER_SORT_NAME_DESC,
  DISCOVER_SORT_USERS,
  DISCOVER_SORT_USERS_ASC,
];

function compareNames(a, b) {
  return a.roomName.localeCompare(b.roomName, undefined, { sensitivity: 'base' });
}

/** Sortuje wpisy listy aktywnych pokoi (po filtrze wyszukiwania). */
export function sortDiscoverRooms(entries, mode = DISCOVER_SORT_NAME) {
  const list = [...entries];

  switch (mode) {
    case DISCOVER_SORT_NAME_DESC:
      return list.sort((a, b) => compareNames(b, a));
    case DISCOVER_SORT_USERS:
      return list.sort((a, b) => {
        const diff = (b.userCount ?? 0) - (a.userCount ?? 0);
        return diff !== 0 ? diff : compareNames(a, b);
      });
    case DISCOVER_SORT_USERS_ASC:
      return list.sort((a, b) => {
        const diff = (a.userCount ?? 0) - (b.userCount ?? 0);
        return diff !== 0 ? diff : compareNames(a, b);
      });
    case DISCOVER_SORT_NAME:
    default:
      return list.sort(compareNames);
  }
}
