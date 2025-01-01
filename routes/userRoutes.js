const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
// const nodemailer = require("nodemailer");
const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utilss/email");

const router = express.Router();

const generateAccountNumber = async () => {
  let accountNumber;
  let user;
  do {
    accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    ).toString();
    user = await User.findOne({ "accounts.accountNumber": accountNumber });
  } while (user);
  return accountNumber;
};

router.post("/register", async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    phoneNumber,
    gender,
    dateOfBirth,
    accountType,
    address,
    postalCode,
    state,
    country,
    currency,
    password,
    confirmPassword,
    accountPin,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phoneNumber ||
    !gender ||
    !dateOfBirth ||
    !accountType ||
    !address ||
    !postalCode ||
    !state ||
    !country ||
    !currency ||
    !password ||
    !confirmPassword ||
    !accountPin
  ) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({
      message: "All fields are required to complete the registration process.",
    });
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    console.log("Validation failed: Passwords do not match");
    return res
      .status(400)
      .json({ message: "Password and Confirm Password must match." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Validation failed: User already exists");
      return res
        .status(400)
        .json({ message: "A user with this email already exists." });
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });

    // Hash password and account pin
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAccountPin = await bcrypt.hash(accountPin, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Create new user
    const user = new User({
      firstName,
      middleName,
      lastName,
      email,
      phoneNumber,
      gender,
      dateOfBirth,
      accountType,
      address,
      postalCode,
      state,
      country,
      currency,
      password: hashedPassword,
      accountPin: hashedAccountPin,
      agree: true,
      kycStatus: "pending",
      otp,
      otpExpires,
    });

    // Save user to the database
    await user.save();

    // Email details
    const emailSubject =
      "Welcome to Central Nation Bank - Complete Your Registration";
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #2a7ae4;
          text-align: center;
        }
        .otp {
          font-size: 1.5em;
          color: #e91e63;
          text-align: center;
          margin: 20px 0;
        }
        p {
          margin: 10px 0;
        }
        a {
          color: #2a7ae4;
          text-decoration: none;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 0.9em;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to Sheritage Bank!</h1>
        <p>Dear <strong>${firstName}</strong>,</p>
        <p>We are thrilled to have you on board. To complete your registration, please use the following OTP:</p>
        <div class="otp">${otp}</div>
        <p><strong>Note:</strong> This OTP is valid for the next 5 minutes. Please do not share it with anyone.</p>
        <p>If you encounter any issues, feel free to reach out to our support team at <a href="mailto:Centrallnationalbank@gmail.com">Centrallnationalbank@gmail.com</a>.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Central Nation Bank. All rights reserved.
          <br>
          <a href="https://central-national-bank.netlify.app/otp">Visit Our Website to verify your otp</a>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send email
    try {
      await sendEmail(email, emailSubject, "", emailHtml);
      res.status(201).json({
        message:
          "Registration successful! Please check your email for the OTP.",
        user: {
          firstName,
          middleName,
          lastName,
          email,
          role: user.role, // Include the role here
          phoneNumber,
          otp,
          gender,
          dateOfBirth,
          accountType,
          address,
          postalCode,
          state,
          country,
          currency,
          kycStatus: "pending",
        },
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      res.status(500).json({
        message:
          "User registered but failed to send OTP. Please request a new OTP.",
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "An error occurred during registration. Please try again later.",
    });
  }
});

router.get("/", (req, res) => {
  res.send("hello world");
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Step 1: Validate input
    if (!email || !otp) {
      return res.status(400).json({
        message: "Both email and OTP are required.",
      });
    }

    // Step 2: Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found. Please provide a valid email.",
      });
    }

    // Step 3: Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP. Please try again.",
      });
    }

    // Step 4: Check if OTP has expired
    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        message: "OTP has expired. Request a new one.",
      });
    }

    // Step 5: Generate a new account number
    const accountNumber = await generateAccountNumber();
    if (!accountNumber) {
      return res.status(500).json({
        message: "Failed to generate account number. Please try again later.",
      });
    }

    // Step 6: Create a new account object
    const newAccount = {
      accountId: new mongoose.Types.ObjectId(),
      accountNumber,
      type: "default", // Default account type
      balance: 0,
      currency: "USD", // Default currency
      transactions: [],
    };

    // Step 7: Update user's account details
    user.accounts.push(newAccount);
    await user.save();

    // Step 8: Prepare email content
    const emailSubject =
      "Welcome to Central Nation Bank - Your Account Details";
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9f9f9;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      font-size: 1.4em;
      color: #2a7ae4;
      margin-bottom: 20px;
    }
    .details {
      text-align: center;
      font-size: 1.2em;
      color: #444;
      background: #f1f8ff;
      padding: 10px;
      margin: 20px auto;
      border-radius: 5px;
    }
    .footer {
      text-align: center;
      font-size: 0.9em;
      color: #777;
      margin-top: 30px;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    a {
      color: #2a7ae4;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      Welcome to Central Nation Bank
    </div>
    <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
    <p>We are excited to welcome you to Central Nation Bank. Your account has been successfully created, and we are thrilled to be part of your financial journey.</p>
    <p>Your account details:</p>
    <div class="details">
      Account Number: ${accountNumber}
    </div>
    <p><strong>Note:</strong> Keep this information secure and never share it with anyone.</p>
    <p>If you have any questions, please contact us at <a href="mailto:Centrallnationalbank@gmail.com">Centrallnationalbank@gmail.com</a>.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Central Nation Bank. All rights reserved.<br>
      <a href="https://central-national-bank.netlify.app/sign-in">Visit Our Website</a>
    </div>
  </div>
</body>
</html>`;

    // Step 9: Send account number to user's email
    await sendEmail(email, emailSubject, "", emailHtml);

    // Step 10: Respond with success and user details
    res.status(201).json({
      message: "Account number has been sent to your email successfully.",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        accountType: user.accountType,
        address: user.address,
        postalCode: user.postalCode,
        state: user.state,
        country: user.country,
        currency: user.currency,
        accountNumber,
        balance: newAccount.balance,
        dateOfAccountCreation: newAccount.createdAt,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      message:
        "An error occurred while verifying the OTP. Please try again later.",
    });
  }
});

router.post("/login", async (req, res) => {
    const { accountNumber, password } = req.body;
  
    try {
      // Find the user by account number within their accounts array
      const user = await User.findOne({
        "accounts.accountNumber": accountNumber,
      });
  
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid account number or password",
        });
      }
  
      // Check if the provided password matches the stored hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid account number or password",
        });
      }
  
      // Find the account matching the accountNumber
      const account = user.accounts.find(
        (acc) => acc.accountNumber === accountNumber
      );
  
      // Generate a JWT token for the user
      const token = jwt.sign(
        { userId: user._id, accountNumber },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      // Send back a successful response with the token and all user details
      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          ...user.toObject(), // Include all user fields from the database
          accountNumber: account ? account.accountNumber : null, // Explicitly include the account number
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  });


router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ message: "Email and OTP are required", status: 400 });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: 404 });
    }

    // Check if OTP matches and is not expired
    const currentTime = new Date();
    if (user.otp !== otp || user.otpExpires < currentTime) {
      return res
        .status(400)
        .json({ message: "Invalid email or OTP", status: 400 });
    }

    // OTP verification successful
    res.status(200).json({
      message: "OTP verified successfully",
      status: 200,
      user: {
        id: user._id,
        email: user.email,
        otpVerified: true,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(500)
      .json({ message: "Server error. Please try again later.", status: 500 });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude password from the response
    res.status(200).json({
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
});

router.post("/withdraw", async (req, res) => {
  const { email, accountPin, amount } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Verify account pin
    const isMatch = await bcrypt.compare(accountPin, user.accountPin);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid account pin" });
    }

    // Assume a single default account for simplicity
    const account = user.accounts[0];
    if (!account) {
      return res
        .status(400)
        .json({ message: "No account found for this user" });
    }

    // Check if sufficient balance is available
    if (account.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct the amount from account balance
    account.balance -= amount;

    // Update the root balance field
    user.balance -= amount;

    // Create withdrawal transaction record
    const withdrawalTransaction = {
      transactionId: new mongoose.Types.ObjectId(),
      date: new Date(),
      type: "withdrawal",
      amount: amount,
      currency: account.currency,
      description: "Withdrawal",
      accountNumber: account.accountNumber, // Add accountNumber
      accountId: account.accountId, // Add accountId
    };

    // Add transaction record to account and root withdrawals array
    account.transactions.push(withdrawalTransaction);
    user.withdrawals.push(withdrawalTransaction);

    // Save the user document to update the account details
    await user.save();

    res
      .status(200)
      .json({ message: "Withdrawal successful", withdrawalTransaction });
  } catch (error) {
    console.error("Error during withdrawal:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/deposit", async (req, res) => {
  const { accountNumber, accountPin, amount } = req.body;

  try {
    // Find user by account number
    const user = await User.findOne({
      "accounts.accountNumber": accountNumber,
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Verify account pin
    const isMatch = await bcrypt.compare(accountPin, user.accountPin);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid account pin" });
    }

    // Find the account by account number
    const account = user.accounts.find(
      (acc) => acc.accountNumber === accountNumber
    );
    if (!account) {
      return res.status(400).json({ message: "Account not found" });
    }

    // Deposit funds into the account
    account.balance += amount;

    // Add transaction record
    account.transactions.push({
      transactionId: new mongoose.Types.ObjectId(),
      date: new Date(),
      type: "deposit",
      amount: amount,
      currency: account.currency,
      description: "Deposit",
    });

    // Save the user document
    await user.save();

    res.status(200).json({ message: "Deposit successful", account });
  } catch (error) {
    console.error("Error during deposit:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/update-transaction", async (req, res) => {
  const { userId, accountId, transaction } = req.body;

  try {
    console.log(
      "Received request to update transaction for userId:",
      userId,
      "and accountId:",
      accountId
    );

    // Find user by userId
    const user = await User.findById(userId);
    console.log("Found user:", user);

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Find the account in user's accounts array
    const account = user.accounts.find(
      (acc) => acc.accountId.toString() === accountId
    );
    console.log("Found account:", account);

    if (!account) {
      console.log("Account not found");
      return res.status(404).json({ message: "Account not found" });
    }

    // Update account transactions
    account.transactions.push(transaction);

    // Save the updated user document
    await user.save();

    console.log("Transaction updated successfully");

    // Send a successful response with updated data
    res.status(200).json({
      message: "Transaction updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        account: {
          _id: account._id,
          transactions: account.transactions,
        },
      },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.get("/recent-transactions", async (req, res) => {
  const { userId } = req.body; // Assuming userId is provided in the request

  try {
    // Find user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the most recent transactions
    const recentTransactions = user.accounts
      .reduce((acc, curr) => {
        return acc.concat(curr.transactions);
      }, [])
      .sort((a, b) => b.date - a.date)
      .slice(0, 10); // Get the top 10 recent transactions

    res.status(200).json({ recentTransactions });
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/update-balance", async (req, res) => {
  const { accountNumber, amountToAdd } = req.body;

  if (!accountNumber || typeof amountToAdd !== "number") {
    return res
      .status(400)
      .json({ message: "Account number and amount to add are required" });
  }

  try {
    const user = await User.findOne({
      "accounts.accountNumber": accountNumber,
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with given account number not found" });
    }

    const accountIndex = user.accounts.findIndex(
      (acc) => acc.accountNumber === accountNumber
    );
    if (accountIndex === -1) {
      return res.status(404).json({ message: "Account not found" });
    }

    user.accounts[accountIndex].balance += amountToAdd;

    // Update the user's primary balance as the sum of all account balances
    user.balance = user.accounts.reduce(
      (acc, account) => acc + account.balance,
      0
    );

    await user.save();

    res.status(200).json({
      message: "Account balance updated successfully",
      account: user.accounts[accountIndex],
      totalBalance: user.balance,
    });
  } catch (error) {
    console.error("Error updating balance:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/send-notification", async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res
      .status(400)
      .json({ message: "Email, subject, and message are required" });
  }

  try {
    // Send email
    await sendEmail(email, subject, message);
    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res
      .status(500)
      .json({ message: "Error sending notification. Please try again later." });
  }
});

router.get("/balance/:accountNumber", async (req, res) => {
  const { accountNumber } = req.params;

  try {
    const user = await User.findOne({
      "accounts.accountNumber": accountNumber,
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with given account number not found" });
    }

    const account = user.accounts.find(
      (acc) => acc.accountNumber === accountNumber
    );
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.status(200).json({ balance: account.balance });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// Update stage 1
router.post("/update-stage_1", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_1: !user.stage_1 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_1 updated to ${updatedUser.stage_1}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_1:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

// Update stage 2
router.post("/update-stage_2", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_2: !user.stage_2 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_2 updated to ${updatedUser.stage_2}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_2:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_3", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_3: !user.stage_3 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_3 updated to ${updatedUser.stage_3}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_3:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});


// Update stage 4
router.post("/update-stage_4", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_4: !user.stage_4 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_4 updated to ${updatedUser.stage_4}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_4:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_5", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_5: !user.stage_5 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_5 updated to ${updatedUser.stage_5}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_5:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

// Update stage 6
router.post("/update-stage_6", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_6: !user.stage_6 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_6 updated to ${updatedUser.stage_6}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_6:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_7", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_7: !user.stage_7 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_7 updated to ${updatedUser.stage_7}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_7:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_8", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_7: !user.stage_8 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_8 updated to ${updatedUser.stage_8}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_8:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_9", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_9: !user.stage_9 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_9 updated to ${updatedUser.stage_9}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_9:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_10", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_10: !user.stage_10 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_10 updated to ${updatedUser.stage_10}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_10:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_11", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_11: !user.stage_11 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_11 updated to ${updatedUser.stage_11}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_11:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_12", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_12: !user.stage_12 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_12 updated to ${updatedUser.stage_12}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_12:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_13", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_13: !user.stage_13 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_13 updated to ${updatedUser.stage_13}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_13:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_14", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_14: !user.stage_14 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_14 updated to ${updatedUser.stage_14}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_14:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/update-stage_15", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      status: "error",
      requestBody: req.body,
    });
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
        requestBody: req.body,
      });
    }

    // Toggle the `stage_1` value
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { stage_15: !user.stage_15 }, // Toggle value
      { new: true } // Return updated document
    );

    res.status(200).json({
      message: `stage_15 updated to ${updatedUser.stage_15}`,
      status: "success",
      user: updatedUser,
      requestBody: req.body,
    });
  } catch (error) {
    console.error("Error updating stage_15:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      status: "error",
      requestBody: req.body,
    });
  }
});

router.post("/admin/register", async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    phoneNumber,
    gender,
    dateOfBirth,
    accountType,
    address,
    postalCode,
    state,
    country,
    currency,
    password,
    confirmPassword,
    accountPin,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phoneNumber ||
    !gender ||
    !dateOfBirth ||
    !accountType ||
    !address ||
    !postalCode ||
    !state ||
    !country ||
    !currency ||
    !password ||
    !confirmPassword ||
    !accountPin
  ) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ message: "All fields are required" });
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    console.log("Validation failed: Passwords do not match");
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Validation failed: User already exists");
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });

    // Hash password and account pin
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAccountPin = await bcrypt.hash(accountPin, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Create new user
    const user = new User({
      firstName,
      middleName,
      lastName,
      email,
      phoneNumber,
      gender,
      dateOfBirth,
      accountType,
      address,
      postalCode,
      state,
      country,
      currency,
      password: hashedPassword,
      accountPin: hashedAccountPin,
      agree: true,
      kycStatus: "pending",
      otp,
      otpExpires,
    });

    // Save user to the database
    await user.save();

    // Email content
    const emailSubject = "OTP for Account Registration";
    const emailText = `Dear ${firstName},

We are delighted to assist you in completing your account registration with Central City Bank.

Please find below your One-Time Password (OTP) required for account registration:
OTP: ${otp}
This OTP is valid for a limited time. Please use it promptly to finalize your registration process.
If you encounter any difficulties or have any questions, please don't hesitate to contact our dedicated support team at centralcitybank0@gmail.com.

Thank you for choosing Central City Bank for your banking needs.

The Central City Bank Team
`;

    const emailHtml = `<p>Dear ${firstName},</p>
<p>We are delighted to assist you in completing your account registration with Central City Bank.</p>
<p>Please find below your One-Time Password (OTP) required for account registration:</p>
<p><strong>OTP: ${otp}</strong></p>
<p>This OTP is valid for a limited time. Please use it promptly to finalize your registration process.</p>
<p>If you encounter any difficulties or have any questions, please don't hesitate to contact our dedicated support team at <a href="mailto:centralcitybank0@gmail.com">centralcitybank0@gmail.com</a>.</p>
<p>Thank you for choosing Central City Bank for your banking needs.</p>
<p>The Central City Bank Team</p>`;

    // Send email
    try {
      await sendEmail(email, emailSubject, emailText, emailHtml);
      res.status(201).json({
        message: "User registered successfully",
        user: {
          firstName,
          middleName,
          lastName,
          email,
          phoneNumber,
          gender,
          dateOfBirth,
          accountType,
          address,
          postalCode,
          state,
          country,
          currency,
          otp,
          kycStatus: "pending",
        },
      });
    } catch (emailError) {
      console.error("Error during email sending:", emailError);
      res
        .status(500)
        .json({ message: "Error sending email. Please try again later." });
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/admin/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      console.log("Missing fields:", { email, otp });
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP has expired
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Generate account number
    const accountNumber = await generateAccountNumber();

    // Define the new account object
    const newAccount = {
      accountId: new mongoose.Types.ObjectId(),
      accountNumber: accountNumber,
      type: "default", // Default type if not provided yet
      balance: 0,
      currency: "USD", // Default currency if not provided yet
      transactions: [],
    };

    // Add the new account to the user's accounts array
    user.accounts.push(newAccount);

    // Save the updated user document
    await user.save();

    // Compose email
    const emailSubject = "Your New Account Information";
    const emailHtml = `
      <p>Dear ${user.firstName} ${user.lastName},</p>
      <p>We are thrilled to inform you that your account has been successfully created with our platform. Your account details are provided below:</p>
      <p><strong>Account Number:</strong> ${accountNumber}</p>
      <p>Please keep this information secure and do not share it with anyone. If you have any questions or need assistance, feel free to contact our support team at <a href="mailto:centralcitybank0@gmail.com">centralcitybank0@gmail.com</a>.</p>
      <p>Thank you for choosing our platform.</p>
      <p>Best regards,<br/>Central City Bank</p>
      <p>USA<br/>
      centralcitybank0@gmail.com<br/>
      +16162506969</p>
    `;

    // Send account number to the user's email
    sendEmail(email, emailSubject, "", emailHtml);

    // Return success message along with user details and account number
    res.status(201).json({
      message: "Account number sent to your email successfully",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        accountType: user.accountType,
        address: user.address,
        postalCode: user.postalCode,
        state: user.state,
        country: user.country,
        currency: user.currency,
        accountNumber: accountNumber,
        balance: newAccount.balance,
        dateOfAccountCreation: user.dateOfAccountCreation,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/admin/login", async (req, res) => {
  const { accountNumber, password } = req.body;

  try {
    // Find the user by account number within their accounts array
    const user = await User.findOne({
      "accounts.accountNumber": accountNumber,
    });

    if (!user) {
      console.log("User not found with account number:", accountNumber);
      return res.status(400).json({
        success: false,
        message: "Invalid account number or password",
      });
    }

    console.log("User found:", user);
    console.log("Password provided:", password);
    console.log("Stored hashed password:", user.password);

    // Check if the provided password matches the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for user:", user._id);
      return res.status(400).json({
        success: false,
        message: "Invalid account number or password",
      });
    }

    // Extract the account number from the accounts array
    const account = user.accounts.find(
      (acc) => acc.accountNumber === accountNumber
    );

    // Generate a JWT token for the user
    const token = jwt.sign(
      { userId: user._id, accountNumber: accountNumber },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send back a successful response with the token and all user details
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        accountType: user.accountType,
        address: user.address,
        postalCode: user.postalCode,
        state: user.state,
        country: user.country,
        currency: user.currency,
        accountPin: user.accountPin,
        agree: user.agree,
        kycStatus: user.kycStatus,
        balance: user.balance,
        accounts: user.accounts,
        withdrawals: user.withdrawals,
        dateOfAccountCreation: user.dateOfAccountCreation,
        otp: user.otp,
        otpExpires: user.otpExpires,
        stage_1: user.stage_1,
        stage_2: user.stage_2,
        stage_3: user.stage_3,
        stage_4: user.stage_4,
        stage_5: user.stage_5,
        stage_6: user.stage_6,
        stage_7: user.stage_7,
        accountNumber: account.accountNumber, // Include account number in response
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // If the user exists, delete it
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout", async (req, res) => {
  // Ideally, you'd handle token invalidation here, like adding the token to a blacklist
  res.status(200).json({ message: "Logout successful" });
});

module.exports = router;