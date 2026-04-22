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

const CREDIBLE_HEALTH_SOURCES = [
  { name: 'World Health Organization', url: 'https://www.who.int/' },
  { name: 'Centers for Disease Control and Prevention', url: 'https://www.cdc.gov/' },
  { name: 'National Institutes of Health', url: 'https://www.nih.gov/' },
  { name: 'NHS', url: 'https://www.nhs.uk/' },
  { name: 'Academy of Nutrition and Dietetics', url: 'https://www.eatright.org/' },
];

const CREDIBLE_SOURCE_HOSTS = [
  'who.int',
  'cdc.gov',
  'nih.gov',
  'medlineplus.gov',
  'nhs.uk',
  'fda.gov',
  'heart.org',
  'eatright.org',
  'mayoclinic.org',
];

const HEALTH_KEYWORDS = [
  'health', 'healthy', 'nutrition', 'diet', 'meal', 'meals', 'food', 'calorie', 'calories',
  'protein', 'carb', 'fat', 'fiber', 'vitamin', 'mineral', 'hydration', 'water', 'exercise',
  'fitness', 'workout', 'wellness', 'sleep', 'weight', 'obesity', 'diabetes', 'cholesterol',
  'blood pressure', 'heart', 'digest', 'allergy', 'allergies', 'mental health',
];

const PROGRAMMING_KEYWORDS = [
  'programming', 'write code', 'coding', 'javascript', 'typescript', 'python', 'java',
  'c++', 'react', 'html', 'css', 'sql', 'algorithm', 'debug', 'software',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeAllergyTerms = (allergies = []) => {
  return [...new Set(
    (allergies || [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  )];
};

const findAllergyViolationsInPlan = (planData, forbiddenAllergies = []) => {
  const haystack = JSON.stringify(planData || {}).toLowerCase();
  return forbiddenAllergies.filter((term) => {
    const normalizedTerm = String(term || '').trim().toLowerCase();
    if (!normalizedTerm) return false;

    if (normalizedTerm.includes(' ')) {
      return haystack.includes(normalizedTerm);
    }

    const withWordBoundary = new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i');
    return withWordBoundary.test(haystack) || haystack.includes(normalizedTerm);
  });
};

const generateSafeMealPlanJson = async ({ basePrompt, model, maxTokens, forbiddenAllergies = [] }) => {
  let retryNote = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const prompt = [
      basePrompt,
      forbiddenAllergies.length
        ? `\nSTRICT ALLERGY RULES:\n- Never include or suggest these allergens: ${forbiddenAllergies.join(', ')}.\n- If a meal normally contains any listed allergen, replace it with a safe equivalent.\n- Double-check meal names, descriptions, and ingredients before finalizing.`
        : '',
      retryNote,
    ].join('\n');

    const completion = await getGroq().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const content = completion.choices[0].message.content || '';

    let planData;
    try {
      planData = parseJSON(content);
    } catch {
      retryNote = 'Your previous response was not valid JSON. Return strict JSON only, with no markdown.';
      continue;
    }

    const violations = findAllergyViolationsInPlan(planData, forbiddenAllergies);
    if (!violations.length) {
      return planData;
    }

    retryNote = `Your previous response included forbidden allergen terms: ${violations.join(', ')}. Regenerate the entire plan and remove any mention of these allergens.`;
  }

  const error = new Error('ALLERGY_SAFE_PLAN_FAILED');
  error.code = 'ALLERGY_SAFE_PLAN_FAILED';
  throw error;
};

const getLatestUserMessage = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return String(messages[i].content || '');
  }
  return '';
};

const isHealthOnlyQuestion = (text) => {
  const lower = String(text || '').trim().toLowerCase();
  if (!lower) return false;

  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower);
  if (isGreeting) return true;

  if (PROGRAMMING_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return false;
  }

  return HEALTH_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const getHealthOnlyRefusal = () => {
  return [
    'I can only help with health, nutrition, fitness, and wellness topics.',
    'Ask a health-related question and I will answer with credible sources.',
    '',
    'Sources:',
    ...CREDIBLE_HEALTH_SOURCES.slice(0, 3).map((source) => `- ${source.name}: ${source.url}`),
  ].join('\n');
};

const isCredibleSourceUrl = (url) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return CREDIBLE_SOURCE_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};

