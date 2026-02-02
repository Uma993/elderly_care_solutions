const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { fetchCurrentWeather, getWalkingRecommendation } = require('../services/weather');

/**
 * GET /api/weather/current
 * Returns current weather for a city (default from env).
 * Query params: city (optional)
 */
router.get('/current', requireAuth, async (req, res) => {
  const city = req.query.city || null;

  try {
    const weather = await fetchCurrentWeather(city);
    const walkingTip = getWalkingRecommendation(weather);

    return res.json({
      ...weather,
      walkingTip
    });
  } catch (err) {
    console.warn('[Weather] Route error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to fetch weather.' });
  }
});

module.exports = router;
