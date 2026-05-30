const SYSTEM_PATTERNS = [
  {
    re: /^(.+) dołączył do czatu · (.+)$/,
    key: 'userJoined',
    map: ([, user, time]) => ({ user, time }),
  },
  {
    re: /^(.+) opuścił czat\.$/,
    key: 'userLeft',
    map: ([, user]) => ({ user }),
  },
  {
    re: /^(.+) utworzył i dołączył do czatu · (.+)$/,
    key: 'userCreated',
    map: ([, user, time]) => ({ user, time }),
  },
  {
    re: /^(.+) zmienił nick na (.+) · (.+)$/,
    key: 'nickChanged',
    map: ([, oldUser, newUser, time]) => ({ oldUser, newUser, time }),
  },
  {
    re: /^(.+) zmienił nick na (.+) \(nick (.+) był zajęty\) · (.+)$/,
    key: 'nickChangedTaken',
    map: ([, oldUser, newUser, requested, time]) => ({ oldUser, newUser, requested, time }),
  },
  {
    re: /^(.+) ustawił szybkie emoji na (.+) · (.+)$/,
    key: 'emojiChanged',
    map: ([, user, emoji, time]) => ({ user, emoji, time }),
  },
];

const ERROR_PATTERNS = [
  { re: /nieprawidłowe hasło/i, key: 'wrongPassword' },
  { re: /brak hasła|hasło.*wymagane/i, key: 'passwordRequired' },
  { re: /zmienić nicku|nick.*zajęt/i, key: 'nickTaken' },
  { re: /już|zajęt|istnieje/i, key: 'nickTaken' },
  { re: /maksymalnie \d+ aktywnych kanałów/i, key: 'roomLimit' },
  { re: /zbyt wiele prób utworzenia/i, key: 'rateLimit' },
  { re: /nazwa pokoju, hasło i nazwa użytkownika/i, key: 'fieldsRequired' },
  { re: /nieprawidłowa nazwa użytkownika/i, key: 'invalidUsername' },
  { re: /nieprawidłowa nazwa pokoju/i, key: 'invalidRoom' },
];

export function translateSystemMessage(content, t) {
  if (!content) return content;

  for (const pattern of SYSTEM_PATTERNS) {
    const match = content.match(pattern.re);
    if (match) {
      return t(`system.${pattern.key}`, pattern.map(match));
    }
  }

  return content;
}

const IMAGE_ERROR_KEYS = {
  'Nie udało się wczytać obrazu': 'imageLoad',
  'Dozwolone są tylko obrazy': 'imagesOnly',
  'Plik jest za duży (max 20 MB przed kompresją)': 'fileTooLarge',
  'Nie udało się odczytać pliku': 'imageRead',
  'Nie udało się skompresować obrazu do bezpiecznego rozmiaru': 'imageCompress',
  'Nie udało się przetworzyć obrazu': 'imageProcess',
  'Brak danych obrazu': 'imageDataMissing',
  'Obraz za duży': 'imageTooBig',
  'Nieprawidłowy format obrazu': 'imageInvalid',
  'Brak miejsca w przeglądarce. Wyczyść dane strony': 'storageFull',
  'Nie udało się zapisać obrazu lokalnie': 'imageSave',
  'Nie udało się wysłać obrazu. Spróbuj mniejszego pliku': 'imageSend',
  'Nie udało się wysłać obrazu': 'imageUpload',
  'Brak połączenia z pokojem': 'noConnection',
  'Błąd szyfrowania wiadomości.': 'encryptFailed',
  'Picture-in-Picture nie jest obsługiwane w tej przeglądarce (Chrome/Edge 116+).': 'pipUnsupported',
  'Picture-in-Picture niedostępne w tej przeglądarce.': 'pipUnsupported',
};

export function translateRoomError(message, t) {
  if (!message) return message;

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.re.test(message)) {
      return t(`errors.${pattern.key}`);
    }
  }

  const imageKey = IMAGE_ERROR_KEYS[message];
  if (imageKey) {
    return t(`errors.${imageKey}`);
  }

  return message;
}
