import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';

export const MAX_NICKNAME_LENGTH = 32;

const NICKS = {
  pl: {
    phrases: [
      'Cichy Gość',
      'Nocny Lis',
      'Morski Wiatr',
      'Złoty Kruk',
      'Kapitan Herbata',
      'Gość z Neonu',
      'Północny Świt',
      'Mglisty Poranek',
      'Spokojny Wędrowiec',
      'Echo Lasu',
      'Iskra Komety',
      'Stary Kompas',
      'Lampka Nocy',
      'Miękki Deszcz',
      'Błękitna Fala',
      'Ciepły Grafit',
      'Lis z Księżyca',
      'Kruk na Dachu',
    ],
    adjectives: [
      'Cichy', 'Nocny', 'Morski', 'Złoty', 'Lśniący', 'Mglisty', 'Spokojny',
      'Błękitny', 'Ciepły', 'Dziki', 'Leniwy', 'Bystry', 'Ukryty', 'Wesoły',
      'Zimny', 'Letni', 'Miedziany', 'Srebrny', 'Kamienny', 'Papierowy',
    ],
    nouns: [
      'Lis', 'Kruk', 'Sowa', 'Wilk', 'Jeleń', 'Borsuk', 'Jeż', 'Ryś',
      'Wiatr', 'Deszcz', 'Mgła', 'Kometa', 'Księżyc', 'Świt', 'Fala',
      'Kompas', 'Latarnia', 'Most', 'Ogród', 'Płomień', 'Iskra', 'Echo',
    ],
  },
  en: {
    phrases: [
      'Quiet Guest',
      'Night Fox',
      'Copper Rain',
      'Golden Owl',
      'Captain Tea',
      'Neon Visitor',
      'Northern Dawn',
      'Misty Morning',
      'Calm Wanderer',
      'Forest Echo',
      'Comet Spark',
      'Old Compass',
      'Night Lamp',
      'Soft Rain',
      'Blue Wave',
      'Warm Graphite',
      'Moon Fox',
      'Roof Crow',
    ],
    adjectives: [
      'Quiet', 'Night', 'Copper', 'Golden', 'Bright', 'Misty', 'Calm',
      'Blue', 'Warm', 'Wild', 'Lazy', 'Swift', 'Hidden', 'Happy',
      'Cold', 'Summer', 'Silver', 'Stone', 'Paper', 'Gentle', 'Brave',
    ],
    nouns: [
      'Fox', 'Crow', 'Owl', 'Wolf', 'Deer', 'Badger', 'Hedgehog', 'Lynx',
      'Wind', 'Rain', 'Fog', 'Comet', 'Moon', 'Dawn', 'Wave',
      'Compass', 'Lantern', 'Bridge', 'Garden', 'Flame', 'Spark', 'Echo',
    ],
  },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function resolveDict(lang) {
  return NICKS[isLocale(lang) ? lang : DEFAULT_LOCALE] || NICKS.pl;
}

/** Losowy nick z krótkich, sensownych fraz (PL/EN). */
export function createRandomNickname(lang = DEFAULT_LOCALE) {
  const dict = resolveDict(lang);
  const roll = Math.random();
  let nick;

  if (roll < 0.4) {
    nick = pick(dict.phrases);
  } else if (roll < 0.75) {
    nick = `${pick(dict.adjectives)} ${pick(dict.nouns)}`;
  } else {
    nick = `${pick(dict.nouns)} ${pick(dict.nouns)}`;
  }

  return nick.trim().slice(0, MAX_NICKNAME_LENGTH);
}
