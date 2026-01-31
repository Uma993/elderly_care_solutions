const express = require('express');
const router = express.Router();
const webPush = require('web-push');
const { requireAuth } = require('./auth');
const {
  getElderMedicines,
  getElderTasks,
  getReminders,
  addReminder,
  updateReminder,
  getChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  appendSosAlert,
  getLinkedFamilyIds,
  isConfigured
} = require('../services/firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (err) {
    console.warn('Gemini client not initialized:', err.message);
  }
}

const GEMINI_MODEL = 'gemini-2.5-flash';

/** Call Gemini and return the model's text response. */
async function geminiGenerate(systemPrompt, userContent, maxOutputTokens = 256) {
  if (!genAI || !GEMINI_API_KEY) return null;
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { maxOutputTokens }
  });
  const prompt = systemPrompt
    ? `System: ${systemPrompt}\n\nUser: ${userContent}`
    : userContent;
  const result = await model.generateContent(prompt);
  const response = result.response;
  if (!response || !response.text) return null;
  return response.text().trim();
}

/** In-memory cache for recommendations: userId -> { recommendations, expiresAt } */
const recommendationsCache = new Map();
const RECOMMENDATIONS_CACHE_MS = 8 * 60 * 1000; // 8 minutes

/** Build elder context string for voice/recommendations (medicines, tasks). */
async function buildElderContext(userId) {
  if (!isConfigured()) return '';
  try {
    const [medicines, tasks] = await Promise.all([
      getElderMedicines(userId),
      getElderTasks(userId)
    ]);
    const medStr = medicines.length
      ? 'Medicines today: ' + medicines.map((m) => `${m.name}${m.time ? ' at ' + m.time : ''}`).join('; ')
      : 'No medicines listed.';
    const taskStr = tasks.length
      ? 'Tasks: ' + tasks.map((t) => `${t.title}${t.time ? ' at ' + t.time : ''}${t.completed ? ' (done)' : ''}`).join('; ')
      : 'No tasks.';
    return `${medStr}\n${taskStr}`;
  } catch {
    return '';
  }
}

/** POST /api/ai/voice — transcript -> Gemini -> { transcript, replyText, action } (no audio) */
router.post('/voice', requireAuth, async (req, res) => {
  if (!genAI || !GEMINI_API_KEY) {
    return res.status(503).json({ message: 'AI voice not configured (GEMINI_API_KEY missing).' });
  }
  const userId = req.auth.userId;
  const role = req.auth.role;
  const { transcript: rawTranscript } = req.body || {};
  const transcript = typeof rawTranscript === 'string' ? rawTranscript.trim() : '';
  if (!transcript) {
    return res.json({
      transcript: '',
      replyText: "I didn't catch that. Please try again.",
      action: null
    });
  }

  try {
    const context = role === 'elderly' ? await buildElderContext(userId) : '';
    const systemPrompt = `You are a friendly voice assistant for an elderly care app. Reply in short, clear sentences (one or two). Do not give medical dosage advice. If the user says they need help or SOS, reply that you will alert their family and output exactly: {"action":"trigger_sos"}. If they ask to be reminded (e.g. "remind me at 5 to call"), output: {"action":"create_reminder","at":"17:00","text":"Call"}. If they ask to add something to their to-do list (e.g. "add to my list: take vitamins"), output: {"action":"add_to_do","text":"Take vitamins"}. Otherwise just answer. Context: ${context}`;

    const replyText = await geminiGenerate(systemPrompt, transcript, 150);
    const fullReply = replyText || "Sorry, I couldn't process that.";

    let action = null;
    const jsonMatch = fullReply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        action = JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }
    const textForTTS = action ? fullReply.replace(/\{[\s\S]*\}/, '').trim() || 'Done.' : fullReply;

    if (action && action.action) {
      const act = action.action;
      try {
        if (act === 'trigger_sos' && req.auth.role === 'elderly') {
          const { elderName } = await appendSosAlert(userId, {}).catch(() => ({ elderName: 'Elder' }));
          const familyIds = await getLinkedFamilyIds(userId);
          const payload = JSON.stringify({
            title: `SOS – ${elderName} needs help`,
            body: new Date().toISOString(),
            url: '/sos-alert',
            data: { url: '/sos-alert' }
          });
          for (const fid of familyIds) {
            const subs = getSubscriptionsByUserId(fid);
            for (const { subscription } of subs) {
              webPush.sendNotification(subscription, payload).catch(() => {});
            }
          }
          action.executed = true;
        } else if (act === 'create_reminder' && action.text && req.auth.role === 'elderly') {
          const at = action.at || '';
          await addReminder(userId, { text: action.text, at, createdVia: 'voice' });
          action.executed = true;
        } else if (act === 'add_to_do' && action.text && req.auth.role === 'elderly') {
          await addChecklistItem(userId, { text: action.text });
          action.executed = true;
        }
      } catch (execErr) {
        console.warn('Voice action execution failed:', execErr.message);
      }
    }

    return res.json({
      transcript,
      replyText: textForTTS,
      action
    });
  } catch (err) {
    console.warn('POST /api/ai/voice failed:', err.message);
    return res.status(500).json({ message: err.message || 'Voice request failed.' });
  }
});

