import React, { useState } from 'react';
import api from '../utils/api';


// ── SEARCHING GIFS — swap these URLs with any GIFs you like! ──
// You can replace these with local files: import gif1 from '../assets/search1.gif'
// or use any GIF URL you prefer
const SEARCH_GIFS = [
  'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',       // cooking pan
  'https://media.giphy.com/media/zcCGBRQshGdt6/giphy.gif',       // eating burger
  'https://media.giphy.com/media/TgL7lPGbdkxHy/giphy.gif',       // salad spinning
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',   // chef cooking
  'https://media.giphy.com/media/3oEjHWPTo7c0ajPwty/giphy.gif',  // searching magnifier
];

// Pick a random GIF each time component renders
const getRandomGif = () => SEARCH_GIFS[Math.floor(Math.random() * SEARCH_GIFS.length)];

const SOURCE_BADGE = {
  'Open Food Facts': { label: '📦 Real Data', color: 'bg-blue-100 text-blue-700' },
  'Open Food Facts (expanded search)': { label: '📦 Verified Search+', color: 'bg-teal-100 text-teal-700' },
  'Open Food Facts + AI Web Sources': { label: '📦 + 🤖 Web Sources', color: 'bg-indigo-100 text-indigo-700' },
  'Open Food Facts + AI + Local Essentials': { label: '📦 + 🤖 + 🧭 Essentials', color: 'bg-cyan-100 text-cyan-700' },
  'Open Food Facts + Local Essentials': { label: '📦 + 🧭 Local Essentials', color: 'bg-sky-100 text-sky-700' },
  'AI Web Sources + Local Essentials': { label: '🤖 + 🧭 Essentials', color: 'bg-emerald-100 text-emerald-700' },
  'Local Essential Foods': { label: '🧭 Local Essentials', color: 'bg-emerald-100 text-emerald-700' },
  'AI Web Sources': { label: '🤖 Web-Cited Data', color: 'bg-violet-100 text-violet-700' },
  'Open Food Facts + AI': { label: '📦 + 🤖 AI', color: 'bg-purple-100 text-purple-700' },
  'AI Generated': { label: '🤖 AI Generated', color: 'bg-amber-100 text-amber-700' },
};

const CATEGORY_COLORS = {
  protein: 'bg-blue-100 text-blue-700',
  grains: 'bg-yellow-100 text-yellow-700',
  vegetables: 'bg-green-100 text-green-700',
  fruits: 'bg-orange-100 text-orange-700',
  dairy: 'bg-purple-100 text-purple-700',
  nuts: 'bg-amber-100 text-amber-700',
  legumes: 'bg-red-100 text-red-700',
  snacks: 'bg-pink-100 text-pink-700',
  beverages: 'bg-cyan-100 text-cyan-700',
  other: 'bg-sage-100 text-sage-700 dark:text-gray-300',
};

const CATEGORY_LABELS = {
  protein: 'Protein',
  grains: 'Grains',
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  dairy: 'Dairy',
  nuts: 'Nuts',
  legumes: 'Legumes',
  snacks: 'Snacks',
  beverages: 'Beverages',
  other: 'Other',
};

const EMOJI_BY_CATEGORY = {
  protein: '🥩',
  grains: '🌾',
  vegetables: '🥦',
  fruits: '🍎',
  dairy: '🥛',
  nuts: '🥜',
  legumes: '🫘',
  snacks: '🍿',
  beverages: '🥤',
  other: '🍽️',
};

const normalizeEmojiText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const CATEGORY_KEYS = new Set(Object.keys(CATEGORY_LABELS));

