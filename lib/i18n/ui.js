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
    footerDisclaimer: [
      'Projekt wyłącznie w celach naukowych i demonstracyjnych. Serwis nie jest moderowany.',
      'Operator nie ponosi odpowiedzialności za sposób użytkowania ani treści przesyłane między użytkownikami.',
      'Wiadomości tekstowe są szyfrowane end-to-end (E2E) w przeglądarce. Serwer przekazuje wyłącznie zaszyfrowane dane.',
    ],
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
    footerDisclaimer: [
      'For educational and demonstration purposes only. The service is not moderated.',
      'The operator is not responsible for how the service is used or for content sent between users.',
      'Text messages are end-to-end encrypted (E2E) in the browser. The server relays encrypted data only.',
    ],
    langSwitchAria: 'Choose language',
  },
};

export function getUiStrings(lang) {
  return UI[lang] || UI.pl;
}
