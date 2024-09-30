const paymentStagesData = [
    {
      stageNumber: 1,
      stageName: "Login Authentication",
      description: "Securely log into your account with multi-factor authentication to protect your data.",
      fee: 1, // Fee in dollars
    },
    {
      stageNumber: 2,
      stageName: "Account Overview",
      description: "Get a complete view of your account balances and transactions to manage your finances easily.",
      fee: 2,
    },
    {
      stageNumber: 3,
      stageName: "Balance Check",
      description: "Check your available funds before making any payments to ensure successful transactions.",
      fee: 1, // Per inquiry
    },
    {
      stageNumber: 4,
      stageName: "Payment Option Selection",
      description: "Choose the type of payment — bill payment, loan repayment, or money transfer.",
      fee: 1,
    },
    {
      stageNumber: 5,
      stageName: "Bill Payment Setup",
      description: "Set up your utility, mobile, or other service payments quickly to avoid late fees.",
      fee: 2,
      examples: [
        { service: "Electricity Bill", amount: 120 },
        { service: "Water Bill", amount: 45 },
        { service: "Mobile Bill", amount: 60 },
      ],
    },
    {
      stageNumber: 6,
      stageName: "Loan Repayment Setup",
      description: "Schedule your loan repayments directly from your account.",
      fee: 3,
      examples: [
        { loan: "Personal Loan Installment", amount: 500 },
        { loan: "Student Loan Installment", amount: 300 },
      ],
    },
    {
      stageNumber: 7,
      stageName: "Mortgage Payment Processing",
      description: "Manage your mortgage payments on time to keep your home secure.",
      fee: 5,
      examples: [{ mortgage: "Monthly Payment", amount: 1200 }],
    },
    {
      stageNumber: 8,
      stageName: "Insurance Premium Payment",
      description: "Make your insurance premium payments directly through your account.",
      fee: 3,
      examples: [
        { insurance: "Health Insurance Premium", amount: 150 },
        { insurance: "Auto Insurance Premium", amount: 100 },
      ],
    },
    {
      stageNumber: 9,
      stageName: "Credit Card Bill Payment",
      description: "Easily pay your credit card bills to avoid interest and maintain a healthy credit score.",
      fee: 2,
      examples: [
        { type: "Minimum Due", amount: 250 },
        { type: "Full Payment", amount: 1500 },
      ],
    },
    {
      stageNumber: 10,
      stageName: "Transfer Amount Input",
      description: "Enter the amount to transfer and review before confirming.",
      fee: 5, // Per domestic transfer
    },
    {
      stageNumber: 11,
      stageName: "Beneficiary Selection",
      description: "Select your beneficiary securely from saved contacts or add new ones.",
      fee: 1,
    },
    {
      stageNumber: 12,
      stageName: "Payment Review",
      description: "Review the transaction details before proceeding.",
      fee: 0, // Free of charge
    },
    {
      stageNumber: 13,
      stageName: "Payment Approval (OTP Verification)",
      description: "Authorize the payment using One-Time Password (OTP) verification.",
      fee: 0.5, // Per transaction
    },
    {
      stageNumber: 14,
      stageName: "Transaction Processing",
      description: "Your payment is processed instantly for a fast and safe experience.",
      fee: 2,
    },
    {
      stageNumber: 15,
      stageName: "Payment Confirmation Receipt",
      description: "Get an instant receipt for every payment made.",
      fee: 1,
    },
    {
      stageNumber: 16,
      stageName: "International Transfer Currency Conversion",
      description: "Currency conversion for international payments at competitive rates.",
      fee: "2%", // 2% of the transaction amount
    },
    {
      stageNumber: 17,
      stageName: "Recurring Payment Setup",
      description: "Set up recurring payments for subscriptions, bills, or loans.",
      fee: 2, // Per setup
    },
    {
      stageNumber: 18,
      stageName: "Tax Payment Setup",
      description: "Easily set up your tax payments to avoid late penalties.",
      fee: 3,
      examples: [{ tax: "Income Tax Payment", amount: 1000 }],
    },
    {
      stageNumber: 19,
      stageName: "Transaction History View",
      description: "View, download, or print your transaction history anytime.",
      fee: 2,
    },
    {
      stageNumber: 20,
      stageName: "Transaction Success Notification (SMS/Email)",
      description: "Receive instant notifications for every successful payment.",
      fee: 0.5, // Per transaction
    },
  ];
  
  module.exports = paymentStagesData;
  