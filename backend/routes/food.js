const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();

let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

const FOOD_MODEL = 'llama-3.1-8b-instant';
const VERIFIED_SOURCE = 'Open Food Facts';
const EXPANDED_SOURCE = 'Open Food Facts (expanded search)';
const AI_CREDIBLE_SOURCE = 'AI Web Sources';
const MIXED_SOURCE = 'Open Food Facts + AI Web Sources';
const LOCAL_FALLBACK_SOURCE = 'Local Essential Foods';
const MIXED_LOCAL_SOURCE = 'Open Food Facts + Local Essentials';
const AI_LOCAL_SOURCE = 'AI Web Sources + Local Essentials';
const MIXED_ALL_SOURCE = 'Open Food Facts + AI + Local Essentials';
const ALLOWED_SOURCE_DOMAINS = [
  'openfoodfacts.org',
  'openfoodfacts.net',
  'myfooddata.com',
  'nutritionix.com',
  'fatsecret.com',
  'myfitnesspal.com',
  'calorieking.com',
  'eatthismuch.com',
  'healthline.com',
  'verywellfit.com',
  'webmd.com',
  'allrecipes.com',
  'panlasangpinoy.com',
  'yummy.ph',
  'luckyme.com.ph',
  'knorr.com',
];
const BLOCKED_WEB_HINT_HOSTS = [
  'duckduckgo.com',
  'google.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'pinterest.com',
  'tiktok.com',
  'reddit.com',
];
const BLOCKED_REFERENCE_DOMAINS = [
  'nutritionvalue.org',
];

const parseJSON = (text = '') => {
  const cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObj = cleaned.indexOf('{');
    const lastObj = cleaned.lastIndexOf('}');
    if (firstObj >= 0 && lastObj > firstObj) {
      const candidate = cleaned.slice(firstObj, lastObj + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Continue to array attempt.
      }
    }

    const firstArr = cleaned.indexOf('[');
    const lastArr = cleaned.lastIndexOf(']');
    if (firstArr >= 0 && lastArr > firstArr) {
      const candidate = cleaned.slice(firstArr, lastArr + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Fall through.
      }
    }

    return {};
  }
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value = '') => String(value).toLowerCase().trim();
const sanitizeQuery = (value = '') => normalizeText(value)
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeToken = (token = '') => {
  const t = String(token || '').toLowerCase().trim();
  if (!t) return '';
  if (t.length <= 3) return t;

  if (t.endsWith('ies') && t.length > 4) return `${t.slice(0, -3)}y`;
  if (t.endsWith('ves') && t.length > 4) return `${t.slice(0, -3)}f`;
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) return t.slice(0, -1);

  return t;
};

const tokenize = (value = '') => sanitizeQuery(value)
  .split(' ')
  .filter(Boolean)
  .map(normalizeToken)
  .filter(Boolean);

const buildTermVariants = (value = '') => {
  const cleaned = sanitizeQuery(value);
  if (!cleaned) return [];

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length !== 1) return [cleaned];

  const token = tokens[0];
  const variants = new Set([cleaned, normalizeToken(token)]);

  if (token.length > 3 && !token.endsWith('s')) variants.add(`${token}s`);
  if (token.endsWith('y') && token.length > 3) variants.add(`${token.slice(0, -1)}ies`);

  return Array.from(variants).map(sanitizeQuery).filter(Boolean);
};

const buildQueryProfile = (query = '') => {
  const cleaned = sanitizeQuery(query);
  const tokens = tokenize(cleaned).filter(token => token.length > 1);
  const anchor = tokens.slice().sort((a, b) => b.length - a.length)[0] || '';
  return { cleaned, tokens, anchor };
};

const uniqueTerms = (terms = []) => Array.from(new Set(
  terms.map(t => sanitizeQuery(t)).filter(Boolean)
));

const decodeHtmlEntities = (value = '') => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const stripHtml = (value = '') => decodeHtmlEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const canonicalizeUrl = (urlValue = '') => {
  try {
    const parsed = new URL(String(urlValue || '').trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const isBlockedWebHintHost = (host = '') => BLOCKED_WEB_HINT_HOSTS
  .some(domain => host === domain || host.endsWith(`.${domain}`));

const isBlockedReferenceHost = (host = '') => BLOCKED_REFERENCE_DOMAINS
  .some(domain => host === domain || host.endsWith(`.${domain}`));

const extractDuckDuckGoUrl = (href = '') => {
  const raw = decodeHtmlEntities(href || '').trim();
  if (!raw) return '';

  if (
    raw.startsWith('/l/?')
    || raw.startsWith('//duckduckgo.com/l/?')
    || raw.startsWith('https://duckduckgo.com/l/?')
    || raw.startsWith('http://duckduckgo.com/l/?')
  ) {
    const withHost = new URL(raw.startsWith('//') ? `https:${raw}` : raw, 'https://duckduckgo.com');
    const redirected = withHost.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : '';
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
};

const isRelevantWebHint = (hint, profile) => {
  const text = sanitizeQuery(`${hint.title || ''} ${hint.url || ''}`);
  if (!text || !profile.cleaned) return false;

  if (profile.tokens.length >= 2) {
    return text.includes(profile.cleaned);
  }

  return profile.tokens.some(token => text.includes(token));
};

const buildHeuristicSearchTerms = (query) => {
  const cleaned = sanitizeQuery(query);
  if (!cleaned) return [];

  const terms = [...buildTermVariants(cleaned)];
  const hasNoodleHint = /\b(noodle|noodles|ramen|pasta|spaghetti|pancit|mami|lomi|canton)\b/.test(cleaned);
  const hasLuckyMeHint = /\b(lucky me|canton)\b/.test(cleaned);

  if (hasNoodleHint && !/\binstant\b/.test(cleaned)) terms.push(`${cleaned} instant`);

  if (hasNoodleHint && !/\b(noodle|noodles|ramen|pasta|spaghetti)\b/.test(cleaned)) {
    terms.push(`${cleaned} noodles`);
    terms.push(`${cleaned} instant noodles`);
  }

  if (hasLuckyMeHint) {
    terms.push(`lucky me ${cleaned}`);
    terms.push(`${cleaned} lucky me`);
  }

  return uniqueTerms(terms).slice(0, 8);
};

const getTokenOverlap = (name = '', profile = { tokens: [] }) => {
  const nameTokens = new Set(tokenize(name));
  return profile.tokens.filter(token => nameTokens.has(token)).length;
};

const hasExactPhraseMatch = (name = '', profile = { cleaned: '', tokens: [] }) => {
  const normalizedName = sanitizeQuery(name);
  if (!normalizedName || !profile.cleaned) return false;

  return normalizedName.includes(profile.cleaned);
};

const isRelevantSearchTerm = (term, profile) => {
  const cleaned = sanitizeQuery(term);
  if (!cleaned) return false;
  if (cleaned === profile.cleaned) return true;
  if (profile.tokens.length >= 2) {
    if (cleaned.includes(profile.cleaned)) return true;
    return getTokenOverlap(cleaned, profile) >= Math.max(2, Math.ceil(profile.tokens.length * 0.6));
  }
  if (profile.anchor && cleaned.includes(profile.anchor)) return true;
  return getTokenOverlap(cleaned, profile) >= 1;
};

const isRelevantFoodName = (name = '', profile = { cleaned: '', tokens: [], anchor: '' }) => {
  const normalizedName = sanitizeQuery(name);
  if (!normalizedName || !profile.cleaned) return false;

  if (hasExactPhraseMatch(normalizedName, profile)) return true;

  const overlap = getTokenOverlap(normalizedName, profile);

  if (profile.tokens.length <= 1) {
    if (overlap >= 1) return true;
    const normalizedQueryToken = normalizeToken(profile.cleaned);
    return Boolean(normalizedQueryToken && normalizedName.includes(normalizedQueryToken));
  }

  const minOverlap = Math.max(2, Math.ceil(profile.tokens.length * 0.6));
  if (overlap >= minOverlap) return true;

  return false;
};

const filterFoodsByRelevance = (foods = [], profile) => {
  const strictMatches = foods.filter(food => isRelevantFoodName(food.name, profile));
  if (strictMatches.length > 0) return strictMatches;

  // For multi-word searches, avoid broad fallback (e.g., "grape juice" -> "grapes").
  if ((profile.tokens || []).length >= 2) return strictMatches;

  if (!profile.anchor) return strictMatches;

  // Safety net: if strict matching yields nothing, keep items containing the anchor token.
  return foods.filter(food => sanitizeQuery(food.name).includes(profile.anchor));
};

const fetchJSON = async (url, timeoutMs = 5000) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`Unexpected OFF response: ${response.status} ${contentType}`);
  }

  return response.json();
};

const getCaloriesPer100g = (nutriments = {}) => {
  const directKcal = toNumber(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal_value']);
  if (directKcal > 0) return Math.round(directKcal);

  const kj = toNumber(nutriments['energy_100g']);
  if (kj > 0) return Math.round(kj / 4.184);

  return 0;
};

const inferCategory = (name = '', categoriesTags = [], categoriesText = '') => {
  const haystack = normalizeText([
    name,
    categoriesText,
    ...(categoriesTags || []).map(tag => tag.replace('en:', '').replace(/-/g, ' ')),
  ].join(' '));

  if (!haystack) return 'other';

  if (/\b(dairy|milk|cheese|yogurt|yoghurt|butter|cream)\b/.test(haystack)) return 'dairy';
  if (/\b(fruit|apple|banana|mango|orange|grape|berry|pineapple|melon)\b/.test(haystack)) return 'fruits';
  if (/\b(vegetable|veggie|broccoli|spinach|carrot|cabbage|lettuce|tomato|pepper)\b/.test(haystack)) return 'vegetables';
  if (/\b(meat|chicken|beef|pork|fish|salmon|tuna|egg|eggs|seafood|protein)\b/.test(haystack)) return 'protein';
  if (/\b(grain|rice|pasta|noodle|bread|oat|wheat|cereal|quinoa|barley)\b/.test(haystack)) return 'grains';
  if (/\b(legume|bean|beans|lentil|chickpea|pea|peas)\b/.test(haystack)) return 'legumes';
  if (/\b(nut|nuts|almond|peanut|cashew|pistachio|hazelnut|walnut)\b/.test(haystack)) return 'nuts';
  if (/\b(snack|chips|crisps|cookie|biscuit|cracker|candy|chocolate|confectionery)\b/.test(haystack)) return 'snacks';
  if (/\b(beverage|drink|juice|soda|cola|coffee|tea|water|smoothie)\b/.test(haystack)) return 'beverages';

  return 'other';
};

const hasUsefulNutrition = (item) => (
  item.calories > 0
  || item.protein > 0
  || item.carbs > 0
  || item.fat > 0
  || item.fiber > 0
  || item.sugar > 0
);

const LOCAL_FOOD_FALLBACKS = [
  { name: 'Grapes', aliases: ['grape', 'grapes', 'green grapes', 'red grapes', 'concord grapes'], calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, sugar: 15.5, category: 'fruits' },
  { name: 'Banana', aliases: ['bananas'], calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, category: 'fruits' },
  { name: 'Apple', aliases: ['apples', 'red apple', 'green apple'], calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10.4, category: 'fruits' },
  { name: 'Orange', aliases: ['oranges', 'mandarin', 'tangerine'], calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, sugar: 9.4, category: 'fruits' },
  { name: 'Mango', aliases: ['mangoes'], calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 13.7, category: 'fruits' },
  { name: 'Pineapple', aliases: ['pineapples'], calories: 50, protein: 0.5, carbs: 13.1, fat: 0.1, fiber: 1.4, sugar: 9.9, category: 'fruits' },
  { name: 'Watermelon', aliases: ['water melon'], calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, sugar: 6.2, category: 'fruits' },
  { name: 'Strawberry', aliases: ['strawberries'], calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9, category: 'fruits' },
  { name: 'Blueberries', aliases: ['blueberry', 'berries'], calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, sugar: 10, category: 'fruits' },
  { name: 'Avocado', aliases: ['avocados'], calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, category: 'vegetables' },
  { name: 'Tomato', aliases: ['tomatoes'], calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, category: 'vegetables' },

  { name: 'Broccoli', aliases: ['brocolli'], calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, sugar: 1.7, category: 'vegetables' },
  { name: 'Carrot', aliases: ['carrots'], calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, sugar: 4.7, category: 'vegetables' },
  { name: 'Spinach', aliases: ['spinach leaves'], calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, category: 'vegetables' },
  { name: 'Lettuce', aliases: ['romaine lettuce'], calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, category: 'vegetables' },
  { name: 'Cucumber', aliases: ['cucumbers'], calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, category: 'vegetables' },
  { name: 'Potato', aliases: ['potatoes'], calories: 77, protein: 2, carbs: 17.6, fat: 0.1, fiber: 2.2, sugar: 0.8, category: 'vegetables' },
  { name: 'Sweet Potato', aliases: ['sweet potatoes', 'kamote'], calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3, sugar: 4.2, category: 'vegetables' },
  { name: 'Onion', aliases: ['onions'], calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, category: 'vegetables' },
  { name: 'Garlic', aliases: ['garlic clove'], calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1, sugar: 1, category: 'vegetables' },

  { name: 'Chicken Breast', aliases: ['chicken', 'breast chicken'], calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, category: 'protein' },
  { name: 'Egg', aliases: ['eggs', 'whole egg'], calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, category: 'protein' },
  { name: 'Salmon', aliases: ['salmon fish'], calories: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0, sugar: 0, category: 'protein' },
  { name: 'Tuna', aliases: ['tuna fish'], calories: 132, protein: 28, carbs: 0, fat: 1.3, fiber: 0, sugar: 0, category: 'protein' },
  { name: 'Lean Beef', aliases: ['beef', 'lean beef'], calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, category: 'protein' },
  { name: 'Pork Loin', aliases: ['pork'], calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, category: 'protein' },
  { name: 'Tofu', aliases: ['soy tofu'], calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, category: 'legumes' },

  { name: 'Cooked White Rice', aliases: ['white rice', 'rice'], calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, sugar: 0.1, category: 'grains' },
  { name: 'Cooked Brown Rice', aliases: ['brown rice'], calories: 112, protein: 2.3, carbs: 23.5, fat: 0.8, fiber: 1.8, sugar: 0.4, category: 'grains' },
  { name: 'Oatmeal', aliases: ['oats', 'rolled oats'], calories: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7, sugar: 0.3, category: 'grains' },
  { name: 'Whole Wheat Bread', aliases: ['bread', 'wheat bread'], calories: 247, protein: 13, carbs: 41, fat: 4.2, fiber: 7, sugar: 6, category: 'grains' },
  { name: 'Cooked Pasta', aliases: ['pasta', 'spaghetti', 'macaroni', 'noodles'], calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.5, sugar: 0.8, category: 'grains' },

  { name: 'Milk (Low Fat)', aliases: ['milk', 'low fat milk'], calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, category: 'dairy' },
  { name: 'Greek Yogurt (Plain)', aliases: ['greek yogurt', 'yogurt', 'yoghurt'], calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2, category: 'dairy' },
  { name: 'Cheddar Cheese', aliases: ['cheese', 'cheddar'], calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, category: 'dairy' },

  { name: 'Lentils (Cooked)', aliases: ['lentils', 'lentil'], calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, category: 'legumes' },
  { name: 'Chickpeas (Cooked)', aliases: ['chickpeas', 'garbanzo'], calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, sugar: 4.8, category: 'legumes' },
  { name: 'Black Beans (Cooked)', aliases: ['black beans', 'beans'], calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, sugar: 0.3, category: 'legumes' },

  { name: 'Peanuts', aliases: ['peanut', 'nuts'], calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5, sugar: 4.7, category: 'nuts' },
  { name: 'Almonds', aliases: ['almond'], calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, sugar: 4.4, category: 'nuts' },

  { name: 'Hot Dog', aliases: ['hotdog', 'hotdogs'], calories: 290, protein: 11, carbs: 2.3, fat: 26, fiber: 0, sugar: 0.7, category: 'snacks' },
  { name: 'Hamburger', aliases: ['burger'], calories: 295, protein: 17, carbs: 30, fat: 12, fiber: 1.5, sugar: 5.5, category: 'snacks' },
  { name: 'Pizza (Cheese)', aliases: ['pizza'], calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.3, sugar: 3.6, category: 'snacks' },

  { name: 'Coffee (Brewed)', aliases: ['coffee', 'black coffee'], calories: 1, protein: 0.1, carbs: 0, fat: 0, fiber: 0, sugar: 0, category: 'beverages' },
  { name: 'Tea (Unsweetened)', aliases: ['tea', 'green tea', 'black tea'], calories: 1, protein: 0, carbs: 0.2, fat: 0, fiber: 0, sugar: 0, category: 'beverages' },
  { name: 'Grape Juice', aliases: ['grape juice', 'grape juice concentrate', 'concord grape juice', 'grape juice from concentrate'], calories: 60, protein: 0.4, carbs: 14.8, fat: 0.1, fiber: 0.2, sugar: 14, category: 'beverages' },
  { name: 'Orange Juice', aliases: ['juice', 'orange juice'], calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2, sugar: 8.4, category: 'beverages' },
  { name: 'Coconut Water', aliases: ['coconut water'], calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, sugar: 2.6, category: 'beverages' },
];

const buildLocalFallbackFoods = (profile, limit = 8) => {
  if (!profile?.cleaned) return [];

  const variantSet = new Set([profile.cleaned, ...(buildTermVariants(profile.cleaned) || [])].filter(Boolean));
  if ((profile.tokens || []).length <= 1 && profile.anchor) variantSet.add(profile.anchor);
  const variants = Array.from(variantSet);

  const matches = LOCAL_FOOD_FALLBACKS.filter((item) => {
    const lookupPool = [item.name, ...(item.aliases || [])]
      .map(sanitizeQuery)
      .filter(Boolean);

    if (lookupPool.some(text => variants.includes(text))) return true;

    if (lookupPool.some((text) => variants.some((v) => v && text.includes(v)))) return true;

    const maxOverlap = lookupPool.reduce((best, text) => {
      const overlap = getTokenOverlap(text, profile);
      return Math.max(best, overlap);
    }, 0);

    if (profile.tokens.length <= 1) return maxOverlap >= 1;
    return maxOverlap >= Math.max(2, Math.ceil(profile.tokens.length * 0.6));
  });

  return matches.slice(0, limit).map((item, index) => ({
    id: `local_${normalizeText(item.name).replace(/\s+/g, '_')}_${index}`,
    code: null,
    name: item.name,
    calories: Math.round(toNumber(item.calories)),
    protein: Math.round(toNumber(item.protein) * 10) / 10,
    carbs: Math.round(toNumber(item.carbs) * 10) / 10,
    fat: Math.round(toNumber(item.fat) * 10) / 10,
    fiber: Math.round(toNumber(item.fiber) * 10) / 10,
    sugar: Math.round(toNumber(item.sugar) * 10) / 10,
    serving: '100g',
    category: item.category || inferCategory(item.name),
    source: LOCAL_FALLBACK_SOURCE,
    matchedQuery: profile.cleaned,
  }));
};

const scoreFood = (food, queryProfile) => {
  const normalizedQuery = queryProfile.cleaned;
  const normalizedName = normalizeText(food.name);
  let score = 0;
  const overlap = getTokenOverlap(normalizedName, queryProfile);

  if (normalizedName === normalizedQuery) score += 100;
  if (normalizedName.startsWith(normalizedQuery)) score += 60;
  if (normalizedName.includes(normalizedQuery)) score += 40;
  if (food.matchedQuery === normalizedQuery) score += 20;
  if (queryProfile.anchor && normalizedName.includes(queryProfile.anchor)) score += 20;
  score += overlap * 25;
  if (food.calories > 0) score += 5;

  return score;
};

const dedupeFoods = (foods = []) => {
  const seen = new Set();
  return foods.filter((food) => {
    const key = food.code ? `code:${food.code}` : `name:${normalizeText(food.name)}:${normalizeText(food.serving)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseSourceUrl = (urlValue) => {
  try {
    const parsed = new URL(String(urlValue || '').trim());
    const host = parsed.hostname.toLowerCase();
    const canonicalUrl = canonicalizeUrl(parsed.toString());
    return {
      url: parsed.toString(),
      canonicalUrl,
      host,
      isBlocked: isBlockedReferenceHost(host),
      isAllowed: ALLOWED_SOURCE_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`)),
    };
  } catch {
    return null;
  }
};

