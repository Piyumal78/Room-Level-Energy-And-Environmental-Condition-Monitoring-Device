const { db } = require("../firebase");
const {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
} = require("firebase/firestore");

// Fetch latest environmental data from Firestore
const fetchData = async () => {
  try {
    const q = query(
      collection(db, "environmentalData"),
      orderBy("Timestamp", "desc"),
      limit(1),
      where("isDeleted", "==", false)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => doc.data());

    if (data.length === 0) {
      console.log("No documents found.");
    } else {
      console.log(data);
    }

    return data;
  } catch (error) {
    console.error("Error fetching data: ", error);
    return [];
  }
};

// Function to fetch environmental data from the database
async function fetchEnvironmentalData(year) {
  const envCollection = collection(db, "testbymonth");
  const snapshot = await getDocs(envCollection);

  const data = snapshot.docs
    .map((doc) => doc.data())
    .filter((event) => {
      const eventDate = new Date(event.Timestamp);
      return eventDate.getFullYear() === year;
    });

  return data;
}

// Function to aggregate energy data
async function fetchEnergyData(year) {
  const powerCollection = collection(db, "powerData");
  const snapshot = await getDocs(powerCollection);

  const data = snapshot.docs
    .map((doc) => doc.data())
    .filter((event) => {
      const eventDate = new Date(event.createdAt.toDate());
      return eventDate.getFullYear() === year;
    });

  return data;
}

// Function to calculate totals and averages
function calculateTotalsAndAverages(data) {
  const totals = {
    Light: 0,
    Humidity: 0,
    Temperature: 0,
    count: 0,
  };

  data.forEach((event) => {
    totals.Light += event.Light || 0;
    totals.Humidity += event.Humidity || 0;
    totals.Temperature += event.Temperature || 0;
    totals.count++;
  });

  const averages = {
    Light: totals.count ? totals.Light / totals.count : 0,
    Humidity: totals.count ? totals.Humidity / totals.count : 0,
    Temperature: totals.count ? totals.Temperature / totals.count : 0,
  };

  return { totals, averages };
}

// Export functions for use in annualReportGenerator.js
module.exports = {
  fetchEnvironmentalData,
  fetchEnergyData,
  calculateTotalsAndAverages,
};
module.exports = fetchData;

// Export functions for use in annualReportGenerator.js
module.exports = {
  fetchEnvironmentalData,
  fetchEnergyData,
  calculateTotalsAndAverages,
};
