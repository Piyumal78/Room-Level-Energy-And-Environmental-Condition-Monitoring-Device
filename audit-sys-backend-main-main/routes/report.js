const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateAnnualReport } = require("../services/generateReport");

const router = express.Router();

router.get("/report/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      return res.status(400).json({ error: "Invalid year format" });
    }

    console.log(`Generating annual report for year: ${year}`);
    const result = await generateAnnualReport(year);
    
    // Extract filePath from the result object
    const filePath = result.filePath || result;
    
    console.log(`Generated report file path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Generated file not found: ${filePath}`);
      return res.status(500).json({ error: "Report file not found after generation" });
    }

    // Set proper headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="annual_report_${year}.pdf"`);

    // Download the file
    res.download(filePath, `annual_report_${year}.pdf`, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error sending report" });
        }
      } else {
        console.log(`Report for ${year} downloaded successfully`);
      }
    });
  } catch (error) {
    console.error("Report generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate report", details: error.message });
    }
  }
});

module.exports = router;