const normalizeReferences = (references = [], webHints = []) => {
  const normalized = [];
  const seen = new Set();
  const hintUrlSet = new Set(webHints.map(hint => canonicalizeUrl(hint.url)).filter(Boolean));
  const hintHostSet = new Set(webHints.map(hint => String(hint.domain || '').toLowerCase()).filter(Boolean));

  for (const ref of references) {
    const parsed = parseSourceUrl(ref?.url);
    if (!parsed) continue;
    if (parsed.isBlocked) continue;

    const allowByHint = hintUrlSet.has(parsed.canonicalUrl) || hintHostSet.has(parsed.host);
    if (!parsed.isAllowed && !allowByHint) continue;

    const key = parsed.canonicalUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      name: String(ref?.name || parsed.host).slice(0, 120),
      url: parsed.canonicalUrl,
      domain: parsed.host,
    });
  }

  return normalized;
};

const normalizeAIFood = (food = {}, profile, index = 0, webHints = []) => {
  const query = profile.cleaned;
  const name = String(food.name || '').trim();
  const references = normalizeReferences(food.references || [], webHints);
  if (!name || references.length === 0) return null;
  if (!isRelevantFoodName(name, profile)) return null;

  const calories = clamp(Math.round(toNumber(food.calories)), 0, 950);
  const protein = clamp(Math.round(toNumber(food.protein) * 10) / 10, 0, 100);
  const carbs = clamp(Math.round(toNumber(food.carbs) * 10) / 10, 0, 100);
  const fat = clamp(Math.round(toNumber(food.fat) * 10) / 10, 0, 100);
  const fiber = clamp(Math.round(toNumber(food.fiber) * 10) / 10, 0, 100);
  const sugar = clamp(Math.round(toNumber(food.sugar) * 10) / 10, 0, 100);

  const normalized = {
    id: `ai_${normalizeText(query).replace(/\s+/g, '_')}_${index}`,
    code: null,
    name,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    serving: String(food.serving || '100g').slice(0, 40),
    category: inferCategory(name, [], String(food.category || '')),
    source: AI_CREDIBLE_SOURCE,
    matchedQuery: query,
    references,
  };

  return hasUsefulNutrition(normalized) ? normalized : null;
};

