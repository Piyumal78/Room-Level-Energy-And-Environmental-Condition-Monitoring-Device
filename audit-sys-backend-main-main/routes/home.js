const express = require("express");
const { db } = require("../firebase");
const {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  Timestamp,
  query,
  where,
} = require("firebase/firestore");
const router = express.Router();
const nodemailer = require('nodemailer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const csv = require('csv-parser');
const { getDatabase, ref, get } = require("firebase/database");
const { generateAnnualReport } = require('../Report/AnnualReportGenerator');
const axios = require('axios');


// Download report route
router.get("/download-report/:year", (req, res) => {
  const year = req.params.year;
  const filePath = `annual_report_${year}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('Report not found.');
    }
    res.download(filePath, (downloadErr) => {
      if (downloadErr) {
        console.error('Error downloading file:', downloadErr);
        res.status(500).send('Error downloading file.');
      }
    });
  });
});

// Add this route to your router
router.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          // Optionally add these if you want ranking on openrouter.ai:
          // "HTTP-Referer": "<YOUR_SITE_URL>",
          // "X-Title": "<YOUR_SITE_NAME>",
        },
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error("Chatbot error:", error.response?.data || error.message);
    res.status(500).json({ error: "Chatbot error" });
  }
});

router.get("/chat", (req, res) => {
  res.send("Chat endpoint is working. Use POST to interact.");
});



router.get("/latest", async (req, res) => {
  try {
    const db = getDatabase(app);
    const [temperature, humidity, lightIntensity, power, environmentalData] = await Promise.all([
      get(ref(db, "latest/temperature")),
      get(ref(db, "latest/humidity")),
      get(ref(db, "latest/lightIntensity")),
      get(ref(db, "latest/power")),
      get(ref(db, "latest/environmentalData")),
    ]);
    res.json({
      temperature: temperature.val(),
      humidity: humidity.val(),
      lightIntensity: lightIntensity.val(),
      power: power.val(),
      environmentalData: environmentalData.exists()
        ? environmentalData.val()
        : { Timestamp: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.post("/generate-annual-report", async (req, res) => {
  try {
    const report = await generateAnnualReport();
    res.status(200).json({ message: "Annual report generated successfully", report });
  } catch (error) {
    console.error("Error generating annual report: ", error);
    res.status(500).send("Error generating annual report: " + error.message);
  }
});

//import functions
const fetchData = require("../services/envAggregate.js");

// Email configuration from .env
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host/port/secure if not Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Thresholds from .env
const THRESHOLDS = {
  Temperature: Number(process.env.THRESHOLD_TEMPERATURE) || 30,
  Humidity: Number(process.env.THRESHOLD_HUMIDITY) || 80,
  Power: Number(process.env.THRESHOLD_POWER) || 1000,
};

// Helper to send alert email
async function sendAlertEmail(alerts, recipient) {
  const mailOptions = {
    from: `"Env Monitor Alerts" <${process.env.EMAIL_USER}>`,
    to: recipient || process.env.NOTIFY_EMAIL,
    subject: 'Environmental Threshold Alert',
    text: `Attention:\n\nThe following environmental thresholds have been exceeded:\n\n${alerts.join('\n')}\n\nPlease take necessary actions.`,
  };
  await transporter.sendMail(mailOptions);
}

//user authentication section-----
// register user
router.post("/register-user", async (req, res) => {
  try {
    const data = {
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      createdAt: new Date().toISOString(),
    };

    const response = await addDoc(collection(db, "users"), data);
    res.status(200).send("Document created successfully");
  } catch (error) {
    console.error("Error creating document: ", error);
    res.status(500).send("Error creating document: " + error);
  }
});

// login user
router.post("/login-user", async (req, res) => {
  try {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const user = users.find(
      (user) =>
        user.email === req.body.email && user.password === req.body.password
    );

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error getting documents: ", error);
    res.status(500).send("Error getting documents: " + error.message);
  }
});
// ------------------------------

//post sample power data
router.post("/power-data", async (req, res) => {
  try {
    const { power, voltage, current } = req.body;

    // Validate required fields
    if (typeof power !== 'number' || typeof voltage !== 'number' || typeof current !== 'number') {
      return res.status(400).send("Invalid input: power, voltage, and current must be numbers.");
    }

    const data = {
      power,
      voltage,
      current,
      createdAt: Timestamp.fromDate(new Date()),
    };

    // Check threshold and send email if exceeded
    let alerts = [];
    if (typeof data.power === 'number' && data.power > THRESHOLDS.Power) {
      alerts.push(`Power usage exceeded threshold: ${data.power}W (limit: ${THRESHOLDS.Power}W)`);
    }
    if (alerts.length > 0) {
      await sendAlertEmail(alerts, req.body.email);
    }

    await addDoc(collection(db, "powerData"), data);
    res.status(200).send("Document created successfully");
  } catch (error) {
    console.error("Error creating document: ", error);
    res.status(500).send("Error creating document: " + error);
  }
});

//post sample environmental data
router.post("/environmental-data", async (req, res) => {
  try {
    const data = {
      Temperature: req.body.Temperature,
      Humidity: req.body.Humidity,
      Light: req.body.Light,
      Timestamp: req.body.Timestamp,
    };

    // Check thresholds and send email if exceeded
    let alerts = [];
    if (typeof data.Temperature === 'number' && data.Temperature > THRESHOLDS.Temperature) {
      alerts.push(`Temperature exceeded threshold: ${data.Temperature}°C (limit: ${THRESHOLDS.Temperature}°C)`);
    }
    if (typeof data.Humidity === 'number' && data.Humidity > THRESHOLDS.Humidity) {
      alerts.push(`Humidity exceeded threshold: ${data.Humidity}% (limit: ${THRESHOLDS.Humidity}%)`);
    }
    if (alerts.length > 0) {
      await sendAlertEmail(alerts, req.body.email);
    }

    await addDoc(collection(db, "testbymonth"), data);
    res.status(200).send("Document created successfully");
  } catch (error) {
    console.error("Error creating document: ", error);
    res.status(500).send("Error creating document: " + error);
  }
});

// Get all documents from the 'users' collection
router.get("/get-data", async (req, res) => {
  try {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error("Error getting documents: ", error);
    res.status(500).send("Error getting documents: " + error.message);
  }
});

router.get("/events", async (req, res) => {
  const month = req.query.month;
  const year = req.query.year;

  try {
    const envCollection = collection(db, "testbymonth");
    const snapshot = await getDocs(envCollection);

    const events = snapshot.docs
      .map((doc) => doc.data())
      .filter((event) => {
        const eventDate = new Date(event.Timestamp);
        const eventMonth = eventDate.getMonth() + 1;
        const eventYear = eventDate.getFullYear();

        //pass only the events that match the month and year
        return eventMonth === parseInt(month) && eventYear === parseInt(year);
      });
    if (events.length === 0) {
      return res
        .status(404)
        .send("No events found for the specified month of year " + year);
    }

    // Calculate total of each parameter for given month
    const total = events.reduce(
      (acc, event) => {
        acc.Light += event.Light;
        acc.Humidity += event.Humidity;
        acc.Temperature += event.Temperature;
        return acc;
      },
      { Light: 0, Humidity: 0, Temperature: 0 }
    );

    //calculate average of each parameter for given month
    const monthlyAverages = {
      Light: total.Light / events.length,
      Humidity: total.Humidity / events.length,
      Temperature: total.Temperature / events.length,
    };

    const eventsForWeekAvg = snapshot.docs
      .map((doc) => doc.data())
      .filter((document) => {
        const eventDate = new Date(document.Timestamp);
        const eventMonth = eventDate.getMonth() + 1;
        const eventYear = eventDate.getFullYear();
        return eventMonth === parseInt(month) && eventYear === parseInt(year);
      });

    if (eventsForWeekAvg.length === 0) {
      return res.status(404).send("No events found for the specified month");
    }

    const week1 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week2 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week3 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week4 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };

    eventsForWeekAvg.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const week = Math.ceil(eventDate.getDate() / 7);

      const weeks = [week1, week2, week3, week4];
      if (week >= 1 && week <= 4) {
        weeks[week - 1].Light += event.Light;
        weeks[week - 1].Humidity += event.Humidity;
        weeks[week - 1].Temperature += event.Temperature;
        weeks[week - 1].count++;
      }
    });

    const weekNo = [week1, week2, week3, week4];
    const weeklyAverages = {};

    weekNo.forEach((week, index) => {
      weeklyAverages[`week${index + 1}`] = {
        Light: week.count ? week.Light / week.count : 0,
        Humidity: week.count ? week.Humidity / week.count : 0,
        Temperature: week.count ? week.Temperature / week.count : 0,
      };
    });


    // calculate average of each parameter for each month

    const avgerageOfeachMonth = snapshot.docs
      .map((doc) => doc.data())
      .filter((document) => {
        const eventDate = new Date(document.Timestamp);
        const eventYear = eventDate.getFullYear();
        return eventYear === parseInt(year);
      });

    if (avgerageOfeachMonth.length === 0) {
      return res.status(404).send("No events found for the specified year");
    }

    const months = Array.from({ length: 12 }, () => ({
      Light: 0,
      Humidity: 0,
      Temperature: 0,
      count: 0,
    }));

    const [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec] = months;

    avgerageOfeachMonth.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const month = eventDate.getMonth();

      const months = [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec];
      if (month >= 0 && month <= 11) {
        months[month].Light += event.Light;
        months[month].Humidity += event.Humidity;
        months[month].Temperature += event.Temperature;
        months[month].count++;
      }
    });

    const monthNo = [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec];
    const monthlyAveragesOfEachMonth = {};

    monthNo.forEach((month, index) => {
      monthlyAveragesOfEachMonth[`month${index + 1}`] = {
        Light: month.count ? month.Light / month.count : 0,
        Humidity: month.count ? month.Humidity / month.count : 0,
        Temperature: month.count ? month.Temperature / month.count : 0,
      };
    });

    res.status(200).json({ monthlyAverages, weeklyAverages, monthlyAveragesOfEachMonth });
  } catch (error) {
    console.error("Error fetching events: ", error);
    res.status(500).send("Error fetching events: " + error.message);
  }
});

// New route for weekly averages
router.get("/weekly-averages", async (req, res) => {
  try {
    const envCollection = collection(db, "testbymonth");
    const snapshot = await getDocs(envCollection);

    const events = snapshot.docs.map((doc) => doc.data());

    const week1 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week2 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week3 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };
    const week4 = { Light: 0, Humidity: 0, Temperature: 0, count: 0 };

    events.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const week = Math.ceil(eventDate.getDate() / 7);

      const weeks = [week1, week2, week3, week4];
      if (week >= 1 && week <= 4) {
        weeks[week - 1].Light += event.Light;
        weeks[week - 1].Humidity += event.Humidity;
        weeks[week - 1].Temperature += event.Temperature;
        weeks[week - 1].count++;
      }
    });

    const weekNo = [week1, week2, week3, week4];
    const weeklyAverages = {};

    weekNo.forEach((week, index) => {
      weeklyAverages[`week${index + 1}`] = {
        Light: week.count ? week.Light / week.count : 0,
        Humidity: week.count ? week.Humidity / week.count : 0,
        Temperature: week.count ? week.Temperature / week.count : 0,
      };
    });

    res.status(200).json(weeklyAverages);
  } catch (error) {
    console.error("Error fetching weekly averages: ", error);
    res.status(500).send("Error fetching weekly averages: " + error.message);
  }
});

// New route for monthly averages
router.get("/monthly-averages", async (req, res) => {
  try {
    const envCollection = collection(db, "testbymonth");
    const snapshot = await getDocs(envCollection);

    const events = snapshot.docs.map((doc) => doc.data());

    const months = Array.from({ length: 12 }, () => ({
      Light: 0,
      Humidity: 0,
      Temperature: 0,
      count: 0,
    }));

    const [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec] = months;

    events.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const month = eventDate.getMonth();

      const months = [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec];
      if (month >= 0 && month <= 11) {
        months[month].Light += event.Light;
        months[month].Humidity += event.Humidity;
        months[month].Temperature += event.Temperature;
        months[month].count++;
      }
    });

    const monthNo = [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec];
    const monthlyAveragesOfEachMonth = {};

    monthNo.forEach((month, index) => {
      monthlyAveragesOfEachMonth[`month${index + 1}`] = {
        Light: month.count ? month.Light / month.count : 0,
        Humidity: month.count ? month.Humidity / month.count : 0,
        Temperature: month.count ? month.Temperature / month.count : 0,
      };
    });

    res.status(200).json(monthlyAveragesOfEachMonth);
  } catch (error) {
    console.error("Error fetching monthly averages: ", error);
    res.status(500).send("Error fetching monthly averages: " + error.message);
  }
});

// Get all data for a specific month
router.get("/data-for-month", async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).send("Year and month are required");
  }

  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all data for a specific month
    const q = query(
      collection(db, "environmentalData"),
      where("Timestamp", ">=", startOfMonth),
      where("Timestamp", "<=", endOfMonth)
    );
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => doc.data());

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching data for month: ", error);
    res.status(500).send("Error fetching data for month: " + error.message);
  }
});

// // fetch data once a week and pass it to the aggregate function
// setInterval(async () => {
//   try {
//     data = await fetchData();
//     console.log(data);
//   } catch (error) {}
// }, 2000);

module.exports = router;
