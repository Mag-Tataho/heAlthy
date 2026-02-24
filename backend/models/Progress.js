const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    weight: { type: Number, min: 0 },
    calories: { type: Number, min: 0 },
    water: { type: Number, min: 0 }, // glasses
    protein: { type: Number, min: 0 }, // grams
    carbs: { type: Number, min: 0 }, // grams
    fat: { type: Number, min: 0 }, // grams
    workout: {
      type: { type: String },
      duration: { type: Number, min: 0 }, // minutes
      caloriesBurned: { type: Number, min: 0 },
    },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Progress', progressSchema);
