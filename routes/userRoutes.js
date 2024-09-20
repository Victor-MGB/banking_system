const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/email");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const mongoose = require("mongoose")
const nodemailer = require("nodemailer")


// Generate Account Number (example logic)
const generateAccountNumber = () => {
  // Generate a random 10-digit number (or any other length as needed)
  const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return accountNumber; // No prefix, only numbers
};


router.post("/register", cors(), async (req, res) => {
  const { fullName, email, password } = req.body; // Ensure fullName is extracted from the request

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // Create user with fullName, email, and password
    user = new User({
      fullName, // Include fullName
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes expiration
    });

    await user.save();

    // Send OTP via email
    const subject = "Your OTP Code for Central City Bank Registration";
    const html = `
      <h1>Central City Bank</h1>
      <p>Dear ${fullName},</p>
      <p>Thank you for registering with Central City Bank. Please use the following OTP code to complete your registration:</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,</p>
      <p>Central City Bank Team</p>
    `;

    await sendEmail(email, subject, '', html);

    res.status(201).json({ message: "OTP sent to email", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if OTP matches and has not expired
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP is valid - generate account number and update user
    const accountNumber = generateAccountNumber();

    user.accounts.push({
      accountId: user._id,
      accountNumber,
      type: "savings", // default type for now
      currency: "USD",
    });

    user.otp = undefined; // clear OTP after successful verification
    user.otpExpires = undefined;

    await user.save();

    // Set up Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // Your email password
      },
    });

    // Define email options
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Account Created Successfully",
      text: `Your account has been successfully created.\n\nYour new account number is: ${accountNumber}\n\nIf you did not create this account, please contact support immediately.\n`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(200).json({ message: "Account created", accountNumber });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", cors(), async (req, res) => {
  const { accountNumber, password } = req.body;

  try {
    // Find user by account number
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
    if (!user) {
      return res.status(400).json({ message: "Invalid account number or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid account number or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Return login success response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        accounts: user.accounts, // Optionally reduce data exposure here
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", cors(), async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist" });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiry on the user model
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

    await user.save(); // Save the updated user object

    // Create reset URL
    const resetUrl = `http://${req.headers.host}/reset-password/${resetToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // Your email password
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset Request",
      text: `You are receiving this because you (or someone else) have requested the reset of your account password.\n\n
      Please click on the following link, or paste this into your browser to complete the process:\n\n
      ${resetUrl}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOptions);

    // Respond with token for testing or frontend handling
    res.status(200).json({ message: "Password reset email sent successfully", token: resetToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password
router.post("/reset-password/:token", cors(), async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find user by reset token and check if the token is still valid (not expired)
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token has not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear the reset token fields after a successful reset
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save(); // Save the new password

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/users", cors(), async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.status(200).json(users); // Return users as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout user (client-side should discard token)
router.post("/logout", cors(), (req, res) => {
  // On the client side, remove the token (this endpoint doesn't need much logic on the server side)
  res.status(200).json({ message: "Logout successful" });
});


// Delete user by ID
router.delete("/users/:id", cors(), async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete user by ID
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Deposit route
router.post("/deposit", cors(), async (req, res) => {
  const { userId, accountNumber, amount, currency } = req.body;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the account by accountNumber
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Update account balance
    account.balance += amount;

    // Add a transaction
    account.transactions.push({
      transactionId: new mongoose.Types.ObjectId(),
      date: new Date(),
      type: 'credit', // Deposit is a credit
      amount,
      currency,
      description: 'Deposit',
    });

    // Synchronize user's overall balance (sum all account balances)
    user.balance = user.accounts.reduce((total, acc) => total + acc.balance, 0);

    await user.save();

    res.status(200).json({ message: "Deposit successful", balance: account.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/update-deposit", cors(), async (req, res) => {
  const { userId, accountNumber, transactionId, newAmount } = req.body;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the account by accountNumber
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Find the transaction by transactionId
    const transaction = account.transactions.find(t => t.transactionId.toString() === transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Update the transaction amount
    const oldAmount = transaction.amount;
    transaction.amount = newAmount;

    // Adjust the account balance
    account.balance = account.balance - oldAmount + newAmount;

    // Recalculate the user's total balance
    user.balance = user.accounts.reduce((totalBalance, acc) => totalBalance + acc.balance, 0);

    await user.save();

    res.status(200).json({ message: "Deposit updated successfully", newBalance: account.balance, userBalance: user.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/recent-transactions/:userId/:accountNumber", cors(), async (req, res) => {
  const { userId, accountNumber } = req.params; // Get userId and accountNumber from route params
  const { limit = 5 } = req.query; // Set a default limit from query if not provided

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the account by accountNumber
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Sort transactions by date and get the recent ones (limit the number)
    const recentTransactions = account.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date (most recent first)
      .slice(0, parseInt(limit)); // Limit the number of transactions

    res.status(200).json({ recentTransactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/withdraw", cors(), async (req, res) => {
  const { accountId, accountNumber, amount, currency } = req.body;

  try {
    // Find the user based on the account ID and account number
    const user = await User.findOne({
      "accounts.accountId": accountId,
      "accounts.accountNumber": accountNumber,
    });

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Ensure the user has sufficient balance for the withdrawal
    const account = user.accounts.find(
      acc => acc.accountId.toString() === accountId
    );
    if (account.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Create a new pending withdrawal without deducting the balance yet
    const newWithdrawal = {
      withdrawalId: new mongoose.Types.ObjectId(),
      accountId: accountId,
      accountNumber: accountNumber,
      amount: amount,
      currency: currency,
      status: "pending", // Start at pending status
      currentStage: "stage1", // Start at stage1
      stages: [
        { name: "stage1", completed: false, verified: false },
        { name: "stage2", completed: false, verified: false },
        { name: "stage3", completed: false, verified: false },
        { name: "stage4", completed: false, verified: false },
        { name: "stage5", completed: false, verified: false },
        { name: "stage6", completed: false, verified: false },
        { name: "stage7", completed: false, verified: false },
        { name: "stage8", completed: false, verified: false },
        { name: "stage9", completed: false, verified: false },
        { name: "stage10", completed: false, verified: false },
      ],
    };

    // Add the withdrawal to the user's withdrawals
    user.withdrawals.push(newWithdrawal);

    // Save the user without modifying the balance
    await user.save();

    res.status(200).json({
      message: "Withdrawal request created successfully, awaiting verification",
      withdrawal: newWithdrawal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// router.post("/verify-withdrawal-stage/:withdrawalId/:stage", cors(), async (req, res) => {
//   const { withdrawalId, stage } = req.params;

//   try {
//     // Find the withdrawal by ID
//     const user = await User.findOne({ "withdrawals.withdrawalId": withdrawalId });
//     if (!user) {
//       return res.status(404).json({ message: "Withdrawal not found" });
//     }

//     // Get the specific withdrawal
//     const withdrawal = user.withdrawals.find(w => w.withdrawalId.toString() === withdrawalId);
//     if (!withdrawal) {
//       return res.status(404).json({ message: "Withdrawal not found" });
//     }

//     // Get the current stage
//     const currentStage = withdrawal.stages.find(s => s.name === stage);
//     if (!currentStage) {
//       return res.status(400).json({ message: `Invalid stage: ${stage}` });
//     }

//     // Check if the stage is already completed and verified
//     if (currentStage.completed && currentStage.verified) {
//       return res.status(400).json({ message: `Stage ${stage} is already verified` });
//     }

//     // Mark the stage as completed and verified by admin
//     currentStage.completed = true;
//     currentStage.verified = true;

//     // Move to the next stage if possible
//     const nextStageIndex = withdrawal.stages.findIndex(s => s.name === stage) + 1;
//     if (nextStageIndex < withdrawal.stages.length) {
//       withdrawal.currentStage = withdrawal.stages[nextStageIndex].name;
//     } else {
//       withdrawal.status = "completed"; // All stages complete
//       withdrawal.currentStage = null; // No more stages
//     }

//     // Save the user
//     await user.save();

//     res.status(200).json({ message: `Stage ${stage} completed and verified`, withdrawal });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.post("/confirm-withdrawal/:withdrawalId/:stage", cors(), async (req, res) => {
  const { withdrawalId, stage } = req.params;
  const { verified } = req.body;

  try {
    // Find the user by checking the withdrawal ID in their withdrawals array
    const user = await User.findOne({ "withdrawals.withdrawalId": withdrawalId });

    if (!user) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Find the withdrawal
    const withdrawal = user.withdrawals.find(w => w.withdrawalId.toString() === withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Find the stage to update
    const stageToUpdate = withdrawal.stages.find(s => s.name === stage);

    if (!stageToUpdate) {
      return res.status(404).json({ message: "Stage not found" });
    }

    // Mark the stage as verified and completed
    stageToUpdate.verified = verified;
    stageToUpdate.completed = true;

    // Check if all stages are completed and verified
    const allStagesCompleted = withdrawal.stages.every(s => s.completed && s.verified);

    if (allStagesCompleted) {
      // Deduct the amount from the user's balance
      const account = user.accounts.find(acc => acc.accountId.toString() === withdrawal.accountId.toString());
      account.balance -= withdrawal.amount;

      // Mark withdrawal as completed
      withdrawal.status = "completed";
    } else {
      // Update the current stage to the next one (e.g., from stage1 to stage2)
      const currentStageIndex = withdrawal.stages.findIndex(s => s.name === withdrawal.currentStage);
      if (currentStageIndex < withdrawal.stages.length - 1) {
        withdrawal.currentStage = withdrawal.stages[currentStageIndex + 1].name;
      }
    }

    // Save the updated user data
    await user.save();

    res.status(200).json({
      message: allStagesCompleted ? "Withdrawal completed successfully" : `Stage ${stage} verified successfully`,
      withdrawal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// Send Notification Endpoint
router.post("/send-notification", async (req, res) => {
  const { email, message } = req.body;

  // Validate the request body
  if (!email || !message) {
    return res.status(400).json({ message: "Email and notification message are required." });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Create a new notification object
    const newNotification = {
      notificationId: new mongoose.Types.ObjectId(),
      message,
      date: new Date(),
      read: false
    };

    // Push the new notification into the user's notifications array
    user.notifications.push(newNotification);

    // Save the updated user document
    await user.save();

    return res.status(200).json({ message: "Notification sent successfully.", notification: newNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

// Get user balance by account number
router.get("/get-balance/:accountNumber", async (req, res) => {
  const { accountNumber } = req.params;

  try {
    // Find the user by account number
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the specific account with the provided account number
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Respond with the user's account balance
    res.status(200).json({ balance: account.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/generate-statement", async (req, res) => {
  const { userId, accountNumber, startDate, endDate } = req.body;

  // Validate required fields
  if (!userId || !accountNumber || !startDate || !endDate) {
    return res.status(400).json({ message: "userId, accountNumber, startDate, and endDate are required" });
  }

  try {
    // Find the user by their userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the account based on the account number provided
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Filter transactions based on the date range provided
    const start = new Date(startDate);
    const end = new Date(endDate);
    const transactions = account.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= start && transactionDate <= end;
    });

    // Generate the statement details
    const statement = {
      accountNumber: account.accountNumber,
      accountType: account.type,
      balance: account.balance,
      currency: account.currency,
      transactions: transactions,
      period: { startDate, endDate }
    };

    // Return the statement as a response
    res.status(200).json({ message: "Statement generated successfully", statement });
  } catch (error) {
    console.error("Error generating statement:", error);
    res.status(500).json({ message: "Error generating statement. Please try again later." });
  }
});


module.exports = router;