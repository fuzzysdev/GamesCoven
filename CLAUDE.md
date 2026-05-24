# Grimoire & Games — Developer Reference

## Stack
React + Vite · Firebase Hosting · Firestore · Firebase Auth (Google + email/password)

## Live URL
https://grimoire-games.web.app  (project ID: `grimoire-games`)

## Deploy
Use the `/deploy-firebase` slash command. It runs `npm run build`, then deploys via the Firebase MCP tool (`hosting,firestore`), and polls until done.

## Theme
Gothic-cute. Dark purple/black bg, pink + teal accents.
Palette: bg `#0e0a1a`, surface `#1a1128`, purple `#b48cff`, pink `#ff7ec7`, teal `#5dcaa5`, amber `#fac775`.
CSS variables are in `src/base.css`.

## File map

### Source
| Path | Purpose |
|------|---------|
| `src/main.jsx` | Entry — imports 5 CSS files, mounts App |
| `src/App.jsx` | Router, nav, auth gate, unicorn easter egg |
| `src/firebase.js` | Firebase app init |
| `src/context/AuthContext.jsx` | `useAuth()` hook |
| `src/utils/constants.js` | `TYPES`, `TYPE_ICONS`, `GAME_EMOJI` |
| `src/utils/scoring.js` | `scoreGame()` — suggestion scoring logic |
| `src/utils/bgg.js` | `searchBGG()`, `fetchBGGGame()` — BGG API helpers |
| `src/utils/mechanisms.js` | `MECHANISMS` array |
| `src/components/GameCard.jsx` | `GameCard` (default), `TypeTag`, `StarRow`, `GameIcon` |
| `src/components/GameModals.jsx` | `AddGameModal`, `EditGameModal`, `GameDetailModal`, `BGGSearch` |
| `src/components/MechanismPicker.jsx` | Mechanism multi-select component |
| `src/components/UnicornEasterEgg.jsx` | Easter egg overlay |
| `src/pages/Library.jsx` | Game library — Firestore listeners + grid render |
| `src/pages/FindGames.jsx` | Suggestion engine UI |
| `src/pages/PlayLog.jsx` | Session log list + log modal |
| `src/pages/Nights.jsx` | Game nights list + plan modal |
| `src/pages/GameNightPage.jsx` | Shareable night page (`/night/:nightId`) — RSVP + poll |
| `src/pages/Friends.jsx` | Coven/friends management |
| `src/pages/AuthPage.jsx` | Sign-in / sign-up |

### CSS (all imported in main.jsx)
| File | Contents |
|------|---------|
| `src/base.css` | Variables, reset, layout, header, nav, buttons, inputs, auth, loading |
| `src/library.css` | Game cards, type tags, badges, stars, expansions |
| `src/modals.css` | Modal dialogs, form fields, emoji/mechanism pickers, BGG search, stats |
| `src/pages.css` | Find Games, Play Log, Game Nights, Friends, Game Night page |
| `src/fx.css` | Unicorn easter egg animation |

## Data model (Firestore)
```
/users/{uid}                    — { displayName, email, emoji, color }
/users/{uid}/games/{gameId}     — { name, type, emoji, minPlayers, maxPlayers,
                                    timeEst, boughtDate, isNew, ownerId,
                                    bggImageUrl?, bggId?, bggUrl?,
                                    mechanisms[], baseGameId? }
/users/{uid}/playLog/{logId}    — { gameId, gameName, date, players: [{uid,name,rating}], notes }
/gameNights/{nightId}           — { name, date, time, venue, hostUid,
                                    attendeeUids[], attendeeNames[],
                                    rsvps: {uid: 'yes'|'no'},
                                    pollOpen: bool,
                                    pollGames: [{id,name,emoji,bggImageUrl,
                                                 ownerId,ownerName,
                                                 isWriteIn,votes:[uid]}] }
/friendships/{uid}              — { friends: [uid] }
```

## Key patterns

**Expansions** — games with `baseGameId` are expansions. Library groups them below their base card. `AddGameModal` accepts a `baseGame` prop to set `baseGameId` on save.

**Game night poll** — generated at creation time by scoring all attendees' libraries (base 50 + isNew +25 + random tiebreaker), deduplicating by name, picking top 5. Voting toggles the user's uid in each game's `votes` array (whole array rewritten on update).

**RSVP** — dot-notation Firestore update: `{ ['rsvps.' + uid]: answer }` so RSVPs don't overwrite each other.

**Suggestion scoring** — `src/utils/scoring.js`: base 50, +25 new, +15 never played, +20 if >90d since played, +10 if >30d, +15 if avg rating >= 4.

**Easter egg** — Konami code (`↑↑↓↓←→←→BA`) or random timer (3–8 min) triggers `UnicornEasterEgg`. State lives in `App.jsx`.

## Firestore security rules
- Users: read/write own `/users/{uid}` and subcollections only
- `gameNights`: readable by any attendee (`attendeeUids` array); updatable by any attendee (for RSVP/voting); deletable by host only
- `friendships`: readable/writable by the owning user
