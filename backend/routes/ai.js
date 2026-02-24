const express = require('express');
const rateLimit = require('express-rate-limit');
const Groq = require('groq-sdk');
const MealPlan = require('../models/MealPlan');
const { auth, premiumAuth } = require('../middleware/auth');

const router = express.Router();

// Groq client — lazy init so dotenv loads first
let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

// Models
const GROQ_SMART = 'llama-3.3-70b-versatile'; // Best quality — meal plans
const GROQ_FAST  = 'llama-3.1-8b-instant';    // Fastest — chat responses

// Rate limiters
const freeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { error: 'Hourly AI limit reached for free users. Please try again later.' },
});

const premiumLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { error: 'Hourly AI limit reached. Please try again in an hour.' },
});

// Build user context string for AI prompts
const buildUserContext = (user) => {
  const p = user.profile || {};
  return `User profile:
- Goal: ${p.goal?.replace(/_/g, ' ') || 'maintain weight'}
- Age: ${p.age || 'unknown'}, Gender: ${p.gender || 'unknown'}
- Height: ${p.height || 'unknown'} cm, Weight: ${p.weight || 'unknown'} kg
- Activity level: ${p.activityLevel || 'moderate'}
- Dietary restrictions: ${p.dietaryRestrictions?.join(', ') || 'none'}
- Allergies: ${p.allergies?.join(', ') || 'none'}
- Cuisine preferences: ${p.cuisinePreferences?.join(', ') || 'any'}
- Budget: ${p.budget || 'moderate'}
- Region/Location: ${p.region || 'not specified'}`.trim();
};

// Safely parse JSON — strips markdown code blocks Groq sometimes adds
const parseJSON = (text) => {
  const cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  return JSON.parse(cleaned);
};

