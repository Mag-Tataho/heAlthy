const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceId: { type: String, required: true, unique: true, trim: true, index: true },
    paymentId: { type: String, trim: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);