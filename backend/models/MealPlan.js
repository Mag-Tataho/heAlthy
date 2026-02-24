const mongoose = require('mongoose');

const mealPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['basic', 'personalized'], default: 'basic' },
    duration: { type: String, enum: ['1day', 'weekly', 'monthly'], default: '1day' },
    plan: { type: mongoose.Schema.Types.Mixed }, // Flexible AI-generated JSON
    groceryList: [{ type: String }],
    totalCalories: { type: Number },
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true }
);

mealPlanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
