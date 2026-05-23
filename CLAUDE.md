# Grimoire & Games — Project Brief

## What we're building
A gothic-cute board game library and game night planner app. Firebase + React + Vite.

## Stack
- Frontend: React + Vite, deployed to Firebase Hosting
- Auth: Firebase Authentication (Google sign-in + email/password)
- Database: Firestore
- Hosting: Firebase Hosting
- Calendar invites: generate .ics files (no Google Calendar API needed for MVP)

## Theme / aesthetic
Gothic-cute. Dark purple/black backgrounds, pink and teal accents, cat and unicorn emoji throughout.
Font: system sans-serif. No gradients or glow effects — flat and clean.
Color palette: bg #0e0a1a, surface #1a1128, purple #b48cff, pink #ff7ec7, teal #5dcaa5, amber #fac775.

## Core features (build in this order)
1. Auth — Google sign-in, user profiles stored in Firestore
2. Game library — each user owns games, stored under /users/{uid}/games
3. Add/edit game — name, type (strategy/party/coop/euro/horror/word), min/max players, time estimate, date purchased, emoji icon
4. Find games tonight — filter by player count, time available, game type; pull from all friends' libraries; score and rank suggestions (boost: new games, long since played, high rated)
5. Play log — log a session: which game, date, who played, rating per player (1-5), notes
6. Game nights — plan a night: name, date, time, venue, attendees; generate a .ics calendar file for download
7. Friends/coven — add friends by email, see their library, include their games in suggestions

## Data model (Firestore)
/users/{uid} — { displayName, email, emoji, color }
/users/{uid}/games/{gameId} — { name, type, emoji, minPlayers, maxPlayers, timeEst, boughtDate, isNew, ownerId }
/users/{uid}/playLog/{logId} — { gameId, gameName, date, players: [{uid, name, rating}], notes }
/gameNights/{nightId} — { name, date, time, venue, hostUid, attendeeUids[], createdAt }
/friendships/{uid} — { friends: [uid] } (or subcollection)

## Firestore security rules
- Users can only read/write their own /users/{uid} documents and subcollections
- gameNights readable by all attendees, writable by host
- friendships readable/writable by the user

## What a "new game" means
isNew: true when added. Set to false the first time a play session is logged for that game.

## Suggestion scoring logic
Base score 50. Add:
- +25 if isNew
- +15 if never played
- +20 if last played > 90 days ago, +10 if > 30 days
- +15 if avg rating >= 4
Sort descending, return top 4.

## Notes
- Use Firebase plugin via MCP — create the project, enable Firestore + Auth, deploy
- .ics generation should be done client-side with a small helper function, no external library needed
- Keep components in /src/components, pages in /src/pages
- Use CSS variables for theming, no CSS framework needed