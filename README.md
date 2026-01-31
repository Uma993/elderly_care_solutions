# Elderly Care

A web app for elders and family members: elder dashboard (medicines, tasks, SOS), family dashboard (link elders by phone, manage medicines and tasks, view SOS alerts), PWA install, and optional passkey (fingerprint/face) login.

## Setup and run

- **Backend:** `cd backend && npm install && npm run dev` (default port 4000). Set `.env` with `GOOGLE_APPLICATION_CREDENTIALS`, `JWT_SECRET`, and optionally `WEBAUTHN_RP_ID`.
- **Frontend:** `cd frontend && npm install && npm run dev` (Vite default, e.g. http://localhost:5173).

## WebAuthn (passkey) testing notes

- **rpId:** Must match the origin. For local dev use `localhost` (or set `WEBAUTHN_RP_ID=localhost`) and open the app at `http://localhost:5173` (or your Vite port). In production, set `WEBAUTHN_RP_ID` to your hosted domain (e.g. `yourapp.com`).
- **Chrome on Android:** Supports platform authenticator (fingerprint/face); test register and sign-in there.
- **Desktop:** Chrome with Windows Hello or macOS Touch ID (platform authenticator), or a USB security key.
- **HTTPS:** WebAuthn requires a secure context in production (HTTPS). Localhost is treated as secure.
- **Same origin:** Frontend and backend can be on different ports (e.g. 5173 and 4000); the browser sends the frontend origin in the challenge—the backend (e.g. SimpleWebAuthn) should accept that origin when verifying.

## Troubleshooting

- **Firestore `net::ERR_BLOCKED_BY_CLIENT`:** This usually means a browser extension (e.g. ad blocker or privacy tool) is blocking requests to `firestore.googleapis.com`. Disable extensions for this site or add an exception for the app.
