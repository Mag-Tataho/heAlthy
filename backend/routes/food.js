const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();

let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

const FOOD_MODEL = 'llama-3.1-8b-instant';

// ─────────────────────────────────────────────────────
// Helper: USDA FoodData Central (FREE, no key needed)
// Most credible food database — used by nutritionists
// ─────────────────────────────────────────────────────
const searchUSDA = async (query) => {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&dataType=SR%20Legacy,Foundation,Survey%20(FNDDS)&api_key=DEMO_KEY`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
      signal: AbortSignal.timeout(6000), // 6 seconds
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (!data.foods?.length) return [];

    return data.foods.slice(0, 8).map((f, i) => {
      const getNutrient = (id) => {
        const n = f.foodNutrients?.find(n => n.nutrientId === id);
        return n ? Math.round(n.value * 10) / 10 : 0;
      };

      return {
        id:       `usda_${f.fdcId || i}`,
        name:     f.description?.trim() || f.lowercaseDescription || query,
        calories: Math.round(getNutrient(1008) || getNutrient(2047) || 0),
        protein:  getNutrient(1003),
        carbs:    getNutrient(1005),
        fat:      getNutrient(1004),
        fiber:    getNutrient(1079),
        sugar:    getNutrient(2000),
        sodium:   getNutrient(1093),
        serving:  f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : '100g',
        category: f.foodCategory || f.foodCategoryLabel || 'food',
        source:   'USDA FoodData Central',
        sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${f.fdcId}/nutrients`,
        brandOwner: f.brandOwner || null,
        dataType: f.dataType || null,
      };
    }).filter(f => f.calories > 0 || f.protein > 0);
  } catch (err) {
    console.error('USDA search error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────
// Helper: Open Food Facts (branded/packaged foods)
// Good for Filipino packaged foods, snacks, etc.
// ─────────────────────────────────────────────────────
const searchOpenFoodFacts = async (query) => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,serving_size,categories_tags,brands`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
      signal: AbortSignal.timeout(5000), // 5 seconds
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.products || [])
      .filter(p => p.product_name?.trim() && p.nutriments?.['energy-kcal_100g'] > 0)
      .map((p, i) => ({
        id:       `off_${p.code || Math.random().toString(36).substr(2, 8)}`,
        name:     p.product_name.trim(),
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein:  Math.round((p.nutriments['proteins_100g']      || 0) * 10) / 10,
        carbs:    Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat:      Math.round((p.nutriments['fat_100g']           || 0) * 10) / 10,
        fiber:    Math.round((p.nutriments['fiber_100g']         || 0) * 10) / 10,
        sugar:    Math.round((p.nutriments['sugars_100g']        || 0) * 10) / 10,
        serving:  p.serving_size || '100g',
        category: p.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || 'food',
        brand:    p.brands || null,
        source:   'Open Food Facts',
        sourceUrl: `https://world.openfoodfacts.org/product/${p.code}`,
      }));
  } catch (err) {
    console.error('Open Food Facts error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────
// Helper: AI fallback via Groq
// Only used when both databases return no results
// Uses USDA values as reference for accuracy
// ─────────────────────────────────────────────────────
const searchWithAI = async (query) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) return [];
  try {
    const prompt = `Give accurate nutrition information for: "${query}"
Use USDA FoodData Central values as reference. Return ONLY valid JSON (no markdown):
{
  "foods": [
    {
      "name": "exact food name",
      "calories": 200,
      "protein": 10,
      "carbs": 25,
      "fat": 5,
      "fiber": 2,
      "sugar": 3,
      "sodium": 50,
      "serving": "100g",
      "category": "protein",
      "description": "brief accurate description based on USDA data"
    }
  ]
}
Include up to 4 common variations. Category options: protein, grains, vegetables, fruits, dairy, nuts, legumes, snacks, beverages, other. Values must be per 100g unless specified.`;

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
      source: 'AI (USDA Reference)',
    }));
  } catch (err) {
    console.error('AI food search error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────
// GET /api/food/search?q=chicken
// Priority: USDA → Open Food Facts → AI
// ─────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    if (!q.trim()) return res.json({ foods: [], total: 0, source: 'none' });

    // Run USDA and Open Food Facts in parallel
    const [usdaFoods, offFoods] = await Promise.all([
      searchUSDA(q),
      searchOpenFoodFacts(q),
    ]);

    let foods = [];
    let source = '';

    if (usdaFoods.length >= 2) {
      // USDA is primary — most credible
      foods = usdaFoods;
      source = 'USDA FoodData Central';

      // Add branded products from OFF if we have room
      if (offFoods.length > 0 && foods.length < 12) {
        foods = [...usdaFoods, ...offFoods];
        source = 'USDA + Open Food Facts';
      }
    } else if (offFoods.length >= 2) {
      // OFF as secondary
      foods = [...offFoods, ...usdaFoods];
      source = 'Open Food Facts';
    } else if (usdaFoods.length > 0 || offFoods.length > 0) {
      // Some results from either
      foods = [...usdaFoods, ...offFoods];
      source = 'USDA + Open Food Facts';
    } else {
      // No database results — AI fallback
      console.log(`No DB results for "${q}" — using AI fallback`);
      foods = await searchWithAI(q);
      source = 'AI (USDA Reference)';
    }

    // Deduplicate by name
    const seen = new Set();
    foods = foods.filter(f => {
      const key = f.name.toLowerCase().slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out zero-calorie and nameless results
    foods = foods.filter(f => f.name && f.name.length > 1);

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

// ─────────────────────────────────────────────────────
// GET /api/food/info?name=banana
// Detailed breakdown — tries USDA first, then AI
// ─────────────────────────────────────────────────────
router.get('/info', async (req, res) => {
  try {
    const { name, fdcId } = req.query;
    if (!name) return res.status(400).json({ error: 'Food name is required' });

    // Try USDA detailed lookup first
    if (fdcId) {
      try {
        const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=DEMO_KEY`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          const getNutrient = (id) => {
            const n = data.foodNutrients?.find(n => (n.nutrient?.id || n.nutrientId) === id);
            return n ? Math.round((n.amount || n.value || 0) * 10) / 10 : 0;
          };
          return res.json({
            info: {
              name:         data.description,
              calories:     Math.round(getNutrient(1008) || getNutrient(2047)),
              protein:      getNutrient(1003),
              carbs:        getNutrient(1005),
              fat:          getNutrient(1004),
              fiber:        getNutrient(1079),
              sugar:        getNutrient(2000),
              sodium:       getNutrient(1093),
              potassium:    getNutrient(1092),
              vitaminC:     getNutrient(1162),
              calcium:      getNutrient(1087),
              iron:         getNutrient(1089),
              serving:      data.servingSize ? `${data.servingSize}${data.servingSizeUnit || 'g'}` : '100g',
              category:     data.foodCategory?.description || data.dataType,
              sourceUrl:    `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`,
            },
            source: 'USDA FoodData Central',
          });
        }
      } catch {}
    }

    // AI fallback for detailed info
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set' });
    }

    const prompt = `Comprehensive nutrition breakdown for "${name}" based on USDA FoodData Central data.
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
  "potassium": 300,
  "vitaminC": 10,
  "calcium": 50,
  "iron": 2,
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

    res.json({ info: JSON.parse(raw), source: 'AI (USDA Reference)' });
  } catch (err) {
    console.error('Food info error:', err);
    res.status(500).json({ error: 'Could not get food info. Please try again.' });
  }
});

module.exports = router;
