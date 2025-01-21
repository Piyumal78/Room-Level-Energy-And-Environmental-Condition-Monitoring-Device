const express = require("express");
const { db } = require("../firebase");
const {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  Timestamp,
} = require("firebase/firestore");
const router = express.Router();

//import functions
const fetchData = require("../services/envAggregate.js");

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

// ------------------------------

//post sample power data
router.post("/power-data", async (req, res) => {
  try {
    const powerData = req.body; // Assuming the object is sent in the request body

    const document = {
      Current: powerData.Current,
      Power: powerData.Power,
      PowerFactor: powerData.PowerFactor,
      Timestamp: powerData.Timestamp,
      Voltage: powerData.Voltage,
    };

    await addDoc(collection(db, "Every2Seconds"), document);
    res.status(200).send("Document created successfully");
  } catch (error) {
    console.error("Error creating document: ", error);
    res.status(500).send("Error creating document: " + error);
  }
});

// post set of sample power data
router.post("/power-data-set", async (req, res) => {
  try {
    const powerDataArray = req.body.powerDataArray; // Assuming the array is sent in the request body with this key

    const promises = powerDataArray.map(async (data) => {
      const document = {
        power: data.power,
        voltage: data.voltage,
        current: data.current,
        Timestamp: data.Timestamp,
      };
      return addDoc(collection(db, "Every2Minutes"), document);
    });

    await Promise.all(promises);
    res.status(200).send("Documents created successfully");
  } catch (error) {
    console.error("Error creating documents: ", error);
    res.status(500).send("Error creating documents: " + error);
  }
});

//post sample environmental data
router.post("/environmental-data", async (req, res) => {
  try {
    const environmentalData = req.body; // Assuming the object is sent in the request body

    const document = {
      Temperature: environmentalData.Temperature,
      Humidity: environmentalData.Humidity,
      Light: environmentalData.Light,
      Timestamp: environmentalData.Timestamp,
    };

    await addDoc(collection(db, "collection1"), document);
    res.status(200).send("Document created successfully");
  } catch (error) {
    console.error("Error creating document: ", error);
    res.status(500).send("Error creating document: " + error);
  }
});

//post set of environmental data
router.post("/environmental-data-set", async (req, res) => {
  try {
    const environmentalDataArray = req.body.environmentalDataArray; // Assuming the array is sent in the request body with this key

    const promises = environmentalDataArray.map(async (data) => {
      const document = {
        Temperature: data.Temperature,
        Humidity: data.Humidity,
        Light: data.Light,
        Timestamp: data.Timestamp,
      };
      return addDoc(collection(db, "collection1"), document);
    });

    await Promise.all(promises);
    res.status(200).send("Documents created successfully");
  } catch (error) {
    console.error("Error creating documents: ", error);
    res.status(500).send("Error creating documents: " + error);
  }
});
// //send annual report
// router.get("/annual-energy-report", async ()=>{
//   const year = req.query.year;
// try {
  
// } catch (error) {
  
// }
// })


