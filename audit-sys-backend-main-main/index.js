require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { generateAnnualReport } = require('./Report/AnnualReportGenerator');


// Middleware setup
app.use(cors());
app.use(bodyParser.json()); // To parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); 

// Access environment variables
const PORT = process.env.PORT || 3000;

// Import routes
const homeRoutes = require('./routes/home');
app.use(homeRoutes);

// Add this before app.listen(...)
app.get('/', (req, res) => {
  res.send('API is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Function to trigger the annual report generation process
const triggerAnnualReportGeneration = async () => {
  try {
    await generateAnnualReport();
    console.log('Annual report generated successfully.');
  } catch (error) {
    console.error('Error generating annual report:', error);
  }
};

// Schedule the report generation to run at the end of each year
const scheduleAnnualReportGeneration = () => {
  const now = new Date();
  const nextYear = now.getFullYear() + 1;
  const scheduledDate = new Date(nextYear, 0, 1, 0, 0, 0); // January 1st of the next year

  let timeUntilNextRun = scheduledDate - now;
  // If the value is too large or negative, default to 24 hours
  if (timeUntilNextRun <= 0 || timeUntilNextRun > 2147483647) {
    timeUntilNextRun = 24 * 60 * 60 * 1000; // 24 hours
  }

  setTimeout(() => {
    triggerAnnualReportGeneration();
    scheduleAnnualReportGeneration(); // Reschedule for the following year
  }, timeUntilNextRun);
};

// Start the scheduling process
scheduleAnnualReportGeneration();

module.exports = {
  triggerAnnualReportGeneration,
};