// ─────────────────────────────────────────────
// POST /api/ai/basic-meal-plan  (Free)
// ─────────────────────────────────────────────
router.post('/basic-meal-plan', auth, freeLimiter, async (req, res) => {
  try {
    const { goal = 'maintain' } = req.body;

    const prompt = `Create a healthy 1-day meal plan for someone who wants to ${goal.replace(/_/g, ' ')}.
Include: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner.
Return ONLY valid JSON, no markdown, no extra text:
{
  "title": "1-Day Meal Plan",
  "totalCalories": 2000,
  "meals": [
    {
      "type": "Breakfast",
      "name": "Oatmeal with Berries",
      "description": "Filling and nutritious start to the day",
      "calories": 350,
      "protein": 12,
      "carbs": 60,
      "fat": 8,
      "ingredients": ["1 cup rolled oats", "1/2 cup blueberries", "1 tbsp honey", "1 cup milk"]
    }
  ]
}`;

    const completion = await getGroq().chat.completions.create({
      model: GROQ_SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    const planData = parseJSON(content);

    const mealPlan = await MealPlan.create({
      user: req.user._id,
      title: planData.title || '1-Day Meal Plan',
      type: 'basic',
      duration: '1day',
      plan: planData,
      totalCalories: planData.totalCalories,
      isPremium: false,
    });

    res.json({ mealPlan, plan: planData });
  } catch (err) {
    console.error('Basic meal plan error:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned invalid data. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to generate meal plan. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/personalized-meal-plan  (Premium)
// ─────────────────────────────────────────────
router.post('/personalized-meal-plan', premiumAuth, premiumLimiter, async (req, res) => {
  try {
    const { duration = 'weekly' } = req.body;
    const userContext = buildUserContext(req.user);
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

    // duration: '1day' or 'weekly' (1–7 days)
    const isWeekly  = duration === 'weekly';
    const titleText = isWeekly ? '7-Day Meal Plan' : '1-Day Meal Plan';

    const prompt = `Create a personalized ${isWeekly ? '7-day' : '1-day'} meal plan for this user.

${userContext}

Important: Respect all allergies and dietary restrictions. Tailor meals to their cuisine preferences and budget.
Include 5 meals per day: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner.

Return ONLY valid JSON, no markdown, no extra text:
{
  "title": "Your Personalized ${titleText}",
  "totalCaloriesPerDay": 2000,
  "groceryList": ["item1", "item2", "item3"],
  "days": [
    {
      "day": 1,
      "dayName": "Monday",
      "totalCalories": 2000,
      "meals": [
        {
          "type": "Breakfast",
          "name": "Meal name",
          "description": "Brief description",
          "calories": 400,
          "protein": 20,
          "carbs": 50,
          "fat": 10,
          "ingredients": ["item1", "item2"]
        }
      ]
    }
  ]
}`;

    const completion = await getGroq().chat.completions.create({
      model: GROQ_SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    const planData = parseJSON(content);

    // Ensure all days have dayName
    if (planData.days) {
      planData.days = planData.days.map((d, i) => ({
        ...d,
        day:     d.day || (i + 1),
        dayName: d.dayName || dayNames[i % 7],
      }));
    }

    const mealPlan = await MealPlan.create({
      user: req.user._id,
      title: planData.title || `Personalized ${titleText}`,
      type: 'personalized',
      duration,
      plan: planData,
      groceryList: planData.groceryList || [],
      totalCalories: planData.totalCaloriesPerDay,
      isPremium: true,
    });

    res.json({ mealPlan, plan: planData });
  } catch (err) {
    console.error('Personalized meal plan error:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned invalid data. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to generate personalized meal plan. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/chat  (Premium)
// Full multi-turn conversation with Groq
// ─────────────────────────────────────────────
router.post('/chat', premiumAuth, premiumLimiter, async (req, res) => {
  try {
    const { messages = [] } = req.body;

    if (!messages.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'gsk_your_groq_api_key_here') {
      return res.status(500).json({ error: 'GROQ_API_KEY is not set in your .env file. Get a free key at https://console.groq.com' });
    }

    const userContext = buildUserContext(req.user);

    const systemPrompt = `You are a friendly, knowledgeable personal nutrition coach for the heAlthy app.

${userContext}

Your role:
- Give personalized diet and nutrition advice based on the user's profile above
- Suggest meals, snacks, and recipes tailored to their goal and preferences
- Help with calorie counting, macro tracking, and healthy eating habits
- Answer questions about specific foods, nutrients, and health topics
- Be encouraging, supportive, and motivating
- Keep responses concise (under 150 words) unless the user asks for more detail
- Use simple language, not medical jargon
- If asked about serious medical conditions, recommend consulting a doctor

You are NOT a medical doctor. Always remind users to consult healthcare professionals for medical advice.`;

    const completion = await getGroq().chat.completions.create({
      model: GROQ_FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        // Keep last 10 messages for conversation context
        ...messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;

    if (!reply) {
      return res.status(500).json({ error: 'AI did not return a response. Please try again.' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI is busy right now. Please wait a moment and try again.' });
    }
    res.status(500).json({ error: 'Chat unavailable. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/meal-replacement  (Premium)
// ─────────────────────────────────────────────
router.post('/meal-replacement', premiumAuth, premiumLimiter, async (req, res) => {
  try {
    const { meal, reason } = req.body;
    if (!meal) return res.status(400).json({ error: 'Meal name is required' });

    const userContext = buildUserContext(req.user);

    const prompt = `Suggest 3 healthy replacement options for this meal: "${meal}"
Reason for replacement: "${reason || 'general preference'}"

${userContext}

Return ONLY valid JSON, no markdown:
{
  "replacements": [
    {
      "name": "Replacement meal name",
      "description": "Why this is a great swap",
      "calories": 400,
      "protein": 20,
      "carbs": 50,
      "fat": 10,
      "prepTime": "15 minutes"
    }
  ]
}`;

    const completion = await getGroq().chat.completions.create({
      model: GROQ_SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0].message.content;
    const data = parseJSON(content);
    res.json(data);
  } catch (err) {
    console.error('Meal replacement error:', err);
    res.status(500).json({ error: 'Failed to get suggestions. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/ai/meal-plans  — list saved plans
// ─────────────────────────────────────────────
router.get('/meal-plans', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const plans = await MealPlan.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// ─────────────────────────────────────────────
// GET /api/ai/meal-plans/:id  — single plan
// ─────────────────────────────────────────────
router.get('/meal-plans/:id', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

module.exports = router;

// ─────────────────────────────────────────────
// DELETE /api/ai/meal-plans/:id
// ─────────────────────────────────────────────
router.delete('/meal-plans/:id', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    res.json({ message: 'Meal plan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});