const ensureCredibleSources = (reply) => {
  const urls = String(reply || '').match(/https?:\/\/[^\s)]+/gi) || [];
  const hasTrustedSource = urls.some((url) => isCredibleSourceUrl(url));

  if (hasTrustedSource) {
    return reply;
  }

  const fallbackSources = CREDIBLE_HEALTH_SOURCES.slice(0, 3)
    .map((source) => `- ${source.name}: ${source.url}`)
    .join('\n');

  const trimmed = String(reply || '').trim();
  return `${trimmed}\n\nSources:\n${fallbackSources}`.trim();
};

// ─────────────────────────────────────────────
// POST /api/ai/basic-meal-plan  (Free)
// ─────────────────────────────────────────────
router.post('/basic-meal-plan', auth, freeLimiter, async (req, res) => {
  try {
    const { goal = 'maintain' } = req.body;
    const userProfile = req.user?.profile || {};
    const forbiddenAllergies = normalizeAllergyTerms(userProfile.allergies);

    const prompt = `Create a healthy 1-day meal plan for someone who wants to ${goal.replace(/_/g, ' ')}.
User dietary restrictions: ${userProfile.dietaryRestrictions?.join(', ') || 'none'}.
User allergies: ${forbiddenAllergies.join(', ') || 'none'}.
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

    const planData = await generateSafeMealPlanJson({
      basePrompt: prompt,
      model: GROQ_SMART,
      maxTokens: 2000,
      forbiddenAllergies,
    });

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
    if (err.code === 'ALLERGY_SAFE_PLAN_FAILED') {
      return res.status(500).json({ error: 'Could not generate an allergy-safe meal plan. Please update your preferences and try again.' });
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
    const forbiddenAllergies = normalizeAllergyTerms(req.user?.profile?.allergies);
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

    const planData = await generateSafeMealPlanJson({
      basePrompt: prompt,
      model: GROQ_SMART,
      maxTokens: 4000,
      forbiddenAllergies,
    });

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
    if (err.code === 'ALLERGY_SAFE_PLAN_FAILED') {
      return res.status(500).json({ error: 'Could not generate an allergy-safe personalized plan. Please update your preferences and try again.' });
    }
    res.status(500).json({ error: 'Failed to generate personalized meal plan. Please try again.' });
  }
});

// ─────────────────────────────────────────────

// POST /api/ai/cooking-steps  (Free — generates cooking steps for any meal)
router.post('/cooking-steps', auth, async (req, res) => {
  try {
    const { mealName, ingredients = [] } = req.body;
    if (!mealName) return res.status(400).json({ error: 'Meal name is required' });

    const prompt = `Give me a simple step-by-step cooking procedure for "${mealName}"${
      ingredients.length ? ` using these ingredients: ${ingredients.join(', ')}` : ''
    }. Keep it practical and easy to follow. Format as numbered steps, max 6 steps. No intro text, just the steps.`;

    const completion = await getGroq().chat.completions.create({
      model: GROQ_FAST,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 400,
    });

    res.json({ steps: completion.choices[0].message.content });
  } catch (err) {
    console.error('Cooking steps error:', err.message);
    res.status(500).json({ error: 'Could not generate cooking steps' });
  }
});

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

    const latestUserMessage = getLatestUserMessage(messages);
    if (!isHealthOnlyQuestion(latestUserMessage)) {
      return res.json({ reply: getHealthOnlyRefusal() });
    }

    const userContext = buildUserContext(req.user);

    const systemPrompt = `You are a friendly, knowledgeable personal nutrition coach for the heAlthy app.

${userContext}

Your role:
- Give personalized diet and nutrition advice based on the user's profile above
- Suggest meals, snacks, and recipes tailored to their goal and preferences
- Help with calorie counting, macro tracking, and healthy eating habits
- Answer only health, nutrition, fitness, and wellness topics
- Be encouraging, supportive, and motivating
- Keep responses concise (under 170 words before the source list) unless the user asks for more detail
- Use simple language, not medical jargon
- If asked about serious medical conditions, recommend consulting a doctor
- For every factual response, include a "Sources:" section with 2-3 credible links from trusted medical/public-health organizations
- If the user asks for non-health topics, refuse briefly and ask for a health-related question

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

    res.json({ reply: ensureCredibleSources(reply) });
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
