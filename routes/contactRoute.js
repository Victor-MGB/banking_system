const express = require('express');
const router = express.Router()
const nodemailer = require('nodemailer');

// Create the Contact Model

// Create the POST endpoint for submitting the contact form
router.post('/api/contact', async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body;

  try {
    // Save the form data in MongoDB
    const newContact = new Contact({ fullName, email, phone, subject, message });
    await newContact.save();

    // Send an email (optional)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // User's email
      subject: `Thank you for contacting us, ${fullName}!`,
      text: `Hello ${fullName},\n\nThank you for reaching out to us! We have received your message with the subject "${subject}" and will get back to you shortly.\n\nBest regards,\nLeve Banking Corporation`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Contact form submitted successfully!' });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Failed to submit contact form.' });
  }
});

module.exports = router;
