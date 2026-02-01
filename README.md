# Elderly Care

A web app for elders and family members: elder dashboard (medicines, tasks, SOS, calendar timeline), family dashboard (link elders by phone, manage medicines and tasks, view SOS alerts), PWA install, and optional passkey (fingerprint/face) login.

## Setup and run

- **Backend:** `cd backend && npm install && npm run dev` (default port 4000). Set `.env` with `GOOGLE_APPLICATION_CREDENTIALS`, `JWT_SECRET`, optionally `WEBAUTHN_RP_ID`, and `GEMINI_API_KEY` (get a free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
- **Frontend:** `cd frontend && npm install && npm run dev` (Vite default, e.g. http://localhost:5173).

AI (voice assistant, daily tips, optimize schedule, simplify text) uses Google Gemini (free tier). Voice input and output use the browser’s microphone and speech synthesis.

## Calendar and timeline

Elders can switch to the **Timeline** tab to see a week strip and a daily timeline of medicines, tasks, reminders, and to-do items. The calendar reuses existing data; no separate store. Routes used: `GET /api/elders/:elderId/medicines`, `GET /api/elders/:elderId/tasks`, `GET/POST/PATCH /api/ai/reminders`, `GET/POST/PATCH/DELETE /api/ai/checklist`, `POST /api/elders/:elderId/medicines/:id/taken`, `POST /api/elders/:elderId/tasks/:id/complete`. Optional fields for per-day scheduling: **reminder** `date` (YYYY-MM-DD) in `POST /api/ai/reminders`; **task** `date` (YYYY-MM-DD) in `POST`/`PUT /api/elders/:elderId/tasks`. If `date` is omitted, items appear on "today" in the timeline.

## WebAuthn (passkey) testing notes

- **rpId:** Must match the origin. For local dev use `localhost` (or set `WEBAUTHN_RP_ID=localhost`) and open the app at `http://localhost:5173` (or your Vite port). In production, set `WEBAUTHN_RP_ID` to your hosted domain (e.g. `yourapp.com`).
- **Chrome on Android:** Supports platform authenticator (fingerprint/face); test register and sign-in there.
- **Desktop:** Chrome with Windows Hello or macOS Touch ID (platform authenticator), or a USB security key.
- **HTTPS:** WebAuthn requires a secure context in production (HTTPS). Localhost is treated as secure.
- **Same origin:** Frontend and backend can be on different ports (e.g. 5173 and 4000); the browser sends the frontend origin in the challenge—the backend (e.g. SimpleWebAuthn) should accept that origin when verifying.

## Troubleshooting

- **Firestore `net::ERR_BLOCKED_BY_CLIENT`:** This usually means a browser extension (e.g. ad blocker or privacy tool) is blocking requests to `firestore.googleapis.com`. Disable extensions for this site or add an exception for the app.
