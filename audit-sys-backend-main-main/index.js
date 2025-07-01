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

// Access environment variables - ensure PORT is a number
const PORT = parseInt(process.env.PORT) || 3000;
console.log('🔧 Debug - Raw PORT from env:', process.env.PORT);
console.log('🔧 Debug - Parsed PORT:', PORT, typeof PORT);

// Import routes
const homeRoutes = require('./routes/home');
const reportRoutes = require('./routes/report');

app.use(homeRoutes);
app.use(reportRoutes);

// Add this before app.listen(...)
app.get('/', (req, res) => {
  res.send('API is running');
});

// Enhanced server startup with port conflict handling
const startServer = (port, maxAttempts = 10) => {
  // Ensure port is a number and within valid range
  const numericPort = parseInt(port);
  console.log('🔧 Debug - Attempting to start server on port:', port, 'parsed as:', numericPort);
  
  if (isNaN(numericPort) || numericPort < 0 || numericPort >= 65536) {
    console.error(`❌ Invalid port: ${port} (${typeof port}). Using default port 3000.`);
    return startServer(3000, maxAttempts);
  }

  if (maxAttempts <= 0) {
    console.error(`❌ Too many port conflicts. Unable to start server.`);
    process.exit(1);
  }

  const server = app.listen(numericPort, () => {
    console.log(`🚀 Server is running on port ${numericPort}`);
    console.log(`📊 Dashboard: http://localhost:${numericPort}`);
    console.log(`📄 Report API: http://localhost:${numericPort}/report/2025`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = numericPort + 1;
      console.log(`❌ Port ${numericPort} is in use, trying port ${nextPort}... (${maxAttempts - 1} attempts left)`);
      startServer(nextPort, maxAttempts - 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });

  return server;
};

// Start the server
startServer(PORT);


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