const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as necessary

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers['authorization'].split(' ')[1]; // Assuming Bearer token
    if (!token) return res.status(401).json({ message: 'Access denied' });

    const verified = jwt.verify(token, process.env.JWT_SECRET); // Replace with your secret
    req.user = await User.findById(verified.id); // Ensure this ID matches your user schema
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
