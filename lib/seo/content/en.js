export const WIKI_NAV = [
  { slug: 'o-nas', label: 'About' },
  { slug: 'jak-dziala', label: 'How it works' },
  { slug: 'szyfrowanie-e2e', label: 'E2E encryption' },
  { slug: 'prywatnosc', label: 'Privacy' },
  { slug: 'bezpieczenstwo', label: 'Security' },
  { slug: 'linki-zaproszenia', label: 'Invite links' },
  { slug: 'czat-grupowy', label: 'Group chat' },
  { slug: 'pwa', label: 'PWA app' },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'regulamin', label: 'Terms' },
];

export const WIKI_PAGES = [
  {
    slug: 'o-nas',
    title: 'About · what are Chat Rooms',
    description: 'Chat Rooms is a lightweight messenger with password-protected channels, E2E encryption, and no server-side message storage.',
    sections: [
      {
        heading: 'What is Chat Rooms?',
        paragraphs: [
          'Chat Rooms is a simple real-time chat app. Each channel is protected by a password — only people with the invite link and password can join.',
          'The project is built for a fast, lightweight chat without account registration. You only need a nickname, room name, and password. You can run several conversations at once, like a desktop messenger.',
        ],
      },
      {
        heading: 'Who is it for?',
        list: [
          'Teams and friends who want a private chat without installing anything',
          'Projects that need a quick password-protected communication channel',
          'Users who value privacy and no permanent message history on the server',
        ],
      },
      {
        heading: 'What makes it different',
        paragraphs: [
          'Text messages are encrypted end-to-end in the browser. The server only relays data and does not store chat history. Images are compressed and kept locally on participants’ devices.',
        ],
      },
      {
        heading: 'No moderation',
        paragraphs: [
          'The service does not moderate conversations. Nobody on the team reads, filters, or intervenes in chats. Messages go directly between room participants over WebSocket, without server-side content storage.',
          'Users are solely responsible for the content, legality, and consequences of what they send. By using the chat you accept this model. See the terms of service for details.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'szyfrowanie-e2e', 'prywatnosc'],
  },
  {
    slug: 'jak-dziala',
    title: 'How it works · rooms, nicknames, channels',
    description: 'Learn how to create a chat room, set a password, invite others via link, and manage multiple conversations.',
    sections: [
      {
        heading: 'Creating and joining a room',
        paragraphs: [
          'When you open the site, set your nickname — it is saved locally in your browser. Then create a new channel or join an existing one with a room name and password.',
          'The password is used both to enter the room and to derive the E2E encryption key. Without the correct password you cannot read other participants’ messages.',
        ],
      },
      {
        heading: 'Multiple open conversations',
        paragraphs: [
          'On desktop, open rooms appear as dock windows at the bottom of the screen, similar to Messenger. On mobile the active channel opens in fullscreen.',
          'Tabs at the top let you switch channels quickly. Unread messages show a badge counter.',
        ],
      },
      {
        heading: 'What happens when you leave?',
        paragraphs: [
          'When the last person leaves a channel, the room is removed from the server. Message history is not archived — this is ephemeral chat for live conversation only.',
        ],
      },
    ],
    relatedSlugs: ['linki-zaproszenia', 'czat-grupowy', 'faq'],
  },
  {
    slug: 'szyfrowanie-e2e',
    title: 'E2E encryption · how we protect messages',
    description: 'Text messages in Chat Rooms are encrypted end-to-end in the browser (AES-GCM). The server only sees ciphertext.',
    sections: [
      {
        heading: 'What does end-to-end mean?',
        paragraphs: [
          'End-to-end (E2E) encryption means message content is turned into ciphertext in your browser before it is sent. The server relays encrypted data only and has no key to read it.',
          'The encryption key is derived from the room password using PBKDF2. Every participant with the same password can decrypt messages locally.',
        ],
      },
      {
        heading: 'Algorithms',
        list: [
          'AES-GCM: message content encryption',
          'PBKDF2 (210,000 iterations): key derivation from room password',
          'Random IV for each message',
        ],
      },
      {
        heading: 'Important limitations',
        paragraphs: [
          'E2E applies to text messages. Images are sent as compressed data and stored in participants’ browser localStorage — a separate mechanism from text encryption.',
          'Password strength is up to you: longer, complex passwords are harder to guess. Share invite links only with people you trust.',
        ],
      },
    ],
    relatedSlugs: ['bezpieczenstwo', 'prywatnosc', 'o-nas'],
  },
  {
    slug: 'prywatnosc',
    title: 'Privacy · no message storage',
    description: 'Chat Rooms does not store conversation content on the server. Messages disappear when the channel is closed. Privacy policy overview.',
    sections: [
      {
        heading: 'No history on the server',
        paragraphs: [
          'The server does not store text messages or images. When you join a room you get an empty history — you only see messages sent after you arrived.',
          'When all participants leave, the room is deleted from server memory. There is no chat log database.',
        ],
      },
      {
        heading: 'What is stored locally',
        list: [
          'Nickname: browser localStorage',
          'Room passwords (for rejoining): localStorage / sessionStorage',
          'Compressed chat images: localStorage',
          'Open channel list: localStorage',
        ],
      },
      {
        heading: 'Technical data',
        paragraphs: [
          'The server may process IP addresses to limit room creation (abuse prevention). IP is not linked to message content because the server cannot see E2E plaintext anyway.',
        ],
      },
    ],
    relatedSlugs: ['szyfrowanie-e2e', 'bezpieczenstwo', 'regulamin'],
  },
  {
    slug: 'bezpieczenstwo',
    title: 'Server security and limits',
    description: 'Lightweight chat server with IP limits, rate limiting, and no message persistence. Chat Rooms security principles.',
    sections: [
      {
        heading: 'Minimal server surface',
        paragraphs: [
          'The app intentionally keeps the server as light as possible. Information pages are statically generated at build time and do not load the CPU at runtime.',
          'The only dynamic backend piece is WebSocket (Socket.IO) for real-time message relay.',
        ],
      },
      {
        heading: 'Protective limits',
        list: [
          'Up to 5 active channels created per IP address',
          'Rate limit: 3 room creation attempts per minute per IP',
          'WebSocket message size limit: 5 MB',
          'Automatic cleanup of empty rooms',
        ],
      },
      {
        heading: 'Recommendations for users',
        paragraphs: [
          'Use strong room passwords. Do not publish passwords publicly — invite links contain both room name and password in the URL hash.',
          'Anyone with the password can decrypt messages. Invite only people you trust.',
        ],
      },
      {
        heading: 'No message content in logs',
        paragraphs: [
          'The backend does not write message content or chat events to application logs. WebSocket relays encrypted data without reading or archiving it.',
          'Production logs (e.g. hosting panel) should not contain nicknames, passwords, chat content, or message metadata. Only critical app errors are logged, without chat data.',
        ],
      },
    ],
    relatedSlugs: ['prywatnosc', 'szyfrowanie-e2e', 'regulamin'],
  },
  {
    slug: 'linki-zaproszenia',
    title: 'Invite links to chat rooms',
    description: 'How to generate an invite link with password, share it, and join a room from URL.',
    sections: [
      {
        heading: 'Generating a link',
        paragraphs: [
          'In the open chat header click the “Link” button. You copy a URL containing the room name and password in the hash fragment (#).',
          'Someone with the link sets a nickname on first visit, then automatically joins the specified room.',
        ],
      },
      {
        heading: 'Link security',
        paragraphs: [
          'The password is part of the link — anyone with the link can enter. Treat it like an access key. Do not post it publicly if the conversation should stay private.',
        ],
      },
      {
        heading: 'Multiple devices',
        paragraphs: [
          'The same link works on desktop and mobile. You set a nickname per device; the server adds a suffix (#1234) if two people pick the same nick in one room.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'czat-grupowy', 'faq'],
  },
  {
    slug: 'czat-grupowy',
    title: 'Group chat online · multi-user rooms',
    description: 'Run a group chat in a private password-protected room. Multiple people, multiple channels, no account registration.',
    sections: [
      {
        heading: 'Group chat without accounts',
        paragraphs: [
          'Chat Rooms requires no email sign-up or login. A group creates a room, sets a password, and shares the invite link. Each participant picks a nickname and joins in seconds.',
        ],
      },
      {
        heading: 'Several channels at once',
        paragraphs: [
          'You can participate in multiple rooms at the same time, e.g. “Project-A” and “Friends”. Switch via tabs; on desktop also via chat dock bubbles.',
        ],
      },
      {
        heading: 'Images and emoji',
        paragraphs: [
          'You can send compressed photos and emoji. Images are stored locally in the browser, reducing server load and improving privacy.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'linki-zaproszenia', 'o-nas'],
  },
  {
    slug: 'pwa',
    title: 'PWA app · install chat on your phone',
    description: 'Install Chat Rooms as a PWA on Android, iOS, or desktop. Quick access from your home screen.',
    sections: [
      {
        heading: 'What is a PWA?',
        paragraphs: [
          'A Progressive Web App (PWA) is a website you can “install” like an app. After installation an icon appears on your home screen and the chat opens full-screen without the browser address bar.',
        ],
      },
      {
        heading: 'How to install',
        list: [
          'Android (Chrome): menu → “Install app” or the on-page banner',
          'iOS (Safari): Share → “Add to Home Screen”',
          'Desktop (Chrome/Edge): install icon in the address bar',
        ],
      },
      {
        heading: 'Requirements',
        paragraphs: [
          'Full PWA installation requires HTTPS. The service worker caches the app shell for faster reloads.',
        ],
      },
    ],
    relatedSlugs: ['jak-dziala', 'faq', 'o-nas'],
  },
  {
    slug: 'faq',
    title: 'FAQ · common questions',
    description: 'Answers about message storage, encryption, room limits, Picture-in-Picture, and more.',
    faqItems: [
      {
        q: 'Are messages stored on the server?',
        a: 'No. The server only delivers messages to online participants. When everyone leaves, the channel is deleted.',
      },
      {
        q: 'Do I need an account?',
        a: 'No. You only need a nickname, room name, and password. The nickname is saved in browser localStorage.',
      },
      {
        q: 'Is E2E encryption fully secure?',
        a: 'Text messages use AES-GCM with a key from the room password. Security depends on password strength and who you share it with. The server never sees plaintext.',
      },
      {
        q: 'How many rooms can I create?',
        a: 'Up to 5 active channels you created per IP address, plus a limit of 3 creation attempts per minute.',
      },
      {
        q: 'Does it work on mobile?',
        a: 'Yes. On narrow screens chat opens in fullscreen automatically. You can also install the PWA.',
      },
      {
        q: 'Is chat moderated?',
        a: 'No. Messages go directly between room participants. Nobody reads, approves, or filters them on the server. Users are responsible for content.',
      },
      {
        q: 'Do messages end up in server logs?',
        a: 'No. WebSocket does not log message content. The server is an encrypted relay. Production logs should not contain nicknames, passwords, or chat content.',
      },
      {
        q: 'What is Picture-in-Picture?',
        a: 'In supported browsers (Chrome, Edge) you can open chat in a small floating window via the PiP icon in the dock header.',
      },
      {
        q: 'Can I send photos?',
        a: 'Yes. Photos are compressed to JPEG in the browser and stored locally. They are not saved on the server disk.',
      },
      {
        q: 'What if I forget the room password?',
        a: 'Without the password you cannot rejoin or decrypt old E2E messages. Ask the room owner for a new invite link with password.',
      },
    ],
    relatedSlugs: ['jak-dziala', 'prywatnosc', 'pwa'],
  },
  {
    slug: 'regulamin',
    title: 'Terms of service',
    description: 'Chat Rooms terms of use, user responsibility, and service limitations.',
    sections: [
      {
        heading: 'General',
        paragraphs: [
          'Chat Rooms enables text conversations in private channels. By using the service you accept these rules.',
          'The service is provided “as is” without uptime guarantees. The administrator may temporarily restrict access for maintenance or abuse prevention.',
        ],
      },
      {
        heading: 'User obligations',
        list: [
          'Do not use the service for illegal activity',
          'Do not send content that violates third-party rights',
          'Do not attempt to overload the server (room spam, message flood)',
          'Protect room passwords and invite links from unauthorized people',
        ],
      },
      {
        heading: 'Content and liability',
        paragraphs: [
          'Users are solely responsible for what they send. The administrator does not monitor message content (the server stores no E2E plaintext) but may block access when abuse is reported or technical limits are violated.',
        ],
      },
      {
        heading: 'No moderation — relay model',
        paragraphs: [
          'Chat Rooms is not moderated. There is no moderation team, automatic content filtering, or pre-delivery review. Every message goes directly to other online participants.',
          'The server does not analyze, judge, or archive conversations. Individual messages cannot be removed by an administrator because they are not stored server-side.',
          'By using the service you confirm you understand this model and assess the risk of talking to other users. Legal responsibility for violations lies with the sender.',
        ],
      },
      {
        heading: 'Technical logs',
        paragraphs: [
          'Production app does not log message content, room nicknames, or chat metadata. WebSocket only relays data between clients. Hosting logs should not contain conversation content.',
        ],
      },
      {
        heading: 'Changes to terms',
        paragraphs: [
          'These terms may change. The current version is always available at this address. Continued use after changes means acceptance of the new terms.',
        ],
      },
    ],
    relatedSlugs: ['prywatnosc', 'bezpieczenstwo', 'o-nas'],
  },
];