// ─────────────────────────────────────────────
// Helper: Search Open Food Facts
// ─────────────────────────────────────────────
const searchOpenFoodFacts = async (query, pageSize = 20) => {
  try {
    const fields = 'code,product_name,product_name_en,nutriments,serving_size,categories,categories_tags';
    const urls = [
      `https://world.openfoodfacts.net/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=${pageSize}&fields=${fields}`,
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=${pageSize}&fields=${fields}`,
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=${fields}`,
    ];

    let data = null;
    for (const url of urls) {
      try {
        data = await fetchJSON(url, 5000);
        if (Array.isArray(data?.products)) break;
      } catch {
        // Try next endpoint.
      }
    }

    if (!Array.isArray(data?.products)) return [];

    return (data.products || [])
      .filter(p => (p.product_name || p.product_name_en || '').trim())
      .map((p) => {
        const nutriments = p.nutriments || {};
        const name = (p.product_name || p.product_name_en || '').trim();
        return {
          id: `off_${p.code || `${normalizeText(name).replace(/\s+/g, '_').slice(0, 32)}_${Math.random().toString(36).slice(2, 6)}`}`,
          code: p.code || null,
          name,
          calories: getCaloriesPer100g(nutriments),
          protein: Math.round(toNumber(nutriments['proteins_100g']) * 10) / 10,
          carbs: Math.round(toNumber(nutriments['carbohydrates_100g']) * 10) / 10,
          fat: Math.round(toNumber(nutriments['fat_100g']) * 10) / 10,
          fiber: Math.round(toNumber(nutriments['fiber_100g']) * 10) / 10,
          sugar: Math.round(toNumber(nutriments['sugars_100g']) * 10) / 10,
          serving: p.serving_size || '100g',
          category: inferCategory(name, p.categories_tags, p.categories),
          source: VERIFIED_SOURCE,
          matchedQuery: normalizeText(query),
        };
      })
      .filter(hasUsefulNutrition);
  } catch (err) {
    return [];
  }
};