// Ordered, name-first emoji matching using food/drink emojis from Emojipedia's Food & Drink list.
const FOOD_DRINK_EMOJI_RULES = [
  { emoji: '🧋', category: 'beverages', pattern: /\b(bubble tea|boba|milk tea|tapioca)\b/ },
  { emoji: '🧃', category: 'beverages', pattern: /\b(juice|nectar|beverage box|boxed juice)\b/ },
  { emoji: '🥤', category: 'beverages', pattern: /\b(soda|cola|soft drink|lemonade|energy drink|sports drink|smoothie|shake|milkshake)\b/ },
  { emoji: '☕', category: 'beverages', pattern: /\b(coffee|espresso|cappuccino|latte|mocha|americano)\b/ },
  { emoji: '🍵', category: 'beverages', pattern: /\b(matcha|green tea|black tea|oolong|chai|tea)\b/ },
  { emoji: '🫖', category: 'beverages', pattern: /\b(teapot)\b/ },
  { emoji: '🍶', category: 'beverages', pattern: /\b(sake)\b/ },
  { emoji: '🍾', category: 'beverages', pattern: /\b(champagne|prosecco|sparkling wine|popping cork)\b/ },
  { emoji: '🍷', category: 'beverages', pattern: /\b(wine|rose wine|red wine|white wine)\b/ },
  { emoji: '🍸', category: 'beverages', pattern: /\b(cocktail|martini)\b/ },
  { emoji: '🍹', category: 'beverages', pattern: /\b(tropical drink|mojito|margarita|pina colada)\b/ },
  { emoji: '🍺', category: 'beverages', pattern: /\b(beer|lager|ale|stout)\b/ },
  { emoji: '🍻', category: 'beverages', pattern: /\b(clinking beer|beers)\b/ },
  { emoji: '🥂', category: 'beverages', pattern: /\b(cheers|toast|clinking glasses)\b/ },
  { emoji: '🥃', category: 'beverages', pattern: /\b(whisky|whiskey|scotch|tumbler)\b/ },
  { emoji: '🫗', category: 'beverages', pattern: /\b(water|mineral water|sparkling water|pouring liquid|pour over)\b/ },
  { emoji: '🧉', category: 'beverages', pattern: /\b(mate|yerba)\b/ },
  { emoji: '🍼', category: 'beverages', pattern: /\b(baby bottle|formula)\b/ },
  { emoji: '🥛', category: 'dairy', pattern: /\b(milk|yogurt|yoghurt|kefir|lassi)\b/ },

  { emoji: '🍇', category: 'fruits', pattern: /\b(grape|grapes|raisin|raisins)\b/ },
  { emoji: '🍈', category: 'fruits', pattern: /\b(melon|cantaloupe|honeydew)\b/ },
  { emoji: '🍉', category: 'fruits', pattern: /\b(watermelon)\b/ },
  { emoji: '🍊', category: 'fruits', pattern: /\b(tangerine|orange|mandarin|citrus)\b/ },
  { emoji: '🍋', category: 'fruits', pattern: /\b(lemon|lime|calamansi)\b/ },
  { emoji: '🍌', category: 'fruits', pattern: /\b(banana)\b/ },
  { emoji: '🍍', category: 'fruits', pattern: /\b(pineapple)\b/ },
  { emoji: '🥭', category: 'fruits', pattern: /\b(mango)\b/ },
  { emoji: '🍏', category: 'fruits', pattern: /\b(green apple)\b/ },
  { emoji: '🍎', category: 'fruits', pattern: /\b(red apple|apple)\b/ },
  { emoji: '🍐', category: 'fruits', pattern: /\b(pear)\b/ },
  { emoji: '🍑', category: 'fruits', pattern: /\b(peach)\b/ },
  { emoji: '🍒', category: 'fruits', pattern: /\b(cherry|cherries)\b/ },
  { emoji: '🍓', category: 'fruits', pattern: /\b(strawberry|strawberries)\b/ },
  { emoji: '🫐', category: 'fruits', pattern: /\b(blueberry|blueberries|berry|berries)\b/ },
  { emoji: '🥝', category: 'fruits', pattern: /\b(kiwi)\b/ },
  { emoji: '🍅', category: 'fruits', pattern: /\b(tomato)\b/ },
  { emoji: '🫒', category: 'fruits', pattern: /\b(olive)\b/ },
  { emoji: '🥥', category: 'fruits', pattern: /\b(coconut)\b/ },

  { emoji: '🥑', category: 'vegetables', pattern: /\b(avocado)\b/ },
  { emoji: '🍆', category: 'vegetables', pattern: /\b(eggplant|aubergine)\b/ },
  { emoji: '🥔', category: 'vegetables', pattern: /\b(potato)\b/ },
  { emoji: '🥕', category: 'vegetables', pattern: /\b(carrot)\b/ },
  { emoji: '🌽', category: 'vegetables', pattern: /\b(corn)\b/ },
  { emoji: '🌶️', category: 'vegetables', pattern: /\b(hot pepper|chili|chilli|jalapeno|sili)\b/ },
  { emoji: '🫑', category: 'vegetables', pattern: /\b(bell pepper|capsicum|pepper)\b/ },
  { emoji: '🥒', category: 'vegetables', pattern: /\b(cucumber|pickle|gherkin)\b/ },
  { emoji: '🥬', category: 'vegetables', pattern: /\b(leafy green|lettuce|kale|spinach|greens)\b/ },
  { emoji: '🥦', category: 'vegetables', pattern: /\b(broccoli|cauliflower)\b/ },
  { emoji: '🧄', category: 'vegetables', pattern: /\b(garlic)\b/ },
  { emoji: '🧅', category: 'vegetables', pattern: /\b(onion)\b/ },
  { emoji: '🫚', category: 'vegetables', pattern: /\b(ginger)\b/ },
  { emoji: '🫛', category: 'vegetables', pattern: /\b(pea pod|green bean|string bean|peas?)\b/ },
  { emoji: '🍄‍🟫', category: 'vegetables', pattern: /\b(brown mushroom|mushroom|shiitake|portobello)\b/ },
  { emoji: '🫜', category: 'vegetables', pattern: /\b(root vegetable|radish|turnip|beet)\b/ },

  { emoji: '🌰', category: 'nuts', pattern: /\b(chestnut)\b/ },
  { emoji: '🥜', category: 'nuts', pattern: /\b(peanut|peanuts|almond|cashew|pistachio|hazelnut|walnut|macadamia|pecan|mixed nuts)\b/ },
  { emoji: '🫘', category: 'legumes', pattern: /\b(bean|beans|lentil|lentils|chickpea|chickpeas|edamame|soy|tofu)\b/ },

  { emoji: '🍞', category: 'grains', pattern: /\b(bread|toast|loaf)\b/ },
  { emoji: '🥐', category: 'grains', pattern: /\b(croissant)\b/ },
  { emoji: '🥖', category: 'grains', pattern: /\b(baguette)\b/ },
  { emoji: '🫓', category: 'grains', pattern: /\b(flatbread|naan|pita|tortilla|roti)\b/ },
  { emoji: '🥨', category: 'grains', pattern: /\b(pretzel)\b/ },
  { emoji: '🥯', category: 'grains', pattern: /\b(bagel)\b/ },
  { emoji: '🥞', category: 'grains', pattern: /\b(pancake)\b/ },
  { emoji: '🧇', category: 'grains', pattern: /\b(waffle)\b/ },
  { emoji: '🥣', category: 'grains', pattern: /\b(bowl with spoon|cereal|oatmeal|oats|porridge|granola|muesli)\b/ },
  { emoji: '🍘', category: 'grains', pattern: /\b(rice cracker)\b/ },
  { emoji: '🍙', category: 'grains', pattern: /\b(rice ball|onigiri)\b/ },
  { emoji: '🍚', category: 'grains', pattern: /\b(cooked rice|steamed rice|fried rice|rice)\b/ },
  { emoji: '🍛', category: 'grains', pattern: /\b(curry rice|curry)\b/ },
  { emoji: '🍜', category: 'grains', pattern: /\b(steaming bowl|noodle|noodles|ramen|udon|soba|pho|pancit|lomi|mami|vermicelli)\b/ },
  { emoji: '🍝', category: 'grains', pattern: /\b(spaghetti|pasta|macaroni|lasagna|fettuccine|penne|ravioli)\b/ },

  { emoji: '🧀', category: 'dairy', pattern: /\b(cheese)\b/ },
  { emoji: '🧈', category: 'dairy', pattern: /\b(butter|ghee)\b/ },
  { emoji: '🍦', category: 'dairy', pattern: /\b(soft ice cream|ice cream cone)\b/ },
  { emoji: '🍧', category: 'dairy', pattern: /\b(shaved ice|halo halo|halo-halo)\b/ },
  { emoji: '🍨', category: 'dairy', pattern: /\b(ice cream|gelato|frozen yogurt)\b/ },

  { emoji: '🍖', category: 'protein', pattern: /\b(meat on bone|ribs)\b/ },
  { emoji: '🍗', category: 'protein', pattern: /\b(poultry leg|drumstick|chicken wing|chicken|turkey|duck)\b/ },
  { emoji: '🥩', category: 'protein', pattern: /\b(cut of meat|beef|steak|pork|lamb|ham|sausage|meatball)\b/ },
  { emoji: '🥓', category: 'protein', pattern: /\b(bacon)\b/ },
  { emoji: '🥚', category: 'protein', pattern: /\b(egg|eggs)\b/ },
  { emoji: '🍳', category: 'protein', pattern: /\b(cooking|omelet|omelette|fried egg)\b/ },
  { emoji: '🍣', category: 'protein', pattern: /\b(sushi|sashimi)\b/ },
  { emoji: '🍤', category: 'protein', pattern: /\b(fried shrimp|shrimp|prawn|tempura)\b/ },
  { emoji: '🍥', category: 'protein', pattern: /\b(fish cake|surimi)\b/ },
  { emoji: '🍢', category: 'protein', pattern: /\b(oden|skewer|fishball|kikiam)\b/ },

  { emoji: '🍔', category: 'snacks', pattern: /\b(hamburger|cheeseburger|burger)\b/ },
  { emoji: '🍟', category: 'snacks', pattern: /\b(french fries|fries|chips|crisps|nachos)\b/ },
  { emoji: '🍕', category: 'snacks', pattern: /\b(pizza)\b/ },
  { emoji: '🌭', category: 'snacks', pattern: /\b(hot dog|hotdog)\b/ },
  { emoji: '🥪', category: 'snacks', pattern: /\b(sandwich|sub|panini)\b/ },
  { emoji: '🌮', category: 'snacks', pattern: /\b(taco)\b/ },
  { emoji: '🌯', category: 'snacks', pattern: /\b(burrito|wrap)\b/ },
  { emoji: '🫔', category: 'snacks', pattern: /\b(tamale)\b/ },
  { emoji: '🥙', category: 'snacks', pattern: /\b(stuffed flatbread|gyro|shawarma|kebab)\b/ },
  { emoji: '🧆', category: 'snacks', pattern: /\b(falafel)\b/ },
  { emoji: '🥘', category: 'snacks', pattern: /\b(shallow pan|paella)\b/ },
  { emoji: '🍲', category: 'snacks', pattern: /\b(pot of food|soup|stew|broth|chowder)\b/ },
  { emoji: '🫕', category: 'snacks', pattern: /\b(fondue)\b/ },
  { emoji: '🥗', category: 'snacks', pattern: /\b(green salad|salad)\b/ },
  { emoji: '🍿', category: 'snacks', pattern: /\b(popcorn)\b/ },
  { emoji: '🧂', category: 'snacks', pattern: /\b(salt)\b/ },
  { emoji: '🥫', category: 'snacks', pattern: /\b(canned food|canned)\b/ },
  { emoji: '🍱', category: 'snacks', pattern: /\b(bento|bento box)\b/ },
  { emoji: '🥟', category: 'snacks', pattern: /\b(dumpling|siomai|siu mai|gyoza|wonton)\b/ },
  { emoji: '🥮', category: 'snacks', pattern: /\b(moon cake|mooncake)\b/ },
  { emoji: '🍡', category: 'snacks', pattern: /\b(dango)\b/ },
  { emoji: '🥠', category: 'snacks', pattern: /\b(fortune cookie)\b/ },
  { emoji: '🥡', category: 'snacks', pattern: /\b(takeout box|take out)\b/ },
  { emoji: '🍠', category: 'snacks', pattern: /\b(roasted sweet potato|sweet potato|yam|kamote)\b/ },
  { emoji: '🍩', category: 'snacks', pattern: /\b(doughnut|donut)\b/ },
  { emoji: '🍪', category: 'snacks', pattern: /\b(cookie|cookies|biscuit|biscuits|cracker|crackers)\b/ },
  { emoji: '🎂', category: 'snacks', pattern: /\b(birthday cake)\b/ },
  { emoji: '🍰', category: 'snacks', pattern: /\b(shortcake|cake)\b/ },
  { emoji: '🧁', category: 'snacks', pattern: /\b(cupcake|muffin)\b/ },
  { emoji: '🥧', category: 'snacks', pattern: /\b(pie|tart)\b/ },
  { emoji: '🍫', category: 'snacks', pattern: /\b(chocolate|cocoa|chocolate bar)\b/ },
  { emoji: '🍬', category: 'snacks', pattern: /\b(candy|candies|sweets)\b/ },
  { emoji: '🍭', category: 'snacks', pattern: /\b(lollipop)\b/ },
  { emoji: '🍮', category: 'snacks', pattern: /\b(custard|pudding|flan)\b/ },
  { emoji: '🍯', category: 'snacks', pattern: /\b(honey|honey pot)\b/ },

  { emoji: '🥢', category: 'other', pattern: /\b(chopsticks)\b/ },
  { emoji: '🍽️', category: 'other', pattern: /\b(fork and knife with plate|meal plate|plate)\b/ },
  { emoji: '🍴', category: 'other', pattern: /\b(fork and knife|cutlery|utensils?)\b/ },
  { emoji: '🥄', category: 'other', pattern: /\b(spoon)\b/ },
  { emoji: '🔪', category: 'other', pattern: /\b(kitchen knife|knife)\b/ },
  { emoji: '🫙', category: 'other', pattern: /\b(jar|jam|jelly)\b/ },
  { emoji: '🏺', category: 'other', pattern: /\b(amphora)\b/ },
];

