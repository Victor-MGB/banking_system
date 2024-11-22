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
const subject = "Your One-Time Password (OTP) for Sheritage Bank Registration";
const html = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          background-color: #4CAF50;
          color: white;
          padding: 20px 0;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 36px;
        }
        .content {
          padding: 20px;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #4CAF50;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-top: 30px;
        }
        .footer a {
          color: #4CAF50;
          text-decoration: none;
        }
        .note {
          color: #666;
        }
        .cta {
          background-color: #4CAF50;
          color: white;
          padding: 12px 25px;
          font-size: 16px;
          border-radius: 5px;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        }
        .cta:hover {
          background-color: #45a049;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Shertage Bank</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${fullName}</strong>,</p>
          <p>Thank you for choosing Sheritage Bank! To complete your registration, please use the following One-Time Password (OTP):</p>
          <div class="otp">${otp}</div>
          <p class="note"><strong>Note:</strong> This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you did not request this code, please ignore this email or contact our support team immediately.</p>
          <p>We are excited to have you onboard and look forward to serving you.</p>
          <a href="https://sheritage.netlify.app/" class="cta">Complete Your Registration</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Sheritage Bank. All rights reserved.</p>
          <p>For support, contact us at <a href="mailto:sheritage144@gmail.com">sheritage144@gmail.com</a>.</p>
        </div>
      </div>
    </body>
  </html>
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
      subject: "🎉 Welcome to Sheritage! Account Created Successfully",
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                color: #333;
                padding: 20px;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                padding: 30px;
                text-align: center;
              }
              .email-header {
                background-color: #4CAF50;
                color: white;
                padding: 10px;
                border-radius: 8px 8px 0 0;
                font-size: 24px;
              }
              .email-body {
                text-align: left;
                margin-top: 20px;
                font-size: 16px;
              }
              .email-body p {
                line-height: 1.6;
              }
              .account-details {
                background-color: #f4f4f4;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
                font-weight: bold;
              }
              .email-footer {
                margin-top: 30px;
                font-size: 14px;
                color: #555;
              }
              .email-footer a {
                color: #4CAF50;
                text-decoration: none;
              }
              .button {
                display: inline-block;
                padding: 12px 25px;
                background-color: #4CAF50;
                color: white;
                font-size: 16px;
                border-radius: 5px;
                text-decoration: none;
                margin-top: 20px;
              }
              .button:hover {
                background-color: #45a049;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                🎉 Welcome to Sheritage!
              </div>
              <div class="email-body">
                <p>Dear ${user.firstName || "Valued User"},</p>
                <p>Congratulations! Your account with Sheritage has been created successfully. We're thrilled to have you on board!</p>
                <p>Here are your account details:</p>
                <div class="account-details">
                  <p><strong>Account Number:</strong> ${accountNumber}</p>
                </div>
                <p>Please keep this information secure. You'll need it to log in and access your account.</p>
                <p>If you did not create this account or have any concerns, kindly contact our support team immediately at <a href="mailto:sheritage144@gmail.com">sheritage144@gmail.com</a>.</p>
                <a href="https://sheritage.netlify.app/login" class="button">Go to Login</a>
              </div>
              <div class="email-footer">
                <p>Best regards,</p>
                <p>The Sheritage Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
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
      return res.status(400).json({ success: false, message: "Invalid account number or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid account number or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Extract important fields for the response
    const { fullName, email, kycStatus, accounts, stage_1_verified, stage_2_verified, stage_3_verified, stage_4_verified, stage_5_verified, stage_6_verified, stage_7_verified, stage_8_verified, stage_9_verified, stage_10_verified, notifications, dateOfAccountCreation } = user;

    // Return login success response with important fields and success: true
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        fullName,
        email,
        kycStatus,
        verificationStages: {
          stage_1_verified,
          stage_2_verified,
          stage_3_verified,
          stage_4_verified,
          stage_5_verified,
          stage_6_verified,
          stage_7_verified,
          stage_8_verified,
          stage_9_verified,
          stage_10_verified
        },
        accounts: accounts.map(account => ({
          accountNumber: account.accountNumber,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
        })),
        notifications,
        dateOfAccountCreation
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
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

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: "No authorization token provided." });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Token is missing." });
  }

  // Continue with token verification...
  next();
};

