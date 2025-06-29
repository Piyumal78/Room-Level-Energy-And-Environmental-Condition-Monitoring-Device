const PDFDocument = require('pdfkit');
const fs = require('fs');
const { fetchEnvironmentalData, fetchEnergyData, calculateTotalsAndAverages } = require('../services/envAggregate');

// Function to generate annual report
async function generateAnnualReport(year) {
  const envData = await fetchEnvironmentalData(year);
  const powerData = await fetchEnergyData(year);
  const envSummary = calculateTotalsAndAverages(envData);

  // Aggregate power data
  let totalPower = 0;
  powerData.forEach(item => {
    totalPower += item.power || 0;
  });

  // Create PDF
  const doc = new PDFDocument({ margin: 50 });
  const filePath = `annual_report_${year}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));

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
    .text('Environmental Data Summary', { underline: true })
    .moveDown(1)
    .fillColor('black')
    .fontSize(14)
    .text(`Average Temperature: ${envSummary.averages.Temperature.toFixed(2)} °C`, { indent: 20 })
    .text(`Average Humidity: ${envSummary.averages.Humidity.toFixed(2)} %`, { indent: 20 })
    .text(`Average Light: ${envSummary.averages.Light.toFixed(2)} lux`, { indent: 20 })
    .moveDown(2);

  // --- Power Data Section ---
  doc
    .fillColor('#047857')
    .fontSize(22)
    .text('Energy Data Summary', { underline: true })
    .moveDown(1)
    .fillColor('black')
    .fontSize(14)
    .text(`Total Power Consumption: ${totalPower.toFixed(2)} kWh`, { indent: 20 })
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

  doc.end(); // This is required!

  return { filePath };
}



module.exports = { generateAnnualReport };