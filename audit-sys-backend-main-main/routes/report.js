const express = require("express");
const router = express.Router();
const { generateAnnualReport } = require("../src/reports/index");

// Route to trigger annual report generation
router.get("/generate-annual-report", async (req, res) => {
  try {
    const report = await generateAnnualReport();
    res.status(200).json({ message: "Annual report generated successfully", report });
  } catch (error) {
    console.error("Error generating annual report: ", error);
    res.status(500).send("Error generating annual report: " + error.message);
  }
});

// Route to retrieve the generated annual report (if stored)
router.get("/annual-report", async (req, res) => {
  // Logic to retrieve the stored annual report can be added here
  res.status(200).send("Annual report retrieval logic not implemented yet.");
});

module.exports = router;