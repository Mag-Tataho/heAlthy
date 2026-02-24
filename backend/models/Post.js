const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String, trim: true, maxlength: 300 },
  replies:   [replySchema],
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['weight_update','meal_plan','custom_meal','calorie_log','workout_log','progress_update'],
    required: true,
  },
  content:    { type: String, trim: true, maxlength: 500 },
  data:       { type: mongoose.Schema.Types.Mixed },
  likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:   [commentSchema],
  visibility: { type: String, enum: ['friends','public'], default: 'friends' },
}, { timestamps: true });

postSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
