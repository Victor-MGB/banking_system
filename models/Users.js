const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  accountId: { type: mongoose.Types.ObjectId, required: true },
  accountNumber: { type: String, required: true },
  type: { type: String, required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, required: true },
  transactions: [
    {
      transactionId: { type: mongoose.Types.ObjectId, required: true },
      date: { type: Date, required: true },
      type: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      description: { type: String, required: true },
    },
  ],
});

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: {
    type: mongoose.Types.ObjectId,
    required: true,
    default: new mongoose.Types.ObjectId(),
  },
  accountId: { type: mongoose.Types.ObjectId, required: true },
  accountNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  description: { type: String },
});

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  gender: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  accountType: { type: String, required: true },
  address: { type: String, required: true },
  postalCode: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  currency: { type: String, required: true },
  password: { type: String, required: true },
  accountPin: { type: String, required: true },
  agree: { type: Boolean, default: true, required: true },
  kycStatus: { type: String, default: "pending" },
  balance: { type: Number, default: 0 },
  accounts: [accountSchema],
  withdrawals: [withdrawalSchema],
  dateOfAccountCreation: { type: Date, default: Date.now },
  otp: { type: String },
  otpExpires: { type: Date },
  stage_1: { type: Boolean, default: false },
  stage_2: { type: Boolean, default: false },
  stage_3: { type: Boolean, default: false },
  stage_4: { type: Boolean, default: false },
  stage_5: { type: Boolean, default: false },
  stage_6: { type: Boolean, default: false },
  stage_7: { type: Boolean, default: false },
  stage_8: { type: Boolean, default: false },
  stage_9: { type: Boolean, default: false },
  stage_10: { type: Boolean, default: false },
  stage_11: { type: Boolean, default: false },
  stage_12: { type: Boolean, default: false },
  stage_13: { type: Boolean, default: false },
  stage_14: { type: Boolean, default: false },
  stage_15: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["user", "admin"], // Define possible roles
    default: "user", // Set default role as 'user'
    required: true,
  },
});

module.exports = mongoose.model("User", userSchema);