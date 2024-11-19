const mongoose = require('mongoose');
const { Schema } = mongoose;

const stageSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Export the schema, not the model
module.exports = stageSchema;
