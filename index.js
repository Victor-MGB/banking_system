// index.js

// Load environment variables from .env
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

// Import routes
const userRoutes = require("./routes/userRoutes"); // Assuming you have a user.js for registration, login, etc.

// Initialize express app
const app = express();

// Middleware
app.use(cors()); // To allow cross-origin requests
app.use(bodyParser.json()); // To parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check route
app.get("/", (req, res) => {
  res.send("Banking System API is running...");
});

// User routes for registration, login, and OTP verification
app.use("/api/users", userRoutes);

// Error handling for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
