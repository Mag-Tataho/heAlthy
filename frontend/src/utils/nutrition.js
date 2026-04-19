// Mifflin-St Jeor formula for BMR
export const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
};

// TDEE based on activity level
export const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr) return null;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
};

// Daily calorie target based on goal
export const calculateDailyCalories = (tdee, goal) => {
  if (!tdee) return null;
  const adjustments = {
    lose_weight: -500,
    maintain: 0,
    gain_muscle: 300,
    improve_health: -200,
  };
  return tdee + (adjustments[goal] || 0);
};

// BMI calculation
export const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  const heightM = height / 100;
  return (weight / (heightM * heightM)).toFixed(1);
};

export const getBMICategory = (bmi) => {
  if (!bmi) return null;
  const b = parseFloat(bmi);
  if (b < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
  if (b < 25) return { label: 'Healthy', color: 'text-sage-600' };
  if (b < 30) return { label: 'Overweight', color: 'text-amber-500' };
  return { label: 'Obese', color: 'text-red-500' };
};

// Format goal label
export const formatGoal = (goal) => {
  const labels = {
    lose_weight: 'Lose Weight',
    maintain: 'Maintain Weight',
    gain_muscle: 'Gain Muscle',
    improve_health: 'Improve Health',
  };
  return labels[goal] || goal;
};

export const formatActivityLevel = (level) => {
  const labels = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Very Active',
    very_active: 'Extremely Active',
  };
  return labels[level] || level;
};

// Macro breakdown by goal (% of calories)
export const getMacroTargets = (dailyCalories, goal) => {
  if (!dailyCalories) return null;
  const macros = {
    lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
    maintain: { protein: 0.25, carbs: 0.50, fat: 0.25 },
    gain_muscle: { protein: 0.30, carbs: 0.45, fat: 0.25 },
    improve_health: { protein: 0.25, carbs: 0.50, fat: 0.25 },
  };
  const m = macros[goal] || macros.maintain;
  return {
    protein: Math.round((dailyCalories * m.protein) / 4), // 4 cal/g
    carbs: Math.round((dailyCalories * m.carbs) / 4),
    fat: Math.round((dailyCalories * m.fat) / 9), // 9 cal/g
  };
};