// Get total deposit balance for the authenticated user's account
router.get("/deposits", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Get the user ID from the request

    // Find the user based on the user ID
    const user = await User.findById(userId); // Assuming the user is stored by ID

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize total deposit balance
    let totalDepositBalance = 0;

    // Loop through each account to calculate the total deposit balance
    user.accounts.forEach(account => {
      // Filter the transactions to get only deposits (credit transactions)
      const deposits = account.transactions.filter(transaction => transaction.type === 'credit');

      // Calculate the total deposit balance by summing up the amounts
      totalDepositBalance += deposits.reduce((total, transaction) => total + transaction.amount, 0);
    });

    // Return the total deposit balance
    res.status(200).json({
      message: "Total deposit balance retrieved successfully",
      totalDepositBalance: totalDepositBalance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});



// Deposit route
router.post("/deposit", cors(), async (req, res) => {
  const { accountNumber, amount, currency } = req.body;

  try {
    // Find the account by accountNumber
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });

    if (!user) {
      return res.status(404).json({ message: "User or account not found" });
    }

    // Find the specific account
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
  const { accountNumber, newAmount } = req.body;

  try {
    // Find the user by their accounts' account numbers
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Find the account by accountNumber
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Adjust the account balance by adding the new amount to the current balance
    account.balance += newAmount;

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

router.post('/withdrawal', async (req, res) => {
  const { accountNumber, password, amount, currency, description } = req.body;

  try {
    // Find user by account number
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Find the user's account by account number
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(400).json({ message: 'Account not found' });
    }

    // Check if the account has enough balance
    if (account.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Prepare the withdrawal object
    const withdrawal = {
      accountId: account._id,
      accountNumber,
      amount,
      currency,
      description,
      status: 'pending', // Set the initial status of the withdrawal to 'pending'
    };

    // Add the withdrawal request and reset verification stages
    user.withdrawals.push(withdrawal);
    user.stage_1_verified = false;
    user.stage_2_verified = false;
    user.stage_3_verified = false;
    user.stage_4_verified = false;
    user.stage_5_verified = false;
    user.stage_6_verified = false;
    user.stage_7_verified = false;
    user.stage_8_verified = false;
    user.stage_9_verified = false;
    user.stage_10_verified = false
    // Initialize all stages to false (ensure they exist in the schema)

    // Save the updated user document
    await user.save();

    // Return the withdrawal response with all verification stages set to false
    return res.status(200).json({
      message: 'Withdrawal initiated successfully',
      accountNumber: account.accountNumber,
      fullName: user.fullName,
      withdrawalStatus: withdrawal.status,
      stages: {
        stage_1_verified: user.stage_1_verified,
        stage_2_verified: user.stage_2_verified,
        stage_3_verified: user.stage_3_verified,
        stage_4_verified: user.stage_4_verified,
        stage_5_verified: user.stage_5_verified,
        stage_6_verified: user.stage_6_verified,
        stage_7_verified: user.stage_7_verified,
        stage_8_verified: user.stage_8_verified,
        stage_9_verified: user.stage_9_verified,
        stage_10_verified: user.stage_10_verified,
      },
    });
  } catch (error) {
    console.error('Server error during withdrawal:', error);

    // Always return JSON even in case of server errors
    return res.status(500).json({ message: 'Server error' });
  }
});




router.post('/withdrawal/verify-stage-1', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Perform stage 1 verification logic (e.g., OTP verification)
    user.stage_1_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 1 verification completed',
      stage_1_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 1 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-2', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 1 is verified before allowing stage 2
    if (!user.stage_1_verified) {
      return res.status(400).json({ message: 'Stage 1 verification incomplete' });
    }

    // Perform stage 2 verification logic (e.g., additional checks)
    user.stage_2_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 2 verification completed',
      stage_2_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 2 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-3', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 2 is verified before allowing stage 3
    if (!user.stage_2_verified) {
      return res.status(400).json({ message: 'Stage 2 verification incomplete' });
    }

    // Perform stage 3 verification logic (e.g., compliance checks)
    user.stage_3_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 3 verification completed',
      stage_3_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 3 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-4', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 3 is verified before allowing stage 4
    if (!user.stage_3_verified) {
      return res.status(400).json({ message: 'Stage 3 verification incomplete' });
    }

    // Perform stage 4 verification logic (e.g., financial review)
    user.stage_4_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 4 verification completed',
      stage_4_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 4 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-5', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 4 is verified
    if (!user.stage_4_verified) {
      return res.status(400).json({ message: 'Stage 4 verification incomplete' });
    }

    // Perform stage 5 verification logic
    user.stage_5_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 5 verification completed',
      stage_5_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 5 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-6', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 5 is verified
    if (!user.stage_5_verified) {
      return res.status(400).json({ message: 'Stage 5 verification incomplete' });
    }

    // Perform stage 6 verification logic
    user.stage_6_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 6 verification completed',
      stage_6_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 6 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-7', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 6 is verified
    if (!user.stage_6_verified) {
      return res.status(400).json({ message: 'Stage 6 verification incomplete' });
    }

    // Perform stage 7 verification logic
    user.stage_7_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 7 verification completed',
      stage_7_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 7 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-8', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 7 is verified
    if (!user.stage_7_verified) {
      return res.status(400).json({ message: 'Stage 7 verification incomplete' });
    }

    // Perform stage 8 verification logic
    user.stage_8_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 8 verification completed',
      stage_8_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 8 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-9', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 8 is verified
    if (!user.stage_8_verified) {
      return res.status(400).json({ message: 'Stage 8 verification incomplete' });
    }

    // Perform stage 9 verification logic
    user.stage_9_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 9 verification completed',
      stage_9_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 9 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-10', async (req, res) => {
  const { accountNumber } = req.body;

  try {
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if stage 9 is verified
    if (!user.stage_9_verified) {
      return res.status(400).json({ message: 'Stage 9 verification incomplete' });
    }

    // Perform stage 10 verification logic (final stage)
    user.stage_10_verified = true;
    await user.save();

    return res.status(200).json({
      message: 'Stage 10 verification completed. All stages verified successfully.',
      stage_10_verified: true,
    });
  } catch (error) {
    console.error('Error during Stage 10 verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdrawal/verify-stage-:stageId', async (req, res) => {
  const { accountNumber } = req.body; // Extract account number from the request
  const stageId = req.params.stageId; // Get the stage ID from the URL

  try {
      // Find the user by account number
      const user = await User.findOne({ 'accounts.accountNumber': accountNumber });

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Verify the corresponding stage
      switch (stageId) {
          case '1':
              user.stage_1_verified = true;
              break;
          case '2':
              user.stage_2_verified = true;
              break;
          case '3':
              user.stage_3_verified = true;
              break;
              case '4':
                user.stage_4_verified = true;
                break;
                case '5':
              user.stage_5_verified = true;
              break;
              case '6':
              user.stage_6_verified = true;
              break;
              case '7':
              user.stage_7_verified = true;
              break;
              case '8':
              user.stage_8_verified = true;
              break;
              case '9':
              user.stage_9_verified = true;
              break;
              case '10':
              user.stage_10_verified = true;
              break;
          // Add cases for stages 4 through 10 as needed
          default:
              return res.status(400).json({ message: 'Invalid stage ID' });
      }

      await user.save(); // Save the changes to the database

      res.json({ message: `Stage ${stageId} verified successfully` });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for admin to verify the user's stage
router.post("/admin/verify-stage", async (req, res) => {
  const { accountNumber, stageNumber } = req.body; // Expect accountNumber and stageNumber

  try {
    // Find the user by their account number
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the verification field for the stage
    const updateField = {};
    updateField[`stage_${stageNumber}_verified`] = true;

    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: updateField }, { new: true });
    res.status(200).json({ message: `Stage ${stageNumber} verified successfully`, user: updatedUser });
  } catch (error) {
    console.error("Error verifying stage:", error);
    res.status(500).json({ message: "Server error" });
  }
});


async function updateStage(req, res) {
  const { userId, stageNumber } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the current stage and requested stageNumber
    console.log(`Current stage: ${user.currentStage}, Requested new stage: ${stageNumber}`);

    // Update the user's stage only if it's valid
    if (stageNumber > user.currentStage) {
      user.currentStage = stageNumber;
      await user.save();
      return res.status(200).json({ message: 'Stage updated successfully', currentStage: user.currentStage });
    } else {
      return res.status(400).json({ 
        message: `Invalid stage progression. Current stage is ${user.currentStage}, but received ${stageNumber}.` 
      });
    }
  } catch (error) {
    console.error('Server error during stage update:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Route to handle stage updates
router.post("/update-stage", cors(), async (req, res) => {
  const { userId, stageNumber } = req.body; // Expect both userId and stageNumber in the request body

  // Basic validation for stageNumber
  if (!userId || typeof stageNumber !== 'number') {
    return res.status(400).json({ message: "User ID and stage number are required" });
  }

  // Validate stageNumber is a valid number
  if (stageNumber < 1 || stageNumber > 9) {
    return res.status(400).json({ message: "Invalid stage number" });
  }

  // Call the updateStage function
  await updateStage(req, res);
});


router.get("/users/:userId", cors(), async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

// GET endpoint to fetch account details and balance
router.get('/account/:accountNumber', cors(), async (req, res) => {
  try {
    const { accountNumber } = req.params;

    // Find the user with the given account number
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });

    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Find the account details
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);

    // Check if account is found
    if (!account) {
      return res.status(404).json({ message: 'Account details not found' });
    }

    // Construct the response with account details
    return res.status(200).json({
      message: 'Account details retrieved successfully',
      account: {
        accountNumber: account.accountNumber,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        transactions: account.transactions, // Optional: Include transactions if needed
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


// GET endpoint to fetch full account details
router.get('/account/details/:accountNumber', cors(), async (req, res) => {
  try {
    const { accountNumber } = req.params;

    // Find the user with the given account number
    const user = await User.findOne({ 'accounts.accountNumber': accountNumber });

    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Find the account details
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);

    // Check if account is found
    if (!account) {
      return res.status(404).json({ message: 'Account details not found' });
    }

    // Construct the response with account details
    return res.status(200).json({
      message: 'Account details retrieved successfully',
      account: {
        accountNumber: account.accountNumber,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        transactions: account.transactions || [], // Include transactions if available
      },
      user: {
        fullName: user.fullName, // Include the user's full name
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


// GET /admin/pending-withdrawals
router.get('/admin/pending-withdrawals', cors(), async (req, res) => {
  try {
    // Find all users with pending withdrawals
    const users = await User.find({ 'withdrawals.status': 'pending' });

    // Collect all pending withdrawals
    const withdrawals = [];
    users.forEach(user => {
      user.withdrawals.forEach(withdrawal => {
        if (withdrawal.status === 'pending') {
          withdrawals.push({
            ...withdrawal.toObject(),
            userId: user._id,
          });
        }
      });
    });

    res.status(200).json({ withdrawals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send Notification Endpoint
router.post("/send-notification", cors(), async (req, res) => {
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

    // Send email to the user
    const emailSubject = "New Notification from CentralCityBank";
    const emailText = `Hello ${user.fullName},\n\nYou have a new notification: ${message}`;
    const emailHtml = `<p>Hello ${user.fullName},</p><p>You have a new notification:</p><p><strong>${message}</strong></p>`;

    await sendEmail(email, emailSubject, emailText, emailHtml);

    return res.status(200).json({ message: "Notification sent successfully and email delivered.", notification: newNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/generate-statement", cors(), async (req, res) => {
  const { accountNumber, startDate, endDate } = req.body;

  // Validate required fields
  if (!accountNumber || !startDate || !endDate) {
    return res.status(400).json({ message: "accountNumber, startDate, and endDate are required" });
  }

  try {
    // Find the user by account number
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
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


router.post("/transaction/:userId/:accountId", cors(), async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    const { type, amount, currency, description } = req.body;

    // Validate required fields
    if (!type || !amount || !currency || !description) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find the user by userId and accountId
    const user = await User.findOne({
      _id: userId,
      "accounts.accountId": accountId,
    });

    if (!user) {
      return res.status(404).json({ error: "User or Account not found" });
    }

    // Find the account
    const account = user.accounts.find((acc) => acc.accountId.toString() === accountId.toString());

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Create a new transaction
    const transaction = {
      transactionId: new mongoose.Types.ObjectId(),
      date: new Date(),
      type, // Either 'credit' or 'debit'
      amount: parseFloat(amount),
      currency,
      description,
    };

    // Update the balance based on the transaction type
    if (transaction.type === "credit") {
      account.balance += transaction.amount; // Add to balance
    } else if (transaction.type === "debit") {
      if (account.balance >= transaction.amount) {
        account.balance -= transaction.amount; // Subtract from balance
      } else {
        return res.status(400).json({ error: "Insufficient balance" });
      }
    }

    // Push the new transaction to the account's transactions array
    account.transactions.push(transaction);

    // Save the updated user document
    await user.save();

    return res.status(200).json({
      message: "Transaction added and balance updated successfully",
      account: account,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to create a withdrawal
router.post("/createWithdrawal", async (req, res) => {
  try {
    const { accountNumber, amount, currency, description } = req.body;

    // Validate required fields
    if (!accountNumber || !amount || !currency) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Find the user by accountNumber
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the account in the user's accounts
    const account = user.accounts.find(acc => acc.accountNumber === accountNumber);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // Check if the withdrawal amount exceeds the account balance
    if (amount > account.balance) {
      return res.status(400).json({ error: "Insufficient funds for withdrawal." });
    }

    // Define stages with approved: false by default
    const stagesData = [
      { name: "Welcome to [Sheritage]", description: "Start your journey with [Sheritage], your trusted online banking partner.", approved: false },
      { name: "Personal Profile Setup", description: "Provide basic information to create a secure and personalized profile.", approved: false },
      { name: "Secure Login Creation", description: "Set up a strong and unique login ID and password for your account.", approved: false },
      { name: "Verify Your Identity", description: "Complete identity verification to ensure your account's security.", approved: false },
      { name: "Link Contact Information", description: "Add your email and phone number for notifications and alerts.", approved: false },
      { name: "Choose Your Account", description: "Select the account type that suits your banking needs.", approved: false },
      { name: "Upload Verification Documents", description: "Provide required documents like ID and address proof for activation.", approved: false },
      { name: "Nominee Details", description: "Secure your funds by adding a nominee to your account.", approved: false },
      { name: "Set Up Transaction PIN", description: "Create a secure PIN for safe online and offline transactions.", approved: false },
      { name: "Add Linked Accounts", description: "Link your existing accounts for seamless fund management.", approved: false },
      { name: "Activate Mobile Banking", description: "Enable mobile banking to access your account on the go.", approved: false },
      { name: "Explore Banking Services", description: "Discover the wide range of services we offer to enhance your banking experience.", approved: false },
      { name: "Enable Security Features", description: "Activate additional security features like two-factor authentication.", approved: false },
      { name: "Set Transaction Preferences", description: "Define spending limits and notifications for better control.", approved: false },
      { name: "Enroll in Benefits Program", description: "Sign up for rewards, cashback, and other exclusive benefits.", approved: false },
      { name: "Connect Payment Cards", description: "Link your debit and credit cards for faster transactions.", approved: false },
      { name: "Set Up Auto-Pay", description: "Automate bill payments and transfers to save time.", approved: false },
      { name: "Download Our App", description: "Install our mobile app for convenient and secure banking.", approved: false },
      { name: "Final Account Review", description: "Double-check your account settings to ensure everything is perfect.", approved: false },
      { name: "Account Activation Complete", description: "Congratulations! Your [BankName] account is ready. Start banking today.", approved: false }
    ];
    
    

    // Create the withdrawal object
    const withdrawal = {
      withdrawalId: new mongoose.Types.ObjectId(),
      accountNumber,
      amount,
      currency,
      description,
      status: "pending", // Default status
      stages: stagesData, // Add stages with 'approved: false'
    };

    // Add withdrawal to the user's withdrawals array
    user.withdrawals.push(withdrawal);

    // Save user document with the updated withdrawals
    await user.save();

    // Log the user data to verify stages are correctly added
    console.log("User after withdrawal creation:", user);

    // Return the created withdrawal details including stages
    res.status(201).json({ withdrawal, stages: stagesData });
  } catch (err) {
    console.error("Error processing withdrawal:", err);
    res.status(400).json({ error: err.message });
  }
});

// Endpoint for admin to get all pending withdrawals
router.get("/admin/withdrawals", async (req, res) => {
  try {
    // Fetch all users and filter withdrawals that are pending
    const users = await User.find({ "withdrawals.status": "pending" });

    // Collect all pending withdrawals
    const pendingWithdrawals = [];
    users.forEach(user => {
      user.withdrawals.forEach(withdrawal => {
        if (withdrawal.status === "pending") {
          pendingWithdrawals.push({
            userId: user._id,
            accountNumber: withdrawal.accountNumber,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            description: withdrawal.description,
            stages: withdrawal.stages,
            withdrawalId: withdrawal.withdrawalId,
          });
        }
      });
    });

    // Return the pending withdrawals to the admin
    res.status(200).json({ pendingWithdrawals });
  } catch (err) {
    console.error("Error fetching pending withdrawals:", err);
    res.status(400).json({ error: err.message });
  }
});

// Endpoint for admin to approve or reject a stage in a withdrawal request
router.post("/admin/approveWithdrawalStage", async (req, res) => {
  try {
    const { userId, withdrawalId, stageIndex, approved } = req.body;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the withdrawal in the user's withdrawals
    const withdrawal = user.withdrawals.find(w => w.withdrawalId.toString() === withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found." });
    }

    // Check if the stage index is valid
    if (stageIndex < 0 || stageIndex >= withdrawal.stages.length) {
      return res.status(400).json({ error: "Invalid stage index." });
    }

    // Update the stage based on admin approval or rejection
    if (approved) {
      withdrawal.stages[stageIndex].status = "approved";
    } else {
      withdrawal.stages[stageIndex].status = "rejected";
      withdrawal.status = "rejected"; // If any stage is rejected, set the withdrawal status to rejected
    }

    // Check if all stages have been approved
    const allStagesApproved = withdrawal.stages.every(stage => stage.status === "approved");
    if (allStagesApproved) {
      withdrawal.status = "approved";
      // Here you can also add logic to transfer money if needed
      account.balance -= withdrawal.amount; // Deduct amount from the user's account
    }

    // Save the updated user document
    await user.save();

    // Return the updated withdrawal details
    res.status(200).json({ withdrawal });
  } catch (err) {
    console.error("Error approving/rejecting withdrawal stage:", err);
    res.status(400).json({ error: err.message });
  }
});

// Endpoint to check only pending stages for a given accountNumber
router.get("/checkPendingStages/:accountNumber", async (req, res) => {
  try {
    const { accountNumber } = req.params;

    // Find the user by account number
    const user = await User.findOne({ "accounts.accountNumber": accountNumber });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the withdrawal associated with the account number
    const withdrawal = user.withdrawals.find(w => w.accountNumber === accountNumber);
    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found." });
    }

    // Filter out only pending stages (where status is "pending")
    const pendingStages = withdrawal.stages.filter(stage => stage.status === "pending");

    // If no pending stages are found
    if (pendingStages.length === 0) {
      return res.status(200).json({ message: "No pending stages found." });
    }

    // Return the pending stages
    res.status(200).json({ pendingStages });
  } catch (err) {
    console.error("Error checking pending stages:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;