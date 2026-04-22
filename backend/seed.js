require('dotenv').config();
const { supabase, assertSupabaseConfigured } = require('./src/config/supabase');
const { createUser } = require('./src/db/users');

const seedData = async () => {
  try {
    assertSupabaseConfigured();
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }

    const seedEmails = ['free@test.com', 'premium@test.com'];
    await supabase.from('users').delete().in('email', seedEmails);

    await createUser({
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

    await createUser({
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

    console.log('Seed complete.');
    console.log('Free: free@test.com / password123');
    console.log('Premium: premium@test.com / password123');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}