/** GET /api/ai/recommendations — elder context -> 1–3 short wellness tips (cached ~8 min) */
router.get('/recommendations', requireAuth, async (req, res) => {
  if (!genAI || !GEMINI_API_KEY) {
    return res.status(503).json({ message: 'Recommendations not configured (GEMINI_API_KEY missing).' });
  }
  const userId = req.auth.userId;
  const role = req.auth.role;
  const cached = recommendationsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ recommendations: cached.recommendations });
  }
  try {
    let context = '';
    if (role === 'elderly' && isConfigured()) {
      const [medicines, tasks, reminders] = await Promise.all([
        getElderMedicines(userId),
        getElderTasks(userId),
        getReminders(userId)
      ]);
      const medStr = medicines.length ? 'Medicines: ' + medicines.map((m) => `${m.name}${m.time ? ' at ' + m.time : ''}`).join('; ') : 'No medicines.';
      const taskStr = tasks.length ? 'Tasks: ' + tasks.map((t) => `${t.title}${t.time ? ' at ' + t.time : ''}`).join('; ') : 'No tasks.';
      const remStr = reminders.length ? 'Reminders: ' + reminders.filter((r) => !r.done).map((r) => r.text).join('; ') : '';
      context = [medStr, taskStr, remStr].filter(Boolean).join('\n');
    }
    const prompt = context
      ? `Given this elder context (no medical dosage), give 1–3 short, generic wellness tips. Reply with a JSON array of strings only, e.g. ["Tip one.", "Tip two."]. No medical advice.\n\nContext:\n${context}`
      : 'Give 1–3 short, generic daily wellness tips for an older adult. Reply with a JSON array of strings only. You output only a JSON array of 1–3 short tip strings. No other text.';
    const raw = await geminiGenerate('You output only a JSON array of 1–3 short tip strings. No other text.', prompt, 200) || '[]';
    let recommendations = [];
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        recommendations = JSON.parse(arrMatch[0]);
        if (!Array.isArray(recommendations)) recommendations = [];
        recommendations = recommendations.slice(0, 3).filter((s) => typeof s === 'string' && s.trim());
      } catch (_) {}
    }
    recommendationsCache.set(userId, { recommendations, expiresAt: Date.now() + RECOMMENDATIONS_CACHE_MS });
    return res.json({ recommendations });
  } catch (err) {
    console.warn('GET /api/ai/recommendations failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load recommendations.' });
  }
});

function requireElder(req, res, next) {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elders can use this.' });
  }
  next();
}

/** GET /api/ai/reminders — elder only */
router.get('/reminders', requireAuth, requireElder, async (req, res) => {
  try {
    const reminders = await getReminders(req.auth.userId);
    return res.json({ reminders });
  } catch (err) {
    console.warn('GET reminders failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load reminders.' });
  }
});

/** POST /api/ai/reminders — elder only */
router.post('/reminders', requireAuth, requireElder, async (req, res) => {
  const { text, at } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: 'Text is required.' });
  }
  try {
    const reminder = await addReminder(req.auth.userId, { text: text.trim(), at: at || '', createdVia: 'manual' });
    return res.status(201).json(reminder);
  } catch (err) {
    console.warn('POST reminder failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to add reminder.' });
  }
});

