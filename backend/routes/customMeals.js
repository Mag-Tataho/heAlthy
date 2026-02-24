const express = require('express');
const CustomMeal = require('../models/CustomMeal');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/custom-meals/public  ← MUST be before /:id
router.get('/public', auth, async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const filter = { isPublic: true };
    if (q) filter.name = { $regex: q, $options: 'i' };
    const meals = await CustomMeal.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ meals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public meals' });
  }
});

// GET /api/custom-meals
router.get('/', auth, async (req, res) => {
  try {
    const meals = await CustomMeal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ meals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch custom meals' });
  }
});

// POST /api/custom-meals
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, calories, protein, carbs, fat, fiber, serving, ingredients, category, mealTime, isPublic } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Meal name is required' });

    const meal = await CustomMeal.create({
      user: req.user._id,
      name: name.trim(), description, calories, protein, carbs, fat, fiber,
      serving: serving || '1 serving',
      ingredients: ingredients || [],
      category: category || 'other',
      mealTime: mealTime || 'any',
      isPublic: isPublic || false,
    });
    res.status(201).json({ meal });
  } catch (err) {
    console.error('Create meal error:', err);
    res.status(400).json({ error: err.message || 'Failed to create meal' });
  }
});

// PUT /api/custom-meals/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const meal = await CustomMeal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json({ meal });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update meal' });
  }
});

// DELETE /api/custom-meals/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await CustomMeal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json({ message: 'Meal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

module.exports = router;
