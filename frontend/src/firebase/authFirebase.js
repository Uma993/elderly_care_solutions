/**
 * Optional Firebase Auth via Node-issued custom token.
 * Call after login so Firestore rules can use request.auth.uid === userId.
 * Uses JWT only for app auth; Firebase Auth is used only for Firestore identity.
 */

import { signInWithCustomToken } from 'firebase/auth';
import { API_BASE_URL, getAuthHeaders } from '../api.js';
import { auth } from './config.js';

let signInPromise = null;

/**
 * Fetches a Firebase custom token from the backend and signs in.
 * Idempotent: if already signed in with the same session, resolves immediately.
 * @param {string|null|undefined} jwt - JWT from Node login
 * @returns {Promise<void>} Resolves when signed in, or when token/API unavailable (caller can fall back to mock)
 */
export async function ensureSignedIn(jwt) {
  if (!jwt || !auth) return;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/firebase-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(jwt)
      }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Firebase token failed');
    }
    const { token: customToken } = await response.json();
    if (!customToken) return;
    signInPromise = signInWithCustomToken(auth, customToken);
    await signInPromise;
    signInPromise = null;
  } catch (err) {
    signInPromise = null;
    throw err;
  }
}
