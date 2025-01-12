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
// ------------------------------

//post sample power data
router.post("/power-data", async (req, res) => {
  try {
    const data = {
      power: req.body.power,
      voltage: req.body.voltage,
      current: req.body.current,
      createdAt: Timestamp.fromDate(new Date()),
    };

    const response = await addDoc(collection(db, "powerData"), data);
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

    const response = await addDoc(collection(db, "testbymonth"), data);
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

// // fetch data once a week and pass it to the aggregate function
// setInterval(async () => {
//   try {
//     data = await fetchData();
//     console.log(data);
//   } catch (error) {}
// }, 2000);

module.exports = router;
