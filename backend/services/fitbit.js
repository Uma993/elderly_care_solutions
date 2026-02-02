/**
 * Fitbit Web API integration: OAuth, token exchange, and data fetch for elder profile sync.
 */

const {
  getFitbitTokens,
  setFitbitTokens,
  setFitbitLastSyncAt,
  updateElderProfile,
  isConfigured
} = require('./firebase');

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const FITBIT_API_BASE = 'https://api.fitbit.com';

const SCOPE = 'activity heartrate sleep';

function getConfig() {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI || 'http://localhost:4000/api/fitbit/callback';
  return { clientId, clientSecret, redirectUri };
}

function getBasicAuth() {
  const { clientId, clientSecret } = getConfig();
  if (!clientId || !clientSecret) return null;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Build Fitbit OAuth authorize URL.
 * @param {string} state - CSRF state (e.g. base64 of elderId+nonce)
 * @returns {string} Full authorize URL
 */
function getAuthUrl(state) {
  const { clientId, redirectUri } = getConfig();
  if (!clientId || !redirectUri) throw new Error('Fitbit not configured: FITBIT_CLIENT_ID, FITBIT_REDIRECT_URI required.');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state: state || ''
  });
  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens.
 * @param {string} code - Authorization code from Fitbit redirect
 * @returns {Promise<{ accessToken: string, refreshToken: string, userId: string }>}
 */
async function exchangeCodeForTokens(code) {
  const { redirectUri } = getConfig();
  const basicAuth = getBasicAuth();
  if (!basicAuth) throw new Error('Fitbit not configured: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET required.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  }).toString();

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.message || data.message || `Fitbit token exchange failed: ${res.status}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user_id
  };
}

/**
 * Refresh expired access token.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function refreshAccessToken(refreshToken) {
  const basicAuth = getBasicAuth();
  if (!basicAuth) throw new Error('Fitbit not configured.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  }).toString();

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.message || data.message || `Fitbit token refresh failed: ${res.status}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  };
}

/**
 * Fetch steps for a date. Returns total steps for the day.
 * @param {string} accessToken
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<number|null>}
 */
async function fetchSteps(accessToken, date) {
  const url = `${FITBIT_API_BASE}/1/user/-/activities/steps/date/${date}/1d.json`;
  console.log(`[Fitbit] Fetching steps for ${date}...`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    console.warn(`[Fitbit] Steps fetch failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  console.log(`[Fitbit] Steps response:`, JSON.stringify(data, null, 2));
  const activities = data['activities-steps'] || [];
  const total = activities.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  console.log(`[Fitbit] Steps total: ${total}`);
  return total > 0 ? total : null;
}

/**
 * Fetch heart rate for a date. Returns resting heart rate (bpm) or average from intraday.
 * @param {string} accessToken
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<number|null>}
 */
async function fetchHeartRate(accessToken, date) {
  const url = `${FITBIT_API_BASE}/1/user/-/activities/heart/date/${date}/1d.json`;
  console.log(`[Fitbit] Fetching heart rate for ${date}...`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    console.warn(`[Fitbit] Heart rate fetch failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  console.log(`[Fitbit] Heart rate response:`, JSON.stringify(data, null, 2));
  const resting = data['activities-heart']?.[0]?.value?.restingHeartRate;
  if (resting != null) {
    console.log(`[Fitbit] Resting heart rate: ${resting}`);
    return Number(resting);
  }
  const intraday = data['activities-heart-intraday']?.dataset;
  if (Array.isArray(intraday) && intraday.length > 0) {
    const avg = intraday.reduce((s, d) => s + (Number(d.value) || 0), 0) / intraday.length;
    console.log(`[Fitbit] Average heart rate: ${Math.round(avg)}`);
    return Math.round(avg);
  }
  console.log(`[Fitbit] No heart rate data found`);
  return null;
}

/**
 * Fetch sleep for a date. Returns total minutes asleep converted to hours.
 * @param {string} accessToken
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<number|null>}
 */
async function fetchSleep(accessToken, date) {
  const url = `${FITBIT_API_BASE}/1.2/user/-/sleep/date/${date}.json`;
  console.log(`[Fitbit] Fetching sleep for ${date}...`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    console.warn(`[Fitbit] Sleep fetch failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  console.log(`[Fitbit] Sleep response:`, JSON.stringify(data, null, 2));
  const totalMinutes = data.summary?.totalMinutesAsleep;
  if (totalMinutes == null || totalMinutes <= 0) {
    console.log(`[Fitbit] No sleep data found`);
    return null;
  }
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  console.log(`[Fitbit] Sleep hours: ${hours}`);
  return hours;
}

/**
 * Sync Fitbit data to elder profile. Fetches steps, heart rate, sleep for today and updates profile.
 * @param {string} elderId
 * @returns {Promise<{ profile: object }>}
 */
async function syncToElderProfile(elderId) {
  if (!isConfigured()) throw new Error('Firestore not configured.');

  let tokens = await getFitbitTokens(elderId);
  if (!tokens) throw new Error('Fitbit not connected.');

  let accessToken = tokens.accessToken;
  const date = today();

  async function doFetch() {
    const [steps, heartRate, sleepHours] = await Promise.all([
      fetchSteps(accessToken, date),
      fetchHeartRate(accessToken, date),
      fetchSleep(accessToken, date)
    ]);
    return { steps, heartRate, sleepHours };
  }

  let steps, heartRate, sleepHours;
  try {
    ({ steps, heartRate, sleepHours } = await doFetch());
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('unauthorized')) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.accessToken;
      await setFitbitTokens(elderId, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        fitbitUserId: tokens.fitbitUserId
      });
      ({ steps, heartRate, sleepHours } = await doFetch());
    } else {
      throw err;
    }
  }

  const update = {};
  if (steps != null) update.stepsToday = steps;
  if (heartRate != null) update.heartRate = heartRate;
  if (sleepHours != null) update.sleepHours = sleepHours;

  console.log(`[Fitbit] Sync results for elder ${elderId}:`, { steps, heartRate, sleepHours });
  console.log(`[Fitbit] Profile update:`, update);

  if (Object.keys(update).length > 0) {
    await updateElderProfile(elderId, update);
    console.log(`[Fitbit] Profile updated successfully`);
  } else {
    console.log(`[Fitbit] No data to update (all values null)`);
  }
  await setFitbitLastSyncAt(elderId);

  const { getElderProfile } = require('./firebase');
  const { profile } = await getElderProfile(elderId);
  return { profile };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchSteps,
  fetchHeartRate,
  fetchSleep,
  syncToElderProfile,
  getConfig
};
