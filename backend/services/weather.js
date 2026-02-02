/**
 * Weather service: fetches current weather from AccuWeather API.
 * Sign up at https://developer.accuweather.com/ for free API key.
 */

const ACCUWEATHER_BASE = 'https://dataservice.accuweather.com';

// Simple in-memory cache: { [city]: { data, timestamp } }
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getConfig() {
  return {
    apiKey: process.env.ACCUWEATHER_API_KEY,
    defaultCity: process.env.DEFAULT_WEATHER_CITY || 'London'
  };
}

/**
 * Get location key for a city from AccuWeather Locations API.
 */
async function getLocationKey(city, apiKey) {
  const url = `${ACCUWEATHER_BASE}/locations/v1/cities/search?apikey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.message || `AccuWeather API error: ${res.status}`;
    throw new Error(msg);
  }

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error(`No location found for "${city}". Try a different city name.`);
  }

  return {
    key: json[0].Key,
    name: json[0].LocalizedName || json[0].EnglishName || city,
    country: json[0].Country?.LocalizedName || json[0].Country?.ID || ''
  };
}

/**
 * Get current conditions for a location key.
 */
async function getCurrentConditions(locationKey, apiKey) {
  const url = `${ACCUWEATHER_BASE}/currentconditions/v1/${locationKey}?apikey=${encodeURIComponent(apiKey)}&details=true`;
  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.message || `AccuWeather API error: ${res.status}`;
    throw new Error(msg);
  }

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('No weather data returned.');
  }

  return json[0];
}

/**
 * AccuWeather icon URL (icon number 1-44, pad to 2 digits).
 */
function getIconUrl(iconNumber) {
  const padded = String(iconNumber).padStart(2, '0');
  return `https://developer.accuweather.com/sites/default/files/${padded}-s.png`;
}

/**
 * Fetch current weather for a city.
 * @param {string} city - City name (e.g. "London", "New Delhi")
 * @returns {Promise<{ temp: number, feelsLike: number, humidity: number, condition: string, description: string, windSpeed: number, icon: string, iconUrl: string, city: string }>}
 */
async function fetchCurrentWeather(city) {
  const { apiKey, defaultCity } = getConfig();
  const targetCity = city || defaultCity;

  if (!apiKey) {
    throw new Error('ACCUWEATHER_API_KEY not configured.');
  }

  // Check cache
  const cacheKey = targetCity.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Weather] Returning cached data for ${targetCity}`);
    return cached.data;
  }

  console.log(`[Weather] Fetching weather for ${targetCity}...`);

  const location = await getLocationKey(targetCity, apiKey);
  const conditions = await getCurrentConditions(location.key, apiKey);

  const temp = Math.round(conditions.Temperature?.Metric?.Value ?? 0);
  const feelsLike = Math.round(
    conditions.RealFeelTemperature?.Metric?.Value ??
    conditions.Temperature?.Metric?.Value ?? temp
  );
  const humidity = conditions.RelativeHumidity ?? 0;
  const windSpeed = Math.round(conditions.Wind?.Speed?.Metric?.Value ?? 0);
  const iconNum = conditions.WeatherIcon ?? 1;

  const data = {
    temp,
    feelsLike,
    humidity,
    condition: conditions.WeatherText || 'Unknown',
    description: conditions.WeatherText || '',
    windSpeed,
    icon: String(iconNum).padStart(2, '0'),
    iconUrl: getIconUrl(iconNum),
    city: location.name
  };

  cache.set(cacheKey, { data, timestamp: Date.now() });
  console.log(`[Weather] Data for ${targetCity}:`, data);

  return data;
}

/**
 * Generate a walking recommendation based on weather conditions.
 * @param {{ temp: number, condition: string, windSpeed: number }} weather
 * @returns {{ suitable: boolean, message: string }}
 */
function getWalkingRecommendation(weather) {
  const { temp, condition, windSpeed } = weather;
  const conditionLower = (condition || '').toLowerCase();

  // Rain or snow
  if (['rain', 'drizzle', 'thunderstorm', 'snow', 'showers', 'precipitation'].some(c => conditionLower.includes(c))) {
    return { suitable: false, message: 'Stay indoors - precipitation expected.' };
  }

  // Extreme cold
  if (temp < 5) {
    return { suitable: false, message: 'Too cold for a long walk. Dress warmly if you go out.' };
  }

  // Extreme heat
  if (temp > 35) {
    return { suitable: false, message: 'Too hot - avoid outdoor walks. Stay hydrated.' };
  }

  // Very windy
  if (windSpeed > 40) {
    return { suitable: false, message: 'Very windy - be careful if walking outside.' };
  }

  // Hot but manageable
  if (temp > 30) {
    return { suitable: true, message: 'Warm day. A short morning or evening walk is best.' };
  }

  // Cold but okay
  if (temp < 10) {
    return { suitable: true, message: 'Cool day. Dress warmly for your walk.' };
  }

  // Ideal conditions
  return { suitable: true, message: 'Good day for a walk! Enjoy the fresh air.' };
}

module.exports = {
  fetchCurrentWeather,
  getWalkingRecommendation,
  getConfig
};
