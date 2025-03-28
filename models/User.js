// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Drone', 'Worker', 'Queen'],
    default: 'Drone'
  },
  trialExpires: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day trial
  },
  referralsCount: {
    type: Number,
    default: 0
  },
  referralCode: String,
  referredBy: String
});

module.exports = mongoose.model('User', UserSchema);
