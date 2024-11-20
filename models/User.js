const mongoose = require("mongoose");
const { Schema } = mongoose;
const stageSchema = require("./StageModels"); // Import the stageSchema

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
const withdrawalSchema = new Schema({
  stages: [stageSchema], // Embedding stageSchema
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
  accounts: [accountSchema], // Embedding accountSchema
  withdrawals: [withdrawalSchema], // Embedding withdrawalSchema
  loans: [loanSchema], // Embedding loanSchema
  loanRepayments: [loanRepaymentSchema], // Embedding loanRepaymentSchema
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
  stages: [stageSchema], // Embedding stageSchema
  dateOfAccountCreation: { type: Date, default: Date.now },
  resetPasswordToken: { type: String }, // Token for password reset
  resetPasswordExpires: { type: Date }, // Expiry date for the token
  otp: { type: String },
  otpExpires: { type: Date }
});

module.exports = mongoose.model("User", userSchema);
