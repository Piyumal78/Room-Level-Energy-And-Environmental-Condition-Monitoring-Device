const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { fetchEnvironmentalData, fetchEnergyData, calculateTotalsAndAverages } = require('../services/envAggregate');

// Function to generate annual report
async function generateAnnualReport(year) {
  try {
    console.log(`Starting annual report generation for year: ${year}`);
    
    const envData = await fetchEnvironmentalData(year);
    const powerData = await fetchEnergyData(year);
    
    console.log(`Fetched ${envData.length} environmental records and ${powerData.length} power records`);
    
    const envSummary = calculateTotalsAndAverages(envData);

    // Aggregate power data with improved field handling
    let totalPower = 0;
    let averagePower = 0;
    if (powerData.length > 0) {
      powerData.forEach(item => {
        totalPower += item.power || item.Power || 0;
      });
      averagePower = totalPower / powerData.length;
    }

    // Calculate additional metrics
    const metrics = {
      totalRecords: envData.length + powerData.length,
      dataQuality: envData.length > 0 ? ((envData.length / (365 * 24 * 30)) * 100).toFixed(1) : 0, // Assuming 2-minute intervals
      powerEfficiency: averagePower < 100 ? 'Excellent' : averagePower < 150 ? 'Good' : 'Needs Improvement'
    };

    console.log('Calculated metrics:', { envSummary, totalPower: totalPower.toFixed(2), averagePower: averagePower.toFixed(2), metrics });

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `annual-report-${year}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    
    console.log(`Creating PDF at: ${filePath}`);

    // --- Cover Page ---
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fill('#1e3a8a')
      .fillColor('white')
      .fontSize(32)
      .text('Annual Energy & Environmental Report', { align: 'center', valign: 'center' })
      .moveDown(2)
      .fontSize(20)
      .text(`${year}`, { align: 'center' })
      .moveDown(10)
      .fontSize(14)
      .text('Prepared by AudITFlow', { align: 'center' });
    doc.addPage();

    // --- Environmental Data Section ---
    doc
      .fillColor('#1e3a8a')
      .fontSize(22)
      .text('Environmental Data Summary (Collection1)', { underline: true })
      .moveDown(1)
      .fillColor('black')
      .fontSize(14)
      .text(`Data Points Collected: ${envData.length}`, { indent: 20 })
      .text(`Average Temperature: ${envSummary.averages.Temperature.toFixed(2)} °C`, { indent: 20 })
      .text(`Average Humidity: ${envSummary.averages.Humidity.toFixed(2)} %`, { indent: 20 })
      .text(`Average Light Intensity: ${envSummary.averages.Light.toFixed(2)} lux`, { indent: 20 })
      .moveDown(2);

    // --- Power Data Section ---
    doc
      .fillColor('#047857')
      .fontSize(22)
      .text('Energy Data Summary (Every2Seconds)', { underline: true })
      .moveDown(1)
      .fillColor('black')
      .fontSize(14)
      .text(`Power Data Points: ${powerData.length}`, { indent: 20 })
      .text(`Total Power Consumption: ${totalPower.toFixed(2)} W`, { indent: 20 })
      .text(`Average Power: ${averagePower.toFixed(2)} W`, { indent: 20 })
      .text(`Power Efficiency Rating: ${metrics.powerEfficiency}`, { indent: 20 })
      .moveDown(2);

    // --- Data Quality Section ---
    doc
      .fillColor('#7c3aed')
      .fontSize(22)
      .text('Data Quality & Analytics', { underline: true })
      .moveDown(1)
      .fillColor('black')
      .fontSize(14)
      .text(`Total Records Processed: ${metrics.totalRecords}`, { indent: 20 })
      .text(`Data Coverage: ${metrics.dataQuality}% of expected readings`, { indent: 20 })
      .text(`Environmental Records: ${envData.length}`, { indent: 20 })
      .text(`Power Records: ${powerData.length}`, { indent: 20 })
      .moveDown(2);

    // --- Table Example ---
    doc
      .fillColor('#1e3a8a')
      .fontSize(18)
      .text('Summary Table', { underline: true })
      .moveDown(1)
      .fillColor('black')
      .fontSize(12);

    // Table headers
    doc.text('Metric', 70, doc.y, { continued: true, width: 150, underline: true });
    doc.text('Value', 250, doc.y, { underline: true });
    doc.moveDown(0.5);

    // Table rows
    doc.text('Average Temperature', 70, doc.y, { continued: true, width: 150 });
    doc.text(`${envSummary.averages.Temperature.toFixed(2)} °C`, 250, doc.y);
    doc.text('Average Humidity', 70, doc.y, { continued: true, width: 150 });
    doc.text(`${envSummary.averages.Humidity.toFixed(2)} %`, 250, doc.y);
    doc.text('Average Light', 70, doc.y, { continued: true, width: 150 });
    doc.text(`${envSummary.averages.Light.toFixed(2)} lux`, 250, doc.y);
    doc.text('Total Power Consumption', 70, doc.y, { continued: true, width: 150 });
    doc.text(`${totalPower.toFixed(2)} kWh`, 250, doc.y);

    doc.moveDown(2);

    // --- Footer ---
    doc
      .fontSize(10)
      .fillColor('gray')
      .text('© ' + new Date().getFullYear() + ' AudITFlow | Confidential', 50, doc.page.height - 50, {
        align: 'center',
        width: doc.page.width - 100
      });

    // Remove the duplicate doc.end() call here - it will be called in the Promise below

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      
      stream.on('close', () => {
        console.log(`Annual report generated successfully: ${filePath}`);
        resolve({ filePath });
      });
      
      stream.on('error', (err) => {
        console.error(`Error writing PDF file: ${err}`);
        reject(err);
      });
      
      doc.on('error', (err) => {
        console.error(`Error generating PDF: ${err}`);
        reject(err);
      });
      
      // Pipe the PDF to the file stream
      doc.pipe(stream);
      
      // Finalize the PDF document
      doc.end();
    });
  } catch (error) {
    console.error('Error generating annual report:', error);
    throw error;
  }
}

module.exports = { generateAnnualReport };