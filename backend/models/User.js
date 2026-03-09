const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },
  isPremium: { type: Boolean, default: false },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendCount: { type: Number, default: 0 },
  profile: {
    age:          { type: Number, min: 1, max: 120 },
    gender:       { type: String, enum: ['male', 'female', 'other'] },
    height:       { type: Number },
    weight:       { type: Number },
    targetWeight: { type: Number },
    activityLevel:{ type: String, enum: ['sedentary','light','moderate','active','very_active'], default: 'moderate' },
    goal:         { type: String, enum: ['lose_weight','maintain','gain_muscle','improve_health'], default: 'maintain' },
    // Budget fields
    budgetAmount: { type: Number },
    budgetPeriod: { type: String, enum: ['day','week','month'], default: 'week' },
    currency:     { type: String, enum: ['PHP','USD'], default: 'PHP' },
    // Premium fields
    allergies:            [{ type: String }],
    dietaryRestrictions:  [{ type: String }],
    cuisinePreferences:   [{ type: String }],
    budget:               { type: String, enum: ['budget','moderate','premium'], default: 'moderate' },
    region:               { type: String },
    fitnessActivities:    [{ type: String }],
  },
  reminders: {
    waterReminder:    { type: Boolean, default: false },
    mealReminders:    { type: Boolean, default: false },
    workoutReminders: { type: Boolean, default: false },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
