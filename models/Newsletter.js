const mongoose = require('mongoose');
const { Schema } = mongoose;

const newsletterSchema = new Schema({
  email: { type: String, required: true, unique: true },
  isSubscribed: { type: Boolean, default: true },
  subscriptionDate: { type: Date, default: Date.now },
  unsubscriptionDate: { type: Date }
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

module.exports = Newsletter;