const CATEGORY_INFERENCE_RULES = [
  { category: 'beverages', pattern: /\b(coffee|tea|juice|soda|cola|drink|water|wine|beer|cocktail|shake|smoothie|boba|bubble tea|milk tea)\b/ },
  { category: 'fruits', pattern: /\b(grape|melon|watermelon|orange|tangerine|lemon|lime|banana|pineapple|mango|apple|pear|peach|cherry|strawberry|blueberry|kiwi|tomato|olive|coconut)\b/ },
  { category: 'vegetables', pattern: /\b(avocado|eggplant|potato|carrot|corn|pepper|cucumber|lettuce|kale|spinach|broccoli|garlic|onion|ginger|mushroom|radish|turnip|beet)\b/ },
  { category: 'dairy', pattern: /\b(milk|cheese|butter|ice cream|gelato|yogurt|yoghurt|kefir)\b/ },
  { category: 'nuts', pattern: /\b(peanut|almond|cashew|pistachio|hazelnut|walnut|pecan|chestnut|nuts)\b/ },
  { category: 'legumes', pattern: /\b(bean|beans|lentil|lentils|chickpea|chickpeas|soy|tofu|edamame)\b/ },
  { category: 'grains', pattern: /\b(rice|bread|croissant|baguette|flatbread|pretzel|bagel|pancake|waffle|pasta|spaghetti|noodle|ramen|cereal|oatmeal|porridge)\b/ },
  { category: 'protein', pattern: /\b(chicken|beef|steak|pork|fish|salmon|tuna|shrimp|prawn|egg|eggs|bacon|meat)\b/ },
  { category: 'snacks', pattern: /\b(burger|pizza|hot dog|sandwich|taco|burrito|salad|popcorn|chips|fries|cookie|donut|cake|cupcake|pie|chocolate|candy)\b/ },
];