router.get("/events", async (req, res) => {
  const month = req.query.month;
  const year = req.query.year;

  try {
    // Fetch data from collections
    const envCollection = collection(db, "collection1");
    const powerCollection = collection(db, "Every2Minutes");
    const snapshot = await getDocs(envCollection);
    const powerSnapshot = await getDocs(powerCollection);

    // Process environmental events (Light, Humidity, Temperature)
    const events = snapshot.docs
      .map((doc) => doc.data())
      .filter((event) => {
        const eventDate = new Date(event.Timestamp);
        const eventMonth = eventDate.getMonth() + 1;
        const eventYear = eventDate.getFullYear();
        return eventMonth === parseInt(month) && eventYear === parseInt(year);
      });

    if (events.length === 0) {
      return res.status(404).send("No events found for the specified month of year " + year);
    }

    // Calculate totals for environmental parameters
    const total = events.reduce(
      (acc, event) => {
        acc.Light += event.Light;
        acc.Humidity += event.Humidity;
        acc.Temperature += event.Temperature;
        return acc;
      },
      { Light: 0, Humidity: 0, Temperature: 0 }
    );

    // Calculate monthly averages for environmental parameters
    const monthlyAverages = {
      Light: total.Light / events.length,
      Humidity: total.Humidity / events.length,
      Temperature: total.Temperature / events.length,
    };

    // Calculate weekly averages for environmental parameters
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

    // Process power events (Current, Power, Voltage)
    const powerEvents = powerSnapshot.docs
      .map((doc) => doc.data())
      .filter((event) => {
        const eventDate = new Date(event.Timestamp);
        const eventMonth = eventDate.getMonth() + 1;
        const eventYear = eventDate.getFullYear();
        return eventMonth === parseInt(month) && eventYear === parseInt(year);
      });

    if (powerEvents.length === 0) {
      return res.status(404).send("No power events found for the specified month of year " + year);
    }

    // Calculate totals for power parameters (Current, Power, Voltage)
    const powerTotal = powerEvents.reduce(
      (acc, event) => {
        acc.Current += event.current;
        acc.Power += event.power;
        acc.Voltage += event.voltage;
        return acc;
      },
      { Current: 0, Power: 0, Voltage: 0 }
    );

    // Calculate monthly averages for power parameters
    const powerMonthlyAverages = {
      Current: powerTotal.Current / powerEvents.length,
      Power: powerTotal.Power / powerEvents.length,
      Voltage: powerTotal.Voltage / powerEvents.length,
    };

    // Calculate weekly averages for power parameters
    const powerWeek1 = { Current: 0, Power: 0, Voltage: 0, count: 0 };
    const powerWeek2 = { Current: 0, Power: 0, Voltage: 0, count: 0 };
    const powerWeek3 = { Current: 0, Power: 0, Voltage: 0, count: 0 };
    const powerWeek4 = { Current: 0, Power: 0, Voltage: 0, count: 0 };

    powerEvents.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const week = Math.ceil(eventDate.getDate() / 7);
      const weeks = [powerWeek1, powerWeek2, powerWeek3, powerWeek4];
      if (week >= 1 && week <= 4) {
        weeks[week - 1].Current += event.current;
        weeks[week - 1].Power += event.power;
        weeks[week - 1].Voltage += event.voltage;
        weeks[week - 1].count++;
      }
    });

    const powerWeekNo = [powerWeek1, powerWeek2, powerWeek3, powerWeek4];
    const powerWeeklyAverages = {};

    powerWeekNo.forEach((week, index) => {
      powerWeeklyAverages[`week${index + 1}`] = {
        Current: week.count ? week.Current / week.count : 0,
        Power: week.count ? week.Power / week.count : 0,
        Voltage: week.count ? week.Voltage / week.count : 0,
      };
    });

    // Calculate average of each parameter for each month for environmental data
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

    // Calculate average of each parameter for each month for power data
    const powerAverageOfEachMonth = powerSnapshot.docs
      .map((doc) => doc.data())
      .filter((document) => {
        const eventDate = new Date(document.Timestamp);
        const eventYear = eventDate.getFullYear();
        return eventYear === parseInt(year);
      });

    if (powerAverageOfEachMonth.length === 0) {
      return res.status(404).send("No power events found for the specified year");
    }

    const powerMonths = Array.from({ length: 12 }, () => ({
      Current: 0,
      Power: 0,
      Voltage: 0,
      count: 0,
    }));

    const [pJan, pFeb, pMar, pApr, pMay, pJun, pJul, pAug, pSep, pOct, pNov, pDec] = powerMonths;

    powerAverageOfEachMonth.forEach((event) => {
      const eventDate = new Date(event.Timestamp);
      const month = eventDate.getMonth();

      const powerMonths = [pJan, pFeb, pMar, pApr, pMay, pJun, pJul, pAug, pSep, pOct, pNov, pDec];
      if (month >= 0 && month <= 11) {
        powerMonths[month].Current += event.current;
        powerMonths[month].Power += event.power;
        powerMonths[month].Voltage += event.voltage;
        powerMonths[month].count++;
      }
    });

    const powerMonthNo = [pJan, pFeb, pMar, pApr, pMay, pJun, pJul, pAug, pSep, pOct, pNov, pDec];
    const powerMonthlyAveragesOfEachMonth = {};

    powerMonthNo.forEach((month, index) => {
      powerMonthlyAveragesOfEachMonth[`month${index + 1}`] = {
        Current: month.count ? month.Current / month.count : 0,
        Power: month.count ? month.Power / month.count : 0,
        Voltage: month.count ? month.Voltage / month.count : 0,
      };
    });

    // Return the combined response with environmental and power event data
    res.status(200).json({
      monthlyAverages,
      weeklyAverages,
      powerMonthlyAverages,
      powerWeeklyAverages,
      monthlyAveragesOfEachMonth,
      powerMonthlyAveragesOfEachMonth,
    });
  } catch (error) {
    console.error("Error fetching events: ", error);
    res.status(500).send("Error fetching events: " + error.message);
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
