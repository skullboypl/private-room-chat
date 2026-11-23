export const WIKI_NAV = [
  { slug: 'o-nas', label: 'O nas' },
  { slug: 'jak-dziala', label: 'Jak działa' },
  { slug: 'szyfrowanie-e2e', label: 'Szyfrowanie E2E' },
  { slug: 'prywatnosc', label: 'Prywatność' },
  { slug: 'bezpieczenstwo', label: 'Bezpieczeństwo' },
  { slug: 'linki-zaproszenia', label: 'Linki zaproszenia' },
  { slug: 'czat-grupowy', label: 'Czat grupowy' },
  { slug: 'pwa', label: 'Aplikacja PWA' },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'regulamin', label: 'Regulamin' },
];

export const WIKI_PAGES = [
  {
    slug: 'o-nas',
    title: 'O nas · czym są Pokoje Czatu',
    description: 'Pokoje Czatu to lekki messenger z prywatnymi kanałami na hasło, szyfrowaniem E2E i brakiem zapisu wiadomości na serwerze.',
    sections: [
      {
        heading: 'Czym jest Pokoje Czatu?',
        paragraphs: [
          'Pokoje Czatu to prosta aplikacja do rozmów online w czasie rzeczywistym. Każdy kanał jest chroniony hasłem, tylko osoby z linkiem zaproszenia i hasłem mogą dołączyć.',
          'Projekt powstał z myślą o lekkim, szybkim czacie bez rejestracji konta. Wystarczy nick, nazwa pokoju i hasło. Możesz prowadzić kilka rozmów naraz, jak w komunikatorze desktopowym.',
        ],
      },
      {
        heading: 'Dla kogo?',
        list: [
          'Zespoły i grupy znajomych szukające prywatnego czatu bez instalacji',
          'Projekty wymagające szybkiego kanału komunikacji z hasłem',
          'Użytkownicy ceniący prywatność i brak trwałego zapisu wiadomości',
        ],
      },
      {
        heading: 'Co wyróżnia serwis',
        paragraphs: [
          'Wiadomości tekstowe są szyfrowane end-to-end w przeglądarce. Serwer pełni wyłącznie rolę przekaźnika, nie przechowuje historii rozmów. Obrazy są kompresowane i trzymane lokalnie po stronie uczestników.',
        ],
      },
      {
        heading: 'Brak moderacji',
        paragraphs: [
          'Serwis nie moderuje treści rozmów. Nikt z zespołu nie czyta wiadomości, nie filtruje ich i nie ingeruje w przebieg czatu. Wiadomości trafiają bezpośrednio między uczestnikami pokoju przez WebSocket, bez zapisu treści po stronie serwera.',
          'Odpowiedzialność za treść, legalność i konsekwencje wysyłanych wiadomości ponoszą wyłącznie użytkownicy. Korzystając z czatu, akceptujesz ten model. Szczegóły w regulaminie.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'szyfrowanie-e2e', 'prywatnosc'],
  },
  {
    slug: 'jak-dziala',
    title: 'Jak działa czat · pokoje, nick i kanały',
    description: 'Dowiedz się, jak utworzyć pokój czatu, ustawić hasło, zaprosić innych linkiem i prowadzić wiele rozmów jednocześnie.',
    sections: [
      {
        heading: 'Tworzenie i dołączanie do pokoju',
        paragraphs: [
          'Po wejściu na stronę ustaw swój nick, zapisze się lokalnie w przeglądarce. Następnie utwórz nowy kanał lub dołącz do istniejącego, podając nazwę pokoju i hasło.',
          'Hasło służy zarówno do wejścia, jak i do wygenerowania klucza szyfrowania E2E. Bez poprawnego hasła nie odczytasz wiadomości innych uczestników.',
        ],
      },
      {
        heading: 'Wiele otwartych rozmów',
        paragraphs: [
          'Na komputerze otwarte pokoje pojawiają się jako dymki u dołu ekranu, podobnie jak w Messengera. Na telefonie aktywny kanał otwiera się w trybie pełnoekranowym.',
          'Zakładki u góry pozwalają szybko przełączać się między kanałami. Nieprzeczytane wiadomości są oznaczane licznikiem.',
        ],
      },
      {
        heading: 'Co dzieje się po opuszczeniu pokoju?',
        paragraphs: [
          'Gdy ostatnia osoba opuści kanał, pokój znika z serwera. Historia wiadomości nie jest archiwizowana, to czat efemeryczny, przeznaczony do bieżącej rozmowy.',
        ],
      },
    ],
    relatedSlugs: ['linki-zaproszenia', 'czat-grupowy', 'faq'],
  },
  {
    slug: 'szyfrowanie-e2e',
    title: 'Szyfrowanie E2E · jak chronimy wiadomości',
    description: 'Wiadomości tekstowe w Pokojach Czatu są szyfrowane end-to-end w przeglądarce (AES-GCM). Serwer widzi tylko zaszyfrowaną treść.',
    sections: [
      {
        heading: 'End-to-end: co to znaczy?',
        paragraphs: [
          'Szyfrowanie end-to-end (E2E) oznacza, że treść wiadomości jest zamieniana na ciphertext jeszcze w Twojej przeglądarce. Serwer przekazuje jedynie zaszyfrowane dane, nie ma klucza do ich odczytania.',
          'Klucz szyfrowania jest wyprowadzany z hasła pokoju metodą PBKDF2. Każdy uczestnik z tym samym hasłem może odszyfrować wiadomości lokalnie.',
        ],
      },
      {
        heading: 'Algorytmy',
        list: [
          'AES-GCM: szyfrowanie treści wiadomości',
          'PBKDF2 (210 000 iteracji): wyprowadzenie klucza z hasła pokoju',
          'Losowy IV dla każdej wiadomości',
        ],
      },
      {
        heading: 'Ważne ograniczenia',
        paragraphs: [
          'Szyfrowanie E2E dotyczy wiadomości tekstowych. Obrazy są wysyłane jako skompresowane dane i przechowywane w localStorage przeglądarki uczestników, to osobny mechanizm od szyfrowania tekstu.',
          'Bezpieczeństwo hasła zależy od Ciebie: im dłuższe i bardziej złożone hasło, tym trudniej je zgadnąć. Udostępniaj link zaproszenia tylko zaufanym osobom.',
        ],
      },
    ],
    relatedSlugs: ['bezpieczenstwo', 'prywatnosc', 'o-nas'],
  },
  {
    slug: 'prywatnosc',
    title: 'Prywatność · brak zapisu wiadomości',
    description: 'Pokoje Czatu nie zapisują treści rozmów na serwerze. Wiadomości znikają po opuszczeniu kanału. Polityka prywatności serwisu.',
    sections: [
      {
        heading: 'Brak historii na serwerze',
        paragraphs: [
          'Serwer nie przechowuje wiadomości tekstowych ani obrazów. Po dołączeniu do pokoju otrzymujesz pustą historię, widzisz wyłącznie wiadomości wysłane od momentu Twojego wejścia.',
          'Gdy wszyscy uczestnicy opuszczą kanał, pokój jest usuwany z pamięci serwera. Nie ma bazy danych z logami czatu.',
        ],
      },
      {
        heading: 'Co jest przechowywane lokalnie',
        list: [
          'Nick użytkownika: localStorage przeglądarki',
          'Hasła pokoi (do ponownego dołączenia): localStorage',
          'Skompresowane obrazy z czatu: localStorage',
          'Lista otwartych kanałów: localStorage',
        ],
      },
      {
        heading: 'Dane techniczne',
        paragraphs: [
          'Serwer może przetwarzać adres IP w celu limitowania liczby tworzonych pokoi (ochrona przed nadużyciami). Nie łączymy adresu IP z treścią wiadomości, bo serwer i tak nie widzi plaintextu wiadomości E2E.',
        ],
      },
    ],
    relatedSlugs: ['szyfrowanie-e2e', 'bezpieczenstwo', 'regulamin'],
  },
  {
    slug: 'bezpieczenstwo',
    title: 'Bezpieczeństwo serwera i limitów',
    description: 'Lekki serwer czatu z limitami IP, rate limitingiem i brakiem persystencji wiadomości. Zasady bezpieczeństwa Pokoi Czatu.',
    sections: [
      {
        heading: 'Minimalna powierzchnia serwera',
        paragraphs: [
          'Aplikacja celowo utrzymuje serwer w możliwie najlżejszej formie. Strony informacyjne są generowane statycznie przy buildzie, nie obciążają procesora w runtime.',
          'Jedynym dynamicznym elementem backendu jest WebSocket (Socket.IO) służący do przekazywania wiadomości w czasie rzeczywistym.',
        ],
      },
      {
        heading: 'Limity ochronne',
        list: [
          'Maksymalnie 5 aktywnych kanałów utworzonych z jednego adresu IP',
          'Rate limit: 3 próby utworzenia pokoju na minutę na IP',
          'Limit rozmiaru wiadomości WebSocket: 5 MB',
          'Automatyczne usuwanie pustych pokoi',
        ],
      },
      {
        heading: 'Zalecenia dla użytkowników',
        paragraphs: [
          'Używaj silnych haseł do pokoi. Nie udostępniaj haseł publicznie, link zaproszenia zawiera zarówno nazwę pokoju, jak i hasło w hash URL.',
          'Pamiętaj, że każdy uczestnik z hasłem może odszyfrować wiadomości. Zapraszaj wyłącznie osoby, którym ufasz.',
        ],
      },
      {
        heading: 'Brak logów treści wiadomości',
        paragraphs: [
          'Backend nie zapisuje treści wiadomości ani zdarzeń czatu w logach aplikacji. WebSocket przekazuje zaszyfrowane dane między użytkownikami bez ich odczytywania i bez trwałego archiwum.',
          'W logach produkcyjnych (np. w panelu hostingu) nie pojawiają się nicki, hasła, treść rozmów ani metadane wiadomości. Rejestrowane są wyłącznie błędy krytyczne samej aplikacji, bez danych z czatu.',
        ],
      },
    ],
    relatedSlugs: ['prywatnosc', 'szyfrowanie-e2e', 'regulamin'],
  },
  {
    slug: 'linki-zaproszenia',
    title: 'Linki zaproszenia do pokoju czatu',
    description: 'Jak wygenerować link zaproszenia z hasłem, udostępnić go znajomym i dołączyć do pokoju z URL.',
    sections: [
      {
        heading: 'Generowanie linku',
        paragraphs: [
          'W nagłówku otwartego czatu kliknij przycisk „Link”. Skopiujesz adres URL zawierający nazwę pokoju i hasło w fragmencie hash (#).',
          'Osoba z linkiem po wejściu na stronę zobaczy prośbę o nick, a następnie automatycznie dołączy do wskazanego pokoju.',
        ],
      },
      {
        heading: 'Bezpieczeństwo linku',
        paragraphs: [
          'Hasło jest częścią linku, każdy, kto ma link, może wejść do pokoju. Traktuj link jak klucz dostępu. Nie publikuj go na forach ani w mediach społecznościowych, jeśli rozmowa ma być prywatna.',
        ],
      },
      {
        heading: 'Wiele urządzeń',
        paragraphs: [
          'Ten sam link działa na komputerze i telefonie. Nick ustawiasz osobno na każdym urządzeniu, serwer doda suffix (#1234), jeśli dwie osoby wybiorą ten sam nick w jednym pokoju.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'czat-grupowy', 'faq'],
  },
  {
    slug: 'czat-grupowy',
    title: 'Czat grupowy online · rozmowy wieloosobowe',
    description: 'Prowadź czat grupowy w prywatnym pokoju z hasłem. Wiele osób, wiele kanałów, bez rejestracji konta.',
    sections: [
      {
        heading: 'Czat grupowy bez konta',
        paragraphs: [
          'Pokoje Czatu nie wymagają rejestracji e-mail ani logowania. Grupa zakłada pokój, ustala hasło i rozdaje link zaproszenia. Każdy uczestnik wybiera nick i dołącza w kilka sekund.',
        ],
      },
      {
        heading: 'Wiele kanałów naraz',
        paragraphs: [
          'Możesz jednocześnie uczestniczyć w kilku pokojach, np. „Projekt-A” i „Znajomi”. Przełączanie odbywa się przez zakładki, a na desktopie dodatkowo przez dymki czatu.',
        ],
      },
      {
        heading: 'Obrazy i emoji',
        paragraphs: [
          'W czacie możesz wysyłać skompresowane zdjęcia oraz emoji. Obrazy są przechowywane lokalnie w przeglądarce, co ogranicza obciążenie serwera i chroni prywatność.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'linki-zaproszenia', 'o-nas'],
  },
  {
    slug: 'pwa',
    title: 'Aplikacja PWA · zainstaluj czat na telefonie',
    description: 'Zainstaluj Pokoje Czatu jako aplikację PWA na Androidzie, iOS lub komputerze. Szybki dostęp z ekranu głównego.',
    sections: [
      {
        heading: 'Co to jest PWA?',
        paragraphs: [
          'Progressive Web App (PWA) to strona internetowa, którą można „zainstalować” jak aplikację. Po instalacji ikona pojawia się na ekranie głównym, a czat otwiera się w pełnym oknie bez paska adresu przeglądarki.',
        ],
      },
      {
        heading: 'Jak zainstalować',
        list: [
          'Android (Chrome): menu → „Zainstaluj aplikację” lub baner na stronie',
          'iOS (Safari): Udostępnij → „Do ekranu początkowego”',
          'Desktop (Chrome/Edge): ikona instalacji w pasku adresu',
        ],
      },
      {
        heading: 'Wymagania',
        paragraphs: [
          'Pełna instalacja PWA wymaga połączenia HTTPS. Service worker cache’uje podstawową powłokę aplikacji, aby szybciej uruchamiała się po ponownym otwarciu.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'faq', 'o-nas'],
  },
  {
    slug: 'faq',
    title: 'FAQ · najczęstsze pytania o czat',
    description: 'Odpowiedzi na pytania: czy wiadomości są zapisywane, jak działa szyfrowanie, limity pokoi, Picture-in-Picture i więcej.',
    faqItems: [
      {
        q: 'Czy wiadomości są zapisywane na serwerze?',
        a: 'Nie. Serwer przekazuje wiadomości tylko uczestnikom online w danym momencie. Po opuszczeniu pokoju przez wszystkich kanał jest usuwany.',
      },
      {
        q: 'Czy muszę zakładać konto?',
        a: 'Nie. Wystarczy nick, nazwa pokoju i hasło. Nick zapamiętuje przeglądarka w localStorage.',
      },
      {
        q: 'Czy szyfrowanie E2E jest w pełni bezpieczne?',
        a: 'Wiadomości tekstowe są szyfrowane AES-GCM z kluczem z hasła. Bezpieczeństwo zależy od siły hasła i tego, komu je udostępniasz. Serwer nie widzi treści plaintext.',
      },
      {
        q: 'Ile pokoi mogę utworzyć?',
        a: 'Z jednego adresu IP możesz mieć maksymalnie 5 aktywnych kanałów, które sam utworzyłeś. Obowiązuje też limit 3 prób utworzenia na minutę.',
      },
      {
        q: 'Czy działa na telefonie?',
        a: 'Tak. Na wąskim ekranie czat otwiera się automatycznie w trybie pełnoekranowym. Możesz też zainstalować PWA.',
      },
      {
        q: 'Czy ktoś moderuje wiadomości?',
        a: 'Nie. Serwis nie moderuje czatu. Wiadomości idą bezpośrednio między uczestnikami pokoju. Nikt nie czyta treści rozmów, nie zatwierdza wiadomości ani nie filtruje ich po stronie serwera. Odpowiedzialność za treść ponoszą użytkownicy.',
      },
      {
        q: 'Czy wiadomości trafiają do logów serwera?',
        a: 'Nie. WebSocket nie zapisuje treści wiadomości w logach. Serwer pełni rolę przekaźnika zaszyfrowanych danych. Logi produkcyjne nie zawierają nicków, haseł ani treści czatu.',
      },
      {
        q: 'Co to jest Picture-in-Picture?',
        a: 'W obsługiwanych przeglądarkach (Chrome, Edge) możesz otworzyć czat w małym okienku nad innymi aplikacjami, ikona PiP w nagłówku dymku.',
      },
      {
        q: 'Czy mogę wysyłać zdjęcia?',
        a: 'Tak. Zdjęcia są kompresowane do JPEG w przeglądarce i przechowywane lokalnie. Nie trafiają na dysk serwera.',
      },
      {
        q: 'Co jeśli zapomnę hasła pokoju?',
        a: 'Bez hasła nie dołączysz ponownie do istniejącego pokoju ani nie odczytasz starych wiadomości E2E. Poproś administratora pokoju o nowy link z hasłem.',
      },
    ],
    relatedSlugs: ['jak-dziala', 'prywatnosc', 'pwa'],
  },
  {
    slug: 'regulamin',
    title: 'Regulamin korzystania z Pokoi Czatu',
    description: 'Regulamin serwisu Pokoje Czatu: zasady użytkowania, odpowiedzialność użytkownika i ograniczenia serwisu.',
    sections: [
      {
        heading: 'Postanowienia ogólne',
        paragraphs: [
          'Serwis Pokoje Czatu umożliwia prowadzenie rozmów tekstowych w prywatnych kanałach. Korzystając z serwisu, akceptujesz poniższe zasady.',
          'Usługa jest udostępniana „tak jak jest”, bez gwarancji nieprzerwanego działania. Administrator może czasowo ograniczyć dostęp w celu konserwacji lub ochrony przed nadużyciami.',
        ],
      },
      {
        heading: 'Obowiązki użytkownika',
        list: [
          'Nie wykorzystywać serwisu do działań niezgodnych z prawem',
          'Nie wysyłać treści naruszających prawa osób trzecich',
          'Nie podejmować prób przeciążenia serwera (spam tworzenia pokoi, flood wiadomości)',
          'Chronić hasła pokoi i linki zaproszeń przed osobami nieuprawnionymi',
        ],
      },
      {
        heading: 'Treści i odpowiedzialność',
        paragraphs: [
          'Użytkownicy ponoszą wyłączną odpowiedzialność za treści, które wysyłają. Administrator nie monitoruje treści wiadomości (serwer nie przechowuje plaintextu E2E), ale może blokować dostęp w przypadku zgłoszenia nadużyć lub naruszenia limitów technicznych.',
        ],
      },
      {
        heading: 'Brak moderacji i przekaźnik',
        paragraphs: [
          'Pokoje Czatu nie są moderowane. Nie ma zespołu moderacyjnego, automatycznego filtrowania treści ani weryfikacji wiadomości przed dostarczeniem. Każda wiadomość wysłana w pokoju trafia bezpośrednio do pozostałych uczestników online.',
          'Serwer nie analizuje, nie ocenia i nie archiwizuje treści rozmów. Nie ma możliwości usunięcia pojedynczej wiadomości przez administratora, bo wiadomości nie są przechowywane po stronie serwera.',
          'Korzystając z serwisu, potwierdzasz, że rozumiesz ten model i że sam oceniasz ryzyko rozmowy z innymi użytkownikami. W razie naruszeń prawa odpowiedzialność spoczywa na nadawcy treści.',
        ],
      },
      {
        heading: 'Logi techniczne',
        paragraphs: [
          'Aplikacja produkcyjna nie loguje treści wiadomości, nicków w pokojach ani metadanych czatu. WebSocket służy wyłącznie do przekazu danych między klientami. Logi hostingu nie powinny zawierać treści rozmów.',
        ],
      },
      {
        heading: 'Zmiany regulaminu',
        paragraphs: [
          'Regulamin może ulec zmianie. Aktualna wersja jest zawsze dostępna pod tym adresem. Dalsze korzystanie z serwisu po zmianach oznacza akceptację nowych warunków.',
        ],
      },
    ],
    relatedSlugs: ['prywatnosc', 'bezpieczenstwo', 'o-nas'],
  },
];