const normalizeCategoryKey = (value = '') => {
  const normalized = normalizeEmojiText(value);
  return CATEGORY_KEYS.has(normalized) ? normalized : 'other';
};

const getFoodDisplayMeta = (food) => {
  const baseCategory = normalizeCategoryKey(food?.category || 'other');
  const text = normalizeEmojiText([
    food?.name,
    food?.serving,
  ].filter(Boolean).join(' '));

  if (!text) {
    return {
      emoji: EMOJI_BY_CATEGORY[baseCategory] || EMOJI_BY_CATEGORY.other,
      category: baseCategory,
    };
  }

  const matched = FOOD_DRINK_EMOJI_RULES.find((rule) => rule.pattern.test(text));
  if (matched) {
    return {
      emoji: matched.emoji,
      category: CATEGORY_KEYS.has(matched.category) ? matched.category : baseCategory,
    };
  }

  const inferredCategory = CATEGORY_INFERENCE_RULES.find((rule) => rule.pattern.test(text))?.category;
  const finalCategory = inferredCategory || baseCategory;

  return {
    emoji: EMOJI_BY_CATEGORY[finalCategory] || EMOJI_BY_CATEGORY.other,
    category: finalCategory,
  };
};

const MacroBar = ({ protein, carbs, fat, calories }) => {
  if (!calories) return null;
  const pP = Math.round((protein * 4 / calories) * 100);
  const pC = Math.round((carbs * 4 / calories) * 100);
  const pF = Math.round((fat * 9 / calories) * 100);
  return (
    <div className="mt-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-blue-400 rounded-full" style={{ width: `${pP}%` }} title={`Protein ${pP}%`} />
        <div className="bg-amber-400 rounded-full" style={{ width: `${pC}%` }} title={`Carbs ${pC}%`} />
        <div className="bg-green-400 rounded-full" style={{ width: `${pF}%` }} title={`Fat ${pF}%`} />
      </div>
      <div className="flex gap-3 mt-1 text-xs text-sage-400">
        <span className="text-blue-500">Protein {pP}%</span>
        <span className="text-amber-500">Carbs {pC}%</span>
        <span className="text-green-500">Fat {pF}%</span>
      </div>
    </div>
  );
};

