const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const cors = require("cors");

// Admin Registration
router.post('/register', cors(), async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ msg: 'Admin already exists' });
    }

    admin = new Admin({
      username,
      email,
      password
    });

    await admin.save();
    res.status(201).json({ msg: 'Admin registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Admin Login
router.post('/login', cors(), async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Check if admin exists
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(400).json({
          msg: 'Invalid email or password',
          success: false,
          icon: 'error', // Optional for front-end use
        });
      }
  
      // Verify password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({
          msg: 'Invalid email or password',
          success: false,
          icon: 'error', // Optional for front-end use
        });
      }
  
      // JWT payload and token generation
      const payload = {
        admin: {
          id: admin.id,
          role: admin.role
        }
      };
  
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      // Return token and admin data upon successful login
      res.json({
        token,
        msg: 'Admin logged in successfully',
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
        icon: 'success' // Optional for front-end use
      });
  
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        msg: 'Server error, please try again later',
        success: false,
        icon: 'error'
      });
    }
  });

// Protected route example
router.get('/dashboard', (req, res) => {
    res.json({ msg: 'Welcome to the Admin Dashboard!' });
  });


module.exports = router;
