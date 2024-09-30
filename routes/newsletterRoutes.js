const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');

// Subscribe to newsletter
// Subscribe user logic
router.post('/subscribe', async (req, res) => {
    const { email } = req.body;
  
    try {
      let subscriber = await Newsletter.findOne({ email });
  
      if (subscriber) {
        // User exists, update their subscription status
        subscriber.isSubscribed = true;
        subscriber.subscriptionDate = new Date();
      } else {
        // New subscriber
        subscriber = new Newsletter({
          email,
          isSubscribed: true,
          subscriptionDate: new Date()
        });
      }
  
      await subscriber.save();
      res.status(200).json({ message: 'Subscribed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });  
  

// Unsubscribe user logic
router.post('/unsubscribe', async (req, res) => {
    const { email } = req.body;
    
    try {
      let subscriber = await Newsletter.findOne({ email });
  
      if (!subscriber) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update subscription status
      subscriber.isSubscribed = false;
      subscriber.unsubscriptionDate = new Date();
      await subscriber.save();
      
      res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });
  
// Route to get all current subscribers
router.get('/admin/subscribers', async (req, res) => {
    try {
      // Fetch all users who are subscribed
      const subscribers = await Newsletter.find({ isSubscribed: true }).select('email subscriptionDate');
      
      res.status(200).json({
        message: 'Subscribers list',
        subscribers: subscribers
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching subscribers' });
    }
  });

  // Route to get all unsubscribed users
router.get('/admin/unsubscribers', async (req, res) => {
    try {
      // Fetch all users who are unsubscribed
      const unsubscribers = await Newsletter.find({ isSubscribed: false }).select('email unsubscriptionDate');
      
      res.status(200).json({
        message: 'Unsubscribers list',
        unsubscribers: unsubscribers
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching unsubscribers' });
    }
  });
  

module.exports = router;
