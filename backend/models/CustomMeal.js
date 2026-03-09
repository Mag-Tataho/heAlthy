const mongoose = require('mongoose');

const customMealSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  calories: { type: Number, min: 0 },
  protein: { type: Number, min: 0 },
  carbs: { type: Number, min: 0 },
  fat: { type: Number, min: 0 },
  fiber: { type: Number, min: 0 },
  serving: { type: String, default: '1 serving' },
  ingredients: [{ type: String }],
  category: {
    type: String,
    enum: ['breakfast','lunch','dinner','snack','beverage','other'],
    default: 'other',
  },
  mealTime: {
    type: String,
    enum: ['breakfast','morning_snack','lunch','afternoon_snack','dinner','any'],
    default: 'any',
  },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

customMealSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CustomMeal', customMealSchema);
