import React from 'react';
import { Icon } from '@iconify/react';

const normalizeFoodText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const FOOD_ICON_RULES = [
  // ── PROTEIN & MEAT ──────────────────────────────────────────
  { icon: 'openmoji:cut-of-meat',    pattern: /\b(cut of meat|beef|steak|pork|lamb|ham|sausage|meatball)\b/ },
  { icon: 'openmoji:bacon',          pattern: /\b(bacon)\b/ },
  { icon: 'openmoji:meat-on-bone',   pattern: /\b(ribs)\b/ },
  { icon: 'openmoji:poultry-leg',    pattern: /\b(chicken|poultry|drumstick|chicken leg)\b/ },
  { icon: 'openmoji:turkey',         pattern: /\b(turkey)\b/ },
  { icon: 'openmoji:duck',           pattern: /\b(duck)\b/ },
  { icon: 'openmoji:shrimp',         pattern: /\b(shrimp|prawn|tempura)\b/ },
  { icon: 'openmoji:crab',           pattern: /\b(crab|crabs|kani)\b/ },
  { icon: 'openmoji:fish',           pattern: /\b(salmon|tuna|cod|trout|sardine|mackerel|anchovy|herring|catfish|snapper|halibut|pollock|mahi ?mahi|tilapia|fish|sushi|sashimi)\b/ },
  { icon: 'openmoji:oden',           pattern: /\b(fish cake|fishball|fish balls|kikiam|surimi|oden)\b/ },
  { icon: 'openmoji:egg',            pattern: /\b(egg|eggs|omelet|omelette|fried egg)\b/ },

  // ── GRAINS, BREAD & PASTA ───────────────────────────────────
  { icon: 'openmoji:cooked-rice',    pattern: /\b(rice|onigiri)\b/ },
  { icon: 'openmoji:curry-rice',     pattern: /\b(curry rice|curry)\b/ },
  { icon: 'openmoji:spaghetti',      pattern: /\b(spaghetti|pasta|macaroni|lasagna|fettuccine|penne|ravioli)\b/ },
  { icon: 'openmoji:steaming-bowl',  pattern: /\b(ramen|ramen noodles|noodle|noodles|udon|soba|pho|pancit|lomi|mami|vermicelli|soup|broth|stew|chowder)\b/ },
  { icon: 'openmoji:hamburger',      pattern: /\b(hamburger|cheeseburger|burger)\b/ },
  { icon: 'openmoji:pizza',          pattern: /\b(pizza)\b/ },
  { icon: 'openmoji:sandwich',       pattern: /\b(sandwich|sub|club sandwich)\b/ },
  { icon: 'openmoji:taco',           pattern: /\b(taco|tacos)\b/ },
  { icon: 'openmoji:burrito',        pattern: /\b(burrito|wrap)\b/ },
  { icon: 'openmoji:dumpling',       pattern: /\b(dumpling|dumplings|gyoza|siomai|dim sum|wonton)\b/ },
  { icon: 'openmoji:bread',          pattern: /\b(bread|toast|loaf|pandesal|bun|roll|bread roll|dinner roll|bagel)\b/ },
  { icon: 'openmoji:baguette-bread', pattern: /\b(baguette)\b/ },
  { icon: 'openmoji:croissant',      pattern: /\b(croissant)\b/ },
  { icon: 'openmoji:pretzel',        pattern: /\b(pretzel)\b/ },
  { icon: 'openmoji:flatbread',      pattern: /\b(flatbread|naan|pita|tortilla|roti)\b/ },
  { icon: 'openmoji:pancakes',       pattern: /\b(pancake|pancakes)\b/ },
  { icon: 'openmoji:waffle',         pattern: /\b(waffle|waffles)\b/ },
  { icon: 'openmoji:bowl-with-spoon',pattern: /\b(cereal|oatmeal|oats|porridge|granola|muesli)\b/ },
  { icon: 'openmoji:french-fries',   pattern: /\b(french fries|fries|chips)\b/ },
  { icon: 'openmoji:popcorn',        pattern: /\b(popcorn)\b/ },
  { icon: 'openmoji:pie',            pattern: /\b(pie|tart|pot pie)\b/ },

  // ── VEGETABLES ──────────────────────────────────────────────
  { icon: 'openmoji:potato',         pattern: /\b(potato|potatoes)\b/ },
  { icon: 'openmoji:roasted-sweet-potato', pattern: /\b(sweet potato|sweet potatoes|yam|kamote)\b/ },
  { icon: 'openmoji:tomato',         pattern: /\b(tomato)\b/ },
  { icon: 'openmoji:carrot',         pattern: /\b(carrot|carrots)\b/ },
  { icon: 'openmoji:ear-of-corn',    pattern: /\b(corn)\b/ },
  { icon: 'openmoji:broccoli',       pattern: /\b(broccoli|cauliflower)\b/ },
  { icon: 'openmoji:eggplant',       pattern: /\b(eggplant|aubergine|brinjal)\b/ },
  { icon: 'openmoji:cucumber',       pattern: /\b(cucumber|pickle|gherkin)\b/ },
  { icon: 'openmoji:bell-pepper',    pattern: /\b(bell pepper|capsicum|pepper)\b/ },
  { icon: 'openmoji:hot-pepper',     pattern: /\b(chili|chilli|jalapeno|sili|hot pepper)\b/ },
  { icon: 'openmoji:garlic',         pattern: /\b(garlic)\b/ },
  { icon: 'openmoji:onion',          pattern: /\b(onion)\b/ },
  { icon: 'openmoji:ginger-root',    pattern: /\b(ginger)\b/ },
  { icon: 'openmoji:brown-mushroom', pattern: /\b(mushroom|shiitake|portobello|brown mushroom)\b/ },
  { icon: 'openmoji:olive',          pattern: /\b(olive)\b/ },
  { icon: 'openmoji:green-salad',    pattern: /\b(green salad|salad|leafy green|lettuce|kale|spinach|greens)\b/ },
  { icon: 'openmoji:pea-pod',        pattern: /\b(pea pod|green bean|string bean|peas?)\b/ },
  { icon: 'openmoji:pumpkin',        pattern: /\b(pumpkin|squash|kalabasa)\b/ },
  { icon: 'openmoji:radish',         pattern: /\b(radish|turnip|daikon)\b/ },

  // ── FRUITS ──────────────────────────────────────────────────
  { icon: 'openmoji:red-apple',      pattern: /\b(red apple|apple)\b/ },
  { icon: 'openmoji:green-apple',    pattern: /\b(green apple)\b/ },
  { icon: 'openmoji:pear',           pattern: /\b(pear)\b/ },
  { icon: 'openmoji:peach',          pattern: /\b(peach)\b/ },
  { icon: 'openmoji:banana',         pattern: /\b(banana)\b/ },
  { icon: 'openmoji:mango',          pattern: /\b(mango)\b/ },
  { icon: 'openmoji:pineapple',      pattern: /\b(pineapple)\b/ },
  { icon: 'openmoji:watermelon',     pattern: /\b(watermelon)\b/ },
  { icon: 'openmoji:melon',          pattern: /\b(melon|cantaloupe|honeydew)\b/ },
  { icon: 'openmoji:grapes',         pattern: /\b(grape|grapes|raisin|raisins)\b/ },
  { icon: 'openmoji:strawberry',     pattern: /\b(strawberry|strawberries|berry|berries)\b/ },
  { icon: 'openmoji:cherries',       pattern: /\b(cherry|cherries)\b/ },
  { icon: 'openmoji:lemon',          pattern: /\b(lemon|lime|calamansi)\b/ },
  { icon: 'openmoji:tangerine',      pattern: /\b(orange|tangerine|mandarin|citrus)\b/ },
  { icon: 'openmoji:avocado',        pattern: /\b(avocado)\b/ },
  { icon: 'openmoji:kiwi-fruit',     pattern: /\b(kiwi)\b/ },
  { icon: 'openmoji:coconut',        pattern: /\b(coconut)\b/ },
  { icon: 'openmoji:blueberries',    pattern: /\b(blueberry|blueberries)\b/ },

  // ── DAIRY ───────────────────────────────────────────────────
  { icon: 'openmoji:glass-of-milk',  pattern: /\b(milk|yogurt|yoghurt|kefir|lassi)\b/ },
  { icon: 'openmoji:cheese-wedge',   pattern: /\b(cheese)\b/ },
  { icon: 'openmoji:butter',         pattern: /\b(butter|ghee)\b/ },

  // ── NUTS ────────────────────────────────────────────────────
  { icon: 'openmoji:chestnut',       pattern: /\b(chestnut)\b/ },
  { icon: 'openmoji:peanuts',        pattern: /\b(peanut|peanuts|almond|cashew|pistachio|hazelnut|walnut|macadamia|pecan|mixed nuts|nuts)\b/ },

  // ── SNACKS & SWEETS ─────────────────────────────────────────
  { icon: 'openmoji:cake',           pattern: /\b(cake|cakes|cheesecake|pound cake|chocolate cake|birthday cake|shortcake)\b/ },
  { icon: 'openmoji:shortcake',      pattern: /\b(cupcake|muffin)\b/ },
  { icon: 'openmoji:cookie',         pattern: /\b(cookie|cookies|biscuit)\b/ },
  { icon: 'openmoji:doughnut',       pattern: /\b(doughnut|donut)\b/ },
  { icon: 'openmoji:chocolate-bar',  pattern: /\b(chocolate|chocolate bar)\b/ },
  { icon: 'openmoji:candy',          pattern: /\b(candy|sweets|lollipop|caramel)\b/ },
  { icon: 'openmoji:honey-pot',      pattern: /\b(honey|syrup|jam|jelly|preserve)\b/ },
  { icon: 'openmoji:dango',          pattern: /\b(dango)\b/ },
  { icon: 'openmoji:ice-cream',      pattern: /\b(soft ice cream|ice cream cone|ice cream|gelato|frozen yogurt|shaved ice|halo halo|halo-halo)\b/ },
  { icon: 'openmoji:popcorn',        pattern: /\b(popcorn)\b/ },

  // ── BEVERAGES ───────────────────────────────────────────────
  { icon: 'openmoji:beverage-box',   pattern: /\b(juice|juice box|beverage box|boxed juice|nectar)\b/ },
  { icon: 'openmoji:hot-beverage',   pattern: /\b(coffee|espresso|cappuccino|latte|mocha|americano)\b/ },
  { icon: 'openmoji:teapot',         pattern: /\b(tea|matcha|green tea|black tea|oolong|chai|teapot)\b/ },
  { icon: 'openmoji:cup-with-straw', pattern: /\b(soda|cola|soft drink|lemonade|energy drink|sports drink|smoothie|shake|milkshake|boba|bubble tea|milk tea)\b/ },
  { icon: 'openmoji:glass-of-milk',  pattern: /\b(water|mineral water|sparkling water)\b/ },
  { icon: 'openmoji:wine-glass',     pattern: /\b(wine|rose wine|red wine|white wine|sake|champagne|prosecco|sparkling wine)\b/ },
  { icon: 'openmoji:cocktail-glass', pattern: /\b(cocktail|martini|mojito|margarita|pina colada|tropical drink)\b/ },
  { icon: 'openmoji:beer-mug',       pattern: /\b(beer|lager|ale|stout|clinking beer)\b/ },
  { icon: 'openmoji:tumbler-glass',  pattern: /\b(whisky|whiskey|scotch|tumbler)\b/ },

  // ── OTHER ───────────────────────────────────────────────────
  { icon: 'openmoji:pot-of-food',    pattern: /\b(fondue|paella)\b/ },
  { icon: 'openmoji:fork-and-knife', pattern: /\b(meal|food|dish|plate|cuisine)\b/ },
  { icon: 'openmoji:salt',           pattern: /\b(salt|seasoning|spice)\b/ },
  { icon: 'openmoji:hot-dog',        pattern: /\b(hot dog|hotdog|sausage dog)\b/ },
];

const FOOD_CATEGORY_ICONS = {
  protein:    'openmoji:cut-of-meat',
  grains:     'openmoji:bread',
  vegetables: 'openmoji:seedling',
  fruits:     'openmoji:red-apple',
  dairy:      'openmoji:glass-of-milk',
  nuts:       'openmoji:peanuts',
  legumes:    'openmoji:pea-pod',
  snacks:     'openmoji:cookie',
  beverages:  'openmoji:hot-beverage',
  other:      'openmoji:fork-and-knife-with-plate',
};

export default function FoodCategoryIcon({
  category = 'other',
  foodName = '',
  className = 'h-5 w-5',
  strokeWidth = 1.9,
}) {
  const normalized = normalizeFoodText(foodName);
  const specificIcon = FOOD_ICON_RULES.find(({ pattern }) => pattern.test(normalized))?.icon;
  const IconComponent = specificIcon || FOOD_CATEGORY_ICONS[category] || FOOD_CATEGORY_ICONS.other;

  if (typeof IconComponent === 'string') {
    return <Icon icon={IconComponent} className={className} aria-hidden="true" />;
  }

  return <IconComponent className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
