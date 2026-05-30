export const UI = {
  pl: {
    navAria: 'Strony informacyjne',
    openChat: 'Otwórz czat',
    backToChat: 'Wróć do czatu',
    relatedArticles: 'Powiązane artykuły',
    ctaReady: 'Gotowy do rozmowy?',
    ctaButton: 'Wejdź do Pokoi Czatu',
    footerTagline: 'Lekki czat E2E · bez moderacji · wiadomości bezpośrednio między użytkownikami',
    footerNavAria: 'Mapa strony',
    footerCredit: 'Projekt by',
    footerDisclaimerShort:
      'Projekt edukacyjny, bez moderacji. Wiadomości E2E w przeglądarce — serwer przekazuje tylko zaszyfrowane dane.',
    footerDisclaimerMore: 'Więcej',
    footerDisclaimerMoreSlug: 'regulamin',
    langSwitchAria: 'Wybierz język',
  },
  en: {
    navAria: 'Information pages',
    openChat: 'Open chat',
    backToChat: 'Back to chat',
    relatedArticles: 'Related articles',
    ctaReady: 'Ready to chat?',
    ctaButton: 'Open chat rooms',
    footerTagline: 'Lightweight E2E chat · no moderation · messages go directly between users',
    footerNavAria: 'Site map',
    footerCredit: 'Project by',
    footerDisclaimerShort:
      'Educational demo, unmoderated. E2E messages in the browser — the server relays encrypted data only.',
    footerDisclaimerMore: 'Learn more',
    footerDisclaimerMoreSlug: 'regulamin',
    langSwitchAria: 'Choose language',
  },
};

export function getUiStrings(lang) {
  return UI[lang] || UI.pl;
}
