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
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create a JWT payload and sign it
    const payload = {
      admin: {
        id: admin.id,
        role: admin.role
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, msg: 'Admin logged in successfully',admin, success:true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Protected route example
router.get('/dashboard', (req, res) => {
    res.json({ msg: 'Welcome to the Admin Dashboard!' });
  });

module.exports = router;
