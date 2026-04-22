import React from 'react';
import { Icon } from '@iconify/react';

const createIcon = (iconName) => {
  function OpenMojiIcon({ className = 'h-5 w-5', strokeWidth: _strokeWidth, ...props }) {
    return <Icon icon={`openmoji:${iconName}`} className={className} aria-hidden="true" {...props} />;
  }

  return OpenMojiIcon;
};

export const Activity = createIcon('person-running');
export const Apple = createIcon('red-apple');
export const ArrowLeft = createIcon('back-arrow');
export const ArrowRight = createIcon('right-arrow');
export const Banana = createIcon('banana');
export const Bell = createIcon('bell');
export const Beef = createIcon('cut-of-meat');
export const Bot = createIcon('robot');
export const Carrot = createIcon('carrot');
export const ChartNoAxesColumn = createIcon('bar-chart');
export const Check = createIcon('check-mark');
export const ChevronDown = createIcon('down-arrow');
export const ChevronUp = createIcon('up-arrow');
export const Cherry = createIcon('cherries');
export const Circle = createIcon('white-circle');
export const Clock3 = createIcon('alarm-clock');
export const Coffee = createIcon('hot-beverage');
export const Cookie = createIcon('cookie');
export const Droplets = createIcon('droplet');
export const Dumbbell = createIcon('person-lifting-weights');
export const Flame = createIcon('fire');
export const Globe = createIcon('globe-showing-americas');
export const Grape = createIcon('grapes');
export const Heart = createIcon('red-heart');
export const IceCream = createIcon('ice-cream');
export const Leaf = createIcon('seedling');
export const Lightbulb = createIcon('light-bulb');
export const Locked = createIcon('locked');
export const LogOut = createIcon('right-arrow');
export const MessageCircle = createIcon('speech-balloon');
export const Milk = createIcon('glass-of-milk');
export const Monitor = createIcon('laptop');
export const Moon = createIcon('crescent-moon');
export const Newspaper = createIcon('newspaper');
export const Nut = createIcon('peanuts');
export const Palette = createIcon('artist-palette');
export const Pencil = createIcon('pencil');
export const Plus = createIcon('plus');
export const Ruler = createIcon('straight-ruler');
export const Scale = createIcon('balance-scale');
export const Search = createIcon('magnifying-glass-tilted-left');
export const Send = createIcon('right-arrow');
export const Share2 = createIcon('share');
export const ShieldOff = createIcon('shield');
export const ShoppingCart = createIcon('shopping-cart');
export const Smartphone = createIcon('mobile-phone');
export const Sparkles = createIcon('sparkles');
export const Star = createIcon('star');
export const Sun = createIcon('sun');
export const Target = createIcon('bullseye');
export const Trash2 = createIcon('wastebasket');
export const TrendingDown = createIcon('chart-decreasing');
export const TrendingUp = createIcon('chart-increasing');
export const User = createIcon('person');
export const Users = createIcon('people-hugging');
export const UtensilsCrossed = createIcon('fork-and-knife-with-plate');
export const Wheat = createIcon('bread');
export const X = createIcon('cross-mark');