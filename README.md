# Pokoje Czatu / Private Room Chat

Self-hosted messenger with password-protected rooms, E2E encrypted text, and a Messenger-style multi-room UI.

> **Demo:** [chat.vxh.pl](https://chat.vxh.pl)

**Languages:** Polish (default) · English — SEO wiki at `/pl/…` and `/en/…`

---

## PL · Polski

### Co potrafi

- Pokoje na hasło — bez rejestracji, wystarczy nick
- E2E dla tekstu (AES-256-GCM + PBKDF2)
- Linki zaproszenia, obrazy lokalnie (nie na serwerze)
- Wiele kanałów, dock, PiP, PWA
- Strony SEO wiki w **PL** i **EN** (`/pl/faq`, `/en/faq`, …)

### Szybki start

```bash
git clone https://github.com/skullboypl/private-room-chat.git
cd private-room-chat
cp .env.example .env
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

### Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Publiczny URL (SEO, zaproszenia) |
| `PORT` | `3000` | Port HTTP |
| `NEXT_PUBLIC_E2E_SALT_PREFIX` | `pokoje-czatu-e2e-v2` | Prefix soli E2E — nie zmieniaj na produkcji |

Pełna lista: [`.env.example`](.env.example).

### Docker

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://twoja-domena.pl -t private-room-chat .
docker run -p 80:80 -e NEXT_PUBLIC_SITE_URL=https://twoja-domena.pl private-room-chat
```

---

## EN · English

### Features

- Password-protected rooms — no account, nickname only
- E2E text encryption (AES-256-GCM + PBKDF2)
- Invite links, client-side images (not on server)
- Multi-room dock UI, PiP, PWA
- Bilingual SEO wiki pages at `/pl/…` and `/en/…` with hreflang sitemap

### Quick start

```bash
git clone https://github.com/skullboypl/private-room-chat.git
cd private-room-chat
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public URL for SEO and invites |
| `PORT` | `3000` | HTTP port |
| `NEXT_PUBLIC_E2E_SALT_PREFIX` | `pokoje-czatu-e2e-v2` | E2E salt — do not change on live deploy |

See [`.env.example`](.env.example) for all options.

### i18n / SEO

- Wiki slugs are shared (`/pl/o-nas`, `/en/o-nas`)
- Legacy URLs `/o-nas` redirect to `/pl/o-nas`
- `sitemap.xml` includes `alternates.languages` for pl + en
- UI strings: `lib/i18n/ui.js` · content: `lib/seo/content/{pl,en}.js`

---

## Stack

Next.js 15 · React 19 · Socket.IO 4 · Web Crypto API · emoji-mart

## License

[MIT](LICENSE) — [skullmedia.pl](https://skullmedia.pl)
