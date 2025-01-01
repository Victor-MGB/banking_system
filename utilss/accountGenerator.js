const User = require("./models/User"); // Assuming you have this User model

// Function to generate a random 10-digit account number
const generateAccountNumber = async () => {
  let accountNumber;
  let accountExists = true;

  while (accountExists) {
    // Generate a 10-digit random number as the account number
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Check if the account number already exists
    accountExists = await User.findOne({ accountNumber });
  }

  return accountNumber;
};

module.exports = generateAccountNumber;
