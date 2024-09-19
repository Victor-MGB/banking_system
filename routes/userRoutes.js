const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/email");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");


// Generate Account Number (example logic)
const generateAccountNumber = () => {
  // Generate a random 10-digit number (or any other length as needed)
  const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return accountNumber; // No prefix, only numbers
};


router.post("/register", async (req, res) => {
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

    res.status(200).json({ message: "Account created", accountNumber });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
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
        notifications: user.notifications, // Could be moved to a separate endpoint
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.status(200).json(users); // Return users as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout user (client-side should discard token)
router.post("/logout", (req, res) => {
  // On the client side, remove the token (this endpoint doesn't need much logic on the server side)
  res.status(200).json({ message: "Logout successful" });
});


// Delete user by ID
router.delete("/users/:id", async (req, res) => {
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


module.exports = router;