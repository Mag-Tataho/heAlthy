const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();

// Lazy init — dotenv must load first
let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

const FOOD_MODEL = 'llama-3.1-8b-instant'; // Fast, accurate for nutrition data

// ─────────────────────────────────────────────
// Helper: Search Open Food Facts
// ─────────────────────────────────────────────
const searchOpenFoodFacts = async (query) => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments,serving_size,categories_tags`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.products || [])
      .filter(p => p.product_name?.trim() && p.nutriments?.['energy-kcal_100g'] > 0)
      .map(p => ({
        id:       `off_${Math.random().toString(36).substr(2, 8)}`,
        name:     p.product_name.trim(),
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein:  Math.round((p.nutriments['proteins_100g']       || 0) * 10) / 10,
        carbs:    Math.round((p.nutriments['carbohydrates_100g']  || 0) * 10) / 10,
        fat:      Math.round((p.nutriments['fat_100g']            || 0) * 10) / 10,
        fiber:    Math.round((p.nutriments['fiber_100g']          || 0) * 10) / 10,
        sugar:    Math.round((p.nutriments['sugars_100g']         || 0) * 10) / 10,
        serving:  p.serving_size || '100g',
        category: p.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || 'food',
        source:   'Open Food Facts',
      }));
  } catch (err) {
    console.error('Open Food Facts error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────
// Helper: AI fallback via Groq
// ─────────────────────────────────────────────
const searchWithAI = async (query) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) {
    return [];
  }
  try {
    const prompt = `Give accurate nutrition information for: "${query}"
Return ONLY valid JSON (no markdown, no extra text):
{
  "foods": [
    {
      "name": "food name",
      "calories": 200,
      "protein": 10,
      "carbs": 25,
      "fat": 5,
      "fiber": 2,
      "sugar": 3,
      "serving": "100g",
      "category": "protein",
      "description": "brief health note"
    }
  ]
}
Include up to 4 common variations (raw/cooked, etc). Category: protein, grains, vegetables, fruits, dairy, nuts, legumes, snacks, beverages, or other. Use USDA data.`;

    const completion = await getGroq().chat.completions.create({
      model: FOOD_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1200,
    });

    const raw = completion.choices[0].message.content
      .replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

    const parsed = JSON.parse(raw);
    return (parsed.foods || []).map((f, i) => ({
      ...f,
      id:     `ai_${query.replace(/\s+/g, '_').toLowerCase()}_${i}`,
      source: 'AI Generated',
    }));
  } catch (err) {
    console.error('AI food search error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET /api/food/search?q=chicken
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    if (!q.trim()) return res.json({ foods: [], total: 0, source: 'none' });

    // Try Open Food Facts first
    let foods = await searchOpenFoodFacts(q);
    let source = 'Open Food Facts';

    // If not enough real results, use AI
    if (foods.length < 3) {
      const aiFoods = await searchWithAI(q);
      foods = [...foods, ...aiFoods];
      source = foods.some(f => f.source === 'Open Food Facts') ? 'Open Food Facts + AI' : 'AI Generated';
    }

    // Deduplicate by name (first 25 chars)
    const seen = new Set();
    foods = foods.filter(f => {
      const key = f.name.toLowerCase().slice(0, 25);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      foods: foods.slice(0, parseInt(limit)),
      total: foods.length,
      source,
      query: q,
    });
  } catch (err) {
    console.error('Food search error:', err);
    res.status(500).json({ error: 'Food search failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/food/info?name=banana
// ─────────────────────────────────────────────
router.get('/info', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Food name is required' });

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set' });
    }

    const prompt = `Comprehensive nutrition breakdown for "${name}".
Return ONLY valid JSON (no markdown):
{
  "name": "food name",
  "calories": 200,
  "protein": 10,
  "carbs": 25,
  "fat": 5,
  "fiber": 2,
  "sugar": 3,
  "sodium": 100,
  "vitamins": ["Vitamin C", "Vitamin A"],
  "minerals": ["Iron", "Calcium"],
  "serving": "100g",
  "healthBenefits": ["benefit 1", "benefit 2", "benefit 3"],
  "tips": "short healthy eating tip",
  "category": "vegetables"
}`;

    const completion = await getGroq().chat.completions.create({
      model: FOOD_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 600,
    });

    const raw = completion.choices[0].message.content
      .replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

    res.json({ info: JSON.parse(raw), source: 'AI Generated' });
  } catch (err) {
    console.error('Food info error:', err);
    res.status(500).json({ error: 'Could not get food info. Please try again.' });
  }
});

module.exports = router;
