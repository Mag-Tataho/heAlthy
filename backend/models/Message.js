const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // For DMs: sender + recipient. For group: sender + group
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // DM only
  group:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // Group only
  text:      { type: String, required: true, trim: true, maxlength: 1000 },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