// ─────────────────────────────────────────────
// Helper: Gather web search hints for AI fallback
// ─────────────────────────────────────────────
const searchWebHints = async (profile, limit = 8) => {
  try {
    const query = `${profile.cleaned} nutrition facts`;
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return [];
    const html = await response.text();
    const hints = [];
    const seen = new Set();
    const anchorRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match = anchorRegex.exec(html);
    while (match && hints.length < limit) {
      const link = extractDuckDuckGoUrl(match[1]);
      const title = stripHtml(match[2]);
      const canonical = canonicalizeUrl(link);
      const parsed = parseSourceUrl(canonical);

      if (parsed && !parsed.isBlocked && !isBlockedWebHintHost(parsed.host) && isRelevantWebHint({ title, url: canonical }, profile)) {
        const key = parsed.canonicalUrl.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          hints.push({
            title: title || parsed.host,
            url: parsed.canonicalUrl,
            domain: parsed.host,
          });
        }
      }

      match = anchorRegex.exec(html);
    }

    return hints;
  } catch (err) {
    return [];
  }
};

const parseNutritionValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? toNumber(match[0]) : 0;
};

const safeParseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const collectJsonLdNodes = (value, out = []) => {
  if (Array.isArray(value)) {
    value.forEach(item => collectJsonLdNodes(item, out));
    return out;
  }

  if (!value || typeof value !== 'object') {
    return out;
  }

  out.push(value);

  if (value['@graph']) collectJsonLdNodes(value['@graph'], out);
  if (value.mainEntity) collectJsonLdNodes(value.mainEntity, out);
  if (value.itemListElement) collectJsonLdNodes(value.itemListElement, out);

  return out;
};