const FoodCard = ({ food, onSelect, isSelected }) => {
  const display = getFoodDisplayMeta(food);

  return (
    <button
      onClick={() => onSelect(food)}
      className={`card text-left transition-all duration-200 hover:shadow-md w-full ${
        isSelected ? 'ring-2 ring-sage-500 border-sage-300' : 'hover:border-sage-300'
      }`}
    >
      <div className="flex gap-3">
        {/* Food emoji */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-sage-50 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-2xl">{display.emoji}</span>
        </div>

        {/* Food details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sage-900 dark:text-white text-sm leading-tight line-clamp-2">{food.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[display.category] || CATEGORY_COLORS.other}`}>
              {CATEGORY_LABELS[display.category] || CATEGORY_LABELS.other}
            </span>
          </div>

          <p className="text-xs text-sage-400 mb-1.5">{food.serving}</p>

          <div className="flex gap-3 text-xs font-medium">
            <span className="text-orange-600">{food.calories} kcal</span>
            <span className="text-blue-600">P {food.protein}g</span>
            <span className="text-amber-600">C {food.carbs}g</span>
            <span className="text-green-600">F {food.fat}g</span>
          </div>

          <MacroBar protein={food.protein} carbs={food.carbs} fat={food.fat} calories={food.calories} />
        </div>
      </div>

      {/* Source badge */}
      <div className="mt-2 flex justify-end">
        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_BADGE[food.source]?.color || 'bg-sage-100 text-sage-500'}`}>
          {SOURCE_BADGE[food.source]?.label || food.source}
        </span>
      </div>
    </button>
  );
};

const FoodDetail = ({ food, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const display = getFoodDisplayMeta(food);

  const loadDetailedInfo = async () => {
    setLoadingInfo(true);
    try {
      const { data } = await api.get(`/food/info?name=${encodeURIComponent(food.name)}`);
      setInfo(data.info);
    } catch {
      // silently fail
    } finally {
      setLoadingInfo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-sage-100 dark:border-gray-800 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white truncate pr-2">{food.name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sage-100 dark:bg-gray-700 flex items-center justify-center text-sage-600 dark:text-gray-400 hover:bg-sage-200 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Food emoji header */}
          <div className="w-16 h-16 rounded-2xl bg-sage-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
            <span className="text-4xl">{display.emoji}</span>
          </div>

          {/* Main macros */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Calories', value: food.calories, unit: 'Calories', color: 'text-orange-600' },
              { label: 'Protein', value: food.protein, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbs', value: food.carbs, unit: 'g', color: 'text-amber-600' },
              { label: 'Fat', value: food.fat, unit: 'g', color: 'text-green-600' },
            ].map((m) => (
              <div key={m.label} className="bg-sage-50 dark:bg-gray-800 rounded-xl p-2">
                <p className={`text-lg font-display font-semibold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-sage-400">{m.unit}</p>
                <p className="text-xs text-sage-600 dark:text-gray-400 font-medium">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Extra macros */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {food.fiber > 0 && (
              <div className="flex justify-between bg-sage-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-sage-500 dark:text-gray-500">Fiber</span>
                <span className="font-medium text-sage-800 dark:text-gray-200">{food.fiber}g</span>
              </div>
            )}
            {food.sugar > 0 && (
              <div className="flex justify-between bg-sage-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-sage-500 dark:text-gray-500">Sugar</span>
                <span className="font-medium text-sage-800 dark:text-gray-200">{food.sugar}g</span>
              </div>
            )}
          </div>

          {/* Macro bar */}
          <div>
            <p className="text-xs text-sage-500 dark:text-gray-500 mb-1 font-medium">Macro Breakdown</p>
            <MacroBar protein={food.protein} carbs={food.carbs} fat={food.fat} calories={food.calories} />
          </div>

          {/* Citation links for AI web-sourced items */}
          {Array.isArray(food.references) && food.references.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-sage-500 dark:text-gray-500 uppercase tracking-wide mb-2">Sources</p>
              <div className="space-y-1">
                {food.references.slice(0, 3).map((ref, i) => (
                  <a
                    key={`${ref.url}_${i}`}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline block truncate"
                    title={ref.url}
                  >
                    {ref.name || ref.domain || 'Reference source'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Load detailed AI info button */}
          {!info && (
            <button
              onClick={loadDetailedInfo}
              disabled={loadingInfo}
              className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
            >
              {loadingInfo ? (
                <>
                  <div className="w-4 h-4 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
                  Loading details...
                </>
              ) : (
                '🤖 Get AI Health Insights'
              )}
            </button>
          )}

          {/* Detailed AI info */}
          {info && (
            <div className="space-y-3 animate-fadeIn">
              {info.healthBenefits?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 dark:text-gray-500 uppercase tracking-wide mb-2">Health Benefits</p>
                  <ul className="space-y-1">
                    {info.healthBenefits.map((b, i) => (
                      <li key={i} className="text-sm text-sage-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-sage-400 mt-0.5">✓</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {info.vitamins?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-500 dark:text-gray-500 uppercase tracking-wide mb-2">Vitamins & Minerals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(info.vitamins || []), ...(info.minerals || [])].map((v, i) => (
                      <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {info.tips && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tip</p>
                  <p className="text-sm text-amber-800">{info.tips}</p>
                </div>
              )}
            </div>
          )}

          {/* Serving info */}
          <p className="text-xs text-center text-sage-400">Per {food.serving}</p>
        </div>
      </div>
    </div>
  );
};

export default function FoodSearch() {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [usedQueries, setUsedQueries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setFoods([]);
    setSource('');
    setUsedQueries([]);

    try {
      const { data } = await api.get(`/food/search?q=${encodeURIComponent(trimmed)}&limit=20`);
      const results = data.foods || [];
      setFoods(results);
      setSource(data.source || '');
      setUsedQueries(data.usedQueries || []);
      if (!results.length) {
        setError('No foods found from Open Food Facts or AI web-cited search. Try another food name or brand.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Search failed';
      setError(`Search failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    await runSearch(query);
  };

  const popularSearches = [
    'chicken breast', 'brown rice', 'banana', 'broccoli',
    'salmon', 'oatmeal', 'eggs', 'avocado', 'sweet potato', 'Greek yogurt',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="section-title">Food Search</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">
          Open Food Facts first, then AI web-cited fallback for missing foods.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3 animate-fadeIn">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field flex-1 text-base"
          placeholder="Search any food... e.g. chicken, rice, Lucky Me noodles"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary flex-shrink-0 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : '🔍'}
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* Source indicator */}
      {source && (
        <div className="flex items-center gap-2 text-xs text-sage-500 dark:text-gray-500 animate-fadeIn">
          <span>Results from:</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[source]?.color || 'bg-sage-100 text-sage-500'}`}>
            {SOURCE_BADGE[source]?.label || source}
          </span>
          <span className="text-sage-400">· {foods.length} results</span>
          {usedQueries.length > 1 && (
            <span className="text-sage-400 hidden md:inline">· terms: {usedQueries.join(', ')}</span>
          )}
        </div>
      )}

      {/* Popular searches (shown before first search) */}
      {!hasSearched && (
        <div className="animate-fadeIn">
          <p className="text-sm font-medium text-sage-600 dark:text-gray-400 mb-3">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  setHasSearched(true);
                  runSearch(term);
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-sage-200 text-sage-600 text-sm rounded-full hover:border-sage-400 hover:text-sage-800 dark:text-gray-100 transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state — shows a random GIF while searching */}
      {loading && (
        <div className="card text-center py-8 animate-fadeIn">
          <img
            src={getRandomGif()}
            alt="Searching..."
            className="w-40 h-40 object-cover rounded-2xl mx-auto mb-4 shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <p className="font-medium text-sage-800 dark:text-gray-200">Searching foods...</p>
          <p className="text-sm text-sage-400 mt-1">Checking Open Food Facts + AI web-cited sources</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fadeIn">
          {error}
        </div>
      )}

      {/* Results grid */}
      {!loading && foods.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {foods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              onSelect={setSelected}
              isSelected={selected?.id === food.id}
            />
          ))}
        </div>
      )}

      {/* Food detail modal */}
      {selected && (
        <FoodDetail food={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
