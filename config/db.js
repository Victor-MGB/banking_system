const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined. Check your .env file.');
    }
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection error:', error.message || error);
    console.error('Error Stack:', error.stack);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;