const hasFoodType = (node = {}) => {
  const raw = node['@type'];
  const types = Array.isArray(raw) ? raw : [raw];
  const lowered = types.map(t => String(t || '').toLowerCase());
  return lowered.some(t => t.includes('recipe') || t.includes('product') || t.includes('food'));
};

const extractFoodsFromJsonLd = (html, hint, profile) => {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const foods = [];
  let match = scriptRegex.exec(html);

  while (match) {
    const parsed = safeParseJSON(match[1].trim());
    if (parsed) {
      const nodes = collectJsonLdNodes(parsed);
      for (const node of nodes) {
        if (!hasFoodType(node)) continue;

        const nutrition = node.nutrition && typeof node.nutrition === 'object' ? node.nutrition : {};
        const name = String(node.name || node.headline || hint.title || '').trim();
        if (!name || !isRelevantFoodName(name, profile)) continue;

        const calories = Math.round(parseNutritionValue(nutrition.calories || nutrition.energy || nutrition.energyContent));
        const protein = Math.round(parseNutritionValue(nutrition.proteinContent) * 10) / 10;
        const carbs = Math.round(parseNutritionValue(nutrition.carbohydrateContent) * 10) / 10;
        const fat = Math.round(parseNutritionValue(nutrition.fatContent) * 10) / 10;
        const fiber = Math.round(parseNutritionValue(nutrition.fiberContent) * 10) / 10;
        const sugar = Math.round(parseNutritionValue(nutrition.sugarContent) * 10) / 10;

        const food = {
          id: `web_${normalizeText(name).replace(/\s+/g, '_').slice(0, 28)}_${Math.random().toString(36).slice(2, 6)}`,
          code: null,
          name,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          serving: String(nutrition.servingSize || node.recipeYield || '100g').slice(0, 40),
          category: inferCategory(name, [], String(node.description || '')),
          source: AI_CREDIBLE_SOURCE,
          matchedQuery: profile.cleaned,
          references: [{
            name: hint.title || hint.domain,
            url: hint.url,
            domain: hint.domain,
          }],
        };

        if (hasUsefulNutrition(food)) {
          foods.push(food);
        }
      }
    }

    match = scriptRegex.exec(html);
  }

  return foods;
};

