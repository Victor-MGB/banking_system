require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AdminRoutes = require("./routes/AdminRoutes")
const newsletterRoutes = require('./routes/newsletterRoutes');
const contactRoute = require('./routes/contactRoute')
const stageRoutes = require('./routes/StageRoute');

// Import routes
const userRoutes = require('./routes/userRoutes'); // Assuming you have a userRoutes file
const connectDB = require('./config/db'); // Import the MongoDB connection

// Initialize express app
const app = express();

// Middleware
app.use(bodyParser.json()); // To parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())

// Connect to MongoDB
connectDB(); // Call the MongoDB connection function

// Health check route
app.get("/", (req, res) => {
  res.send("Banking System API is running...");
});

// User routes for registration, login, and OTP verification
app.use("/api/users", userRoutes);
app.use('/admin', AdminRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/contact', contactRoute)


app.use('/api/stages', stageRoutes);


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