/** PATCH /api/ai/reminders/:id — elder only */
router.patch('/reminders/:id', requireAuth, requireElder, async (req, res) => {
  const { id } = req.params;
  const { done } = req.body || {};
  try {
    await updateReminder(req.auth.userId, id, { done: !!done });
    return res.json({ message: 'Updated.' });
  } catch (err) {
    console.warn('PATCH reminder failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update.' });
  }
});

/** GET /api/ai/checklist — elder only */
router.get('/checklist', requireAuth, requireElder, async (req, res) => {
  try {
    const checklist = await getChecklist(req.auth.userId);
    return res.json({ checklist });
  } catch (err) {
    console.warn('GET checklist failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load checklist.' });
  }
});

/** POST /api/ai/checklist — elder only */
router.post('/checklist', requireAuth, requireElder, async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: 'Text is required.' });
  }
  try {
    const item = await addChecklistItem(req.auth.userId, { text: text.trim() });
    return res.status(201).json(item);
  } catch (err) {
    console.warn('POST checklist failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to add item.' });
  }
});

/** PATCH /api/ai/checklist/:id — elder only (toggle done) */
router.patch('/checklist/:id', requireAuth, requireElder, async (req, res) => {
  const { id } = req.params;
  try {
    await toggleChecklistItem(req.auth.userId, id);
    return res.json({ message: 'Updated.' });
  } catch (err) {
    console.warn('PATCH checklist failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update.' });
  }
});

/** DELETE /api/ai/checklist/:id — elder only */
router.delete('/checklist/:id', requireAuth, requireElder, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteChecklistItem(req.auth.userId, id);
    return res.json({ message: 'Deleted.' });
  } catch (err) {
    console.warn('DELETE checklist failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to delete.' });
  }
});

/** POST /api/ai/optimize-schedule — suggest spread-out medicine times (family or elder) */
router.post('/optimize-schedule', requireAuth, async (req, res) => {
  if (!genAI || !GEMINI_API_KEY) {
    return res.status(503).json({ message: 'Optimize not configured (GEMINI_API_KEY missing).' });
  }
  const medicines = req.body && req.body.medicines;
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: 'Body must include medicines array with id, name, time.' });
  }
  try {
    const list = medicines.map((m) => ({ id: m.id, name: m.name || '', time: m.time || '' })).filter((m) => m.id && m.name);
    if (list.length === 0) {
      return res.status(400).json({ message: 'No valid medicines (id and name required).' });
    }
    const userContent = `Given these medicines and their current times (or empty), suggest a spread-out schedule for the day. For each medicine output a JSON array of objects: { "id": "<same id>", "name": "<name>", "suggestedTime": "HH:MM" or "8:00 AM" style }. Also provide a short "explanation" string. Current list: ${JSON.stringify(list)}. Output only valid JSON: { "suggestions": [ ... ], "explanation": "..." }.`;
    const raw = await geminiGenerate('You output only valid JSON with suggestions array and explanation string.', userContent, 400) || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let suggestions = [];
    let explanation = '';
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
        explanation = typeof parsed.explanation === 'string' ? parsed.explanation : '';
      } catch (_) {}
    }
    return res.json({ suggestions, explanation });
  } catch (err) {
    console.warn('POST /api/ai/optimize-schedule failed:', err.message);
    return res.status(500).json({ message: err.message || 'Optimize failed.' });
  }
});

/** POST /api/ai/simplify-text — return simpler wording for elders */
router.post('/simplify-text', requireAuth, async (req, res) => {
  if (!genAI || !GEMINI_API_KEY) {
    return res.status(503).json({ message: 'Simplify not configured (GEMINI_API_KEY missing).' });
  }
  const text = req.body && req.body.text;
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: 'Body must include text string.' });
  }
  try {
    const systemPrompt = 'Rewrite the user message in simpler, clearer language for an older adult. Keep it short. No medical advice.';
    const simplified = await geminiGenerate(systemPrompt, text.trim(), 150) || text.trim();
    return res.json({ simplified });
  } catch (err) {
    console.warn('POST /api/ai/simplify-text failed:', err.message);
    return res.status(500).json({ message: err.message || 'Simplify failed.' });
  }
});

module.exports = router;