const searchWebFoods = async (profile, webHints = [], limit = 8) => {
  const collected = [];

  for (const hint of webHints.slice(0, 6)) {
    if (collected.length >= limit) break;

    try {
      const response = await fetch(hint.url, {
        headers: { 'User-Agent': 'heAlthy-App/1.0 (student-project)' },
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await response.text();
      const foods = extractFoodsFromJsonLd(html, hint, profile);
      collected.push(...foods);
    } catch {
      // Continue with next hint.
    }
  }

  return dedupeFoods(collected)
    .sort((a, b) => scoreFood(b, profile) - scoreFood(a, profile))
    .slice(0, limit);
};

// ─────────────────────────────────────────────
// Helper: AI query expansion only (no generated nutrition)
// ─────────────────────────────────────────────
const getAISearchTerms = async (query) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) return [];

  try {
    const prompt = `You are helping search Open Food Facts.
Given the food query "${query}", suggest up to 3 alternative search terms that are likely product names or common variants.
Do not include nutrition values, explanations, or made-up foods.
Return ONLY valid JSON:
{
  "terms": ["term 1", "term 2", "term 3"]
}`;

    const completion = await getGroq().chat.completions.create({
      model: FOOD_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 120,
    });

    const parsed = parseJSON(completion.choices[0]?.message?.content || '{}');
    return Array.from(new Set((parsed.terms || [])
      .map(t => String(t || '').trim())
      .filter(Boolean)))
      .slice(0, 3);
  } catch (err) {
    console.error('AI search term expansion error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────
// Helper: AI internet-sourced nutrition fallback
// Returns only results that include allowed credible source URLs.
// ─────────────────────────────────────────────
const searchWithAICredibleSources = async (profile, webHints = [], limit = 8) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('gsk_your')) return [];

  try {
    const hintLines = webHints
      .slice(0, 10)
      .map((hint, index) => `${index + 1}. ${hint.title} - ${hint.url}`)
      .join('\n');

    const prompt = `Find up to ${limit} foods for query "${profile.cleaned}" and provide nutrition per 100g.
Use credible nutrition sources from these domains:
${ALLOWED_SOURCE_DOMAINS.join(', ')}

Web search hints for this exact query:
${hintLines || '(none)'}

Rules:
- Do not invent foods.
- Every food name MUST contain the exact phrase "${profile.cleaned}" (case-insensitive).
- If a food does not include that exact phrase in its name, do not include it.
- If no foods satisfy this strict rule, return an empty foods array.
- Prefer source URLs from the web search hints above when possible.
- Each food must include at least 1 source URL from either:
  1) one of the provided web search hints, or
  2) an approved domain from the list above.
- Return only JSON.

JSON format:
{
  "foods": [
    {
      "name": "food name",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0,
      "sugar": 0,
      "serving": "100g",
      "category": "protein|grains|vegetables|fruits|dairy|nuts|legumes|snacks|beverages|other",
      "references": [
        { "name": "source name", "url": "https://..." }
      ]
    }
  ]
}`;

    const completion = await getGroq().chat.completions.create({
      model: FOOD_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 1400,
    });

    const parsed = parseJSON(completion.choices[0]?.message?.content || '{}');
    return (parsed.foods || [])
      .map((food, index) => normalizeAIFood(food, profile, index, webHints))
      .filter(Boolean)
      .slice(0, limit);
  } catch (err) {
    console.error('AI credible food search error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────
// GET /api/food/search?q=chicken
// Strategy:
// 1) Open Food Facts first (primary source)
// 2) AI expanded terms for Open Food Facts
// 3) AI credible web fallback for missing foods
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const queryProfile = buildQueryProfile(q);
    const normalizedQuery = queryProfile.cleaned;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    if (!normalizedQuery) return res.json({ foods: [], total: 0, source: 'none' });

    const heuristicTerms = buildHeuristicSearchTerms(normalizedQuery);
    const aiTerms = await getAISearchTerms(normalizedQuery);
    const relevantAiTerms = aiTerms.filter(term => isRelevantSearchTerm(term, queryProfile));
    const searchTerms = uniqueTerms([normalizedQuery, ...heuristicTerms, ...relevantAiTerms]).slice(0, 10);

    const settledResults = await Promise.allSettled(
      searchTerms.map(term => searchOpenFoodFacts(term, 25))
    );

    let foods = settledResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);

    foods = filterFoodsByRelevance(foods, queryProfile);

    foods = dedupeFoods(foods)
      .sort((a, b) => scoreFood(b, queryProfile) - scoreFood(a, queryProfile));

    let webHints = [];
    let webFoods = [];
    let aiFoods = [];
    let localFoods = [];
    if (foods.length < parsedLimit) {
      webHints = await searchWebHints(queryProfile, 10);
      webFoods = await searchWebFoods(queryProfile, webHints, Math.min(parsedLimit - foods.length, 10));
      foods = dedupeFoods([...foods, ...webFoods])
        .sort((a, b) => scoreFood(b, queryProfile) - scoreFood(a, queryProfile));
    }

    if (foods.length < parsedLimit) {
      aiFoods = await searchWithAICredibleSources(queryProfile, webHints, Math.min(parsedLimit - foods.length, 10));
      foods = dedupeFoods([...foods, ...aiFoods])
        .sort((a, b) => scoreFood(b, queryProfile) - scoreFood(a, queryProfile));
    }

    if (foods.length < Math.min(parsedLimit, 3)) {
      const localLimit = Math.min(Math.max(parsedLimit - foods.length, 0), 12);
      if (localLimit > 0) {
        localFoods = buildLocalFallbackFoods(queryProfile, localLimit);
        foods = dedupeFoods([...foods, ...localFoods])
          .sort((a, b) => scoreFood(b, queryProfile) - scoreFood(a, queryProfile));
      }
    }

    const hasOFF = foods.some(food => food.source === VERIFIED_SOURCE);
    const hasAI = foods.some(food => food.source === AI_CREDIBLE_SOURCE);
    const hasLocal = foods.some(food => food.source === LOCAL_FALLBACK_SOURCE);

    let source = VERIFIED_SOURCE;
    if (hasOFF && hasAI && hasLocal) source = MIXED_ALL_SOURCE;
    else if (hasOFF && hasAI) source = MIXED_SOURCE;
    else if (hasOFF && hasLocal) source = MIXED_LOCAL_SOURCE;
    else if (hasAI && hasLocal) source = AI_LOCAL_SOURCE;
    else if (!hasOFF && hasAI) source = AI_CREDIBLE_SOURCE;
    else if (!hasOFF && !hasAI && hasLocal) source = LOCAL_FALLBACK_SOURCE;
    else if (searchTerms.length > 1) source = EXPANDED_SOURCE;

    const responseFoods = foods.slice(0, parsedLimit).map(({ matchedQuery, ...food }) => food);

    res.json({
      foods: responseFoods,
      total: responseFoods.length,
      source,
      query: q,
      usedQueries: searchTerms,
      webHintCount: webHints.length,
      webFallbackCount: webFoods.length,
      aiFallbackCount: aiFoods.length,
      localFallbackCount: localFoods.length,
      fallbackCount: webFoods.length + aiFoods.length + localFoods.length,
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

    res.json({ info: parseJSON(completion.choices[0]?.message?.content || '{}'), source: 'AI Generated' });
  } catch (err) {
    console.error('Food info error:', err);
    res.status(500).json({ error: 'Could not get food info. Please try again.' });
  }
});

module.exports = router;
