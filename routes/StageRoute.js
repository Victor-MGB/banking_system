// routes/stages.js
const express = require('express');
const Stage = require('../models/StageModels');
const router = express.Router();

// Create 10 stages (without user_id)
router.post('/createStages', async (req, res) => {
    try {
      // Define the stages that will be created
      const stagesData = [
        { name: 'Stage 1', description: 'Initial stage description' },
        { name: 'Stage 2', description: 'Stage 2 description' },
        { name: 'Stage 3', description: 'Stage 3 description' },
        { name: 'Stage 4', description: 'Stage 4 description' },
        { name: 'Stage 5', description: 'Stage 5 description' },
        { name: 'Stage 6', description: 'Stage 6 description' },
        { name: 'Stage 7', description: 'Stage 7 description' },
        { name: 'Stage 8', description: 'Stage 8 description' },
        { name: 'Stage 9', description: 'Stage 9 description' },
        { name: 'Stage 10', description: 'Final stage description' },
      ];
  
      // Create the stages in the database
      const stages = await Stage.insertMany(stagesData);
  
      // Return the created stages to the client
      res.json({ stages });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
// Get all stages for the admin (only pending stages)
router.get('/admin', async (req, res) => {
  try {
    const stages = await Stage.find({ status: 'pending' });  // Only show pending stages for approval
    res.json(stages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Approve a stage
router.post('/admin/approve/:stageId', async (req, res) => {
  try {
    const stage = await Stage.findByIdAndUpdate(
      req.params.stageId,
      { status: 'approved', updated_at: Date.now() },
      { new: true }
    );
    res.json(stage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject a stage
router.post('/admin/reject/:stageId', async (req, res) => {
  try {
    const stage = await Stage.findByIdAndUpdate(
      req.params.stageId,
      { status: 'rejected', updated_at: Date.now() },
      { new: true }
    );
    res.json(stage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
