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

// Function to fetch environmental data from collection1
async function fetchEnvironmentalData(year) {
  const envCollection = collection(db, "collection1"); // Updated to collection1
  const snapshot = await getDocs(envCollection);

  const data = snapshot.docs
    .map((doc) => doc.data())
    .filter((event) => {
      // Handle both timestamp formats
      const timestamp = event.timestamp || event.Timestamp;
      if (!timestamp) return false;
      
      const eventDate = new Date(timestamp);
      return eventDate.getFullYear() === year;
    });

  return data;
}

// Function to aggregate energy data from Every2Seconds collection
async function fetchEnergyData(year) {
  const powerCollection = collection(db, "Every2Seconds"); // Updated to Every2Seconds
  const snapshot = await getDocs(powerCollection);

  const data = snapshot.docs
    .map((doc) => doc.data())
    .filter((event) => {
      // Handle both timestamp formats
      const timestamp = event.Timestamp || event.timestamp || event.createdAt;
      if (!timestamp) return false;
      
      let eventDate;
      if (timestamp.toDate) {
        eventDate = timestamp.toDate(); // Firestore timestamp
      } else {
        eventDate = new Date(timestamp); // ISO string or regular date
      }
      
      return eventDate.getFullYear() === year;
    });

  return data;
}

// Function to calculate totals and averages with field name flexibility
function calculateTotalsAndAverages(data) {
  const totals = {
    Light: 0,
    Humidity: 0,
    Temperature: 0,
    count: 0,
  };

  data.forEach((event) => {
    // Handle both capitalized and lowercase field names
    totals.Light += event.Light || event.light || event.lux || 0;
    totals.Humidity += event.Humidity || event.humidity || 0;
    totals.Temperature += event.Temperature || event.temperature || 0;
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
  fetchData,
  fetchEnvironmentalData,
  fetchEnergyData,
  calculateTotalsAndAverages,
};
