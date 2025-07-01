// Re-export from the Report directory for backward compatibility
const { generateAnnualReport } = require('../Report/AnnualReportGenerator');

module.exports = { generateAnnualReport };
