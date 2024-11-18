const mongoose = require("mongoose");
const { Schema } = mongoose;

// Stage Schema
const stageSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Account Schema
const accountSchema = new Schema({
  accountId: { type: mongoose.Types.ObjectId, required: true },
  accountNumber: { type: String, required: true },
  type: { type: String, required: true }, // E.g., 'savings', 'current'
  balance: { type: Number, default: 0 },
  currency: { type: String, required: true }, // E.g., 'USD', 'EUR'
  transactions: [
    {
      _id: false, // Disable MongoDB's auto _id in subdocuments
      transactionId: { type: mongoose.Types.ObjectId, required: true },
      date: { type: Date, required: true },
      type: { type: String, required: true }, // E.g., 'credit', 'debit'
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      description: { type: String, required: true },
    },
  ],
});

// Withdrawal Schema
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

  // Stages for withdrawal process
  stages: [
    {
      stageNumber: { type: Number, required: true }, // 1, 2, 3...
      stageName: { type: String, required: true }, // E.g., "Document Verification", "Account Balance Check"
      verified: { type: Boolean, default: false },
      verifiedByAdmin: { type: mongoose.Types.ObjectId, ref: "Admin" }, // Admin who verified
      verifiedAt: { type: Date },
      remarks: { type: String }, // Admin remarks or feedback
    },
  ],
});

// Loan Schema
const loanSchema = new Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
  loanAmount: { type: Number, required: true },
  currency: { type: String, required: true }, // E.g., 'USD'
  interestRate: { type: Number, required: true }, // Interest rate in percentage
  termLength: { type: Number, required: true }, // E.g., 12 months
  status: {
    type: String,
    enum: ["pending", "active", "repaid", "defaulted"],
    default: "pending",
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  repayments: [{ type: Schema.Types.ObjectId, ref: "LoanRepayment" }],
});

// Loan Repayment Schema
const loanRepaymentSchema = new Schema({
  repaymentId: {
    type: Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  loanId: { type: Schema.Types.ObjectId, required: true },
  accountId: { type: Schema.Types.ObjectId, required: true },
  repaymentAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
});

// User Schema
const userSchema = new Schema({
  fullName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  agree: { type: Boolean, default: true, required: true },
  kycStatus: { type: String, default: "pending" },
  accounts: [accountSchema],
  withdrawals: [withdrawalSchema],
  loans: [loanSchema],
  loanRepayments: [loanRepaymentSchema],
  notifications: [
    {
      _id: false,
      notificationId: {
        type: mongoose.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      message: { type: String, required: true },
      date: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
    },
  ],
  stages: [stageSchema], // Add the stageSchema here
  dateOfAccountCreation: { type: Date, default: Date.now },
  resetPasswordToken: { type: String }, // Token for password reset
  resetPasswordExpires: { type: Date }, // Expiry date for the token
  otp: { type: String },
  otpExpires: { type: Date },

  stage_1_verified: { type: Boolean, default: false },
  stage_2_verified: { type: Boolean, default: false },
  stage_3_verified: { type: Boolean, default: false },
  stage_4_verified: { type: Boolean, default: false },
  stage_5_verified: { type: Boolean, default: false },
  stage_6_verified: { type: Boolean, default: false },
  stage_7_verified: { type: Boolean, default: false },
  stage_8_verified: { type: Boolean, default: false },
  stage_9_verified: { type: Boolean, default: false },
  stage_10_verified: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
