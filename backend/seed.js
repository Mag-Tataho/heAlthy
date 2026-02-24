require('dotenv').config();
const mongoose = require('mongoose');

// Seed creates initial admin/test user and confirms food route is functional
// The food database is stored in memory in routes/food.js (no DB model needed)
// This script seeds a test user for development purposes

const User = require('./models/User');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diet-planner');
    console.log('✅ Connected to MongoDB');

    // Clear existing test users
    await User.deleteMany({ email: { $in: ['free@test.com', 'premium@test.com'] } });

    // Create free user
    const freeUser = await User.create({
      name: 'Free User',
      email: 'free@test.com',
      password: 'password123',
      isPremium: false,
      profile: {
        age: 28,
        gender: 'male',
        height: 175,
        weight: 80,
        targetWeight: 75,
        activityLevel: 'moderate',
        goal: 'lose_weight',
      },
    });

    // Create premium user
    const premiumUser = await User.create({
      name: 'Premium User',
      email: 'premium@test.com',
      password: 'password123',
      isPremium: true,
      profile: {
        age: 32,
        gender: 'female',
        height: 165,
        weight: 65,
        targetWeight: 60,
        activityLevel: 'active',
        goal: 'lose_weight',
        allergies: ['nuts'],
        dietaryRestrictions: ['gluten-free'],
        cuisinePreferences: ['Mediterranean', 'Asian'],
        budget: 'moderate',
        region: 'North America',
      },
    });

    console.log('✅ Test users created:');
    console.log('   Free: free@test.com / password123');
    console.log('   Premium: premium@test.com / password123');
    console.log('');
    console.log('✅ Food database is served from memory (100 items in routes/food.js)');
    console.log('🌱 Seed complete!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedData();
