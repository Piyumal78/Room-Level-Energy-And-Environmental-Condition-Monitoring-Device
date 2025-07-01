const { db } = require("../firebase");
const {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  Timestamp,
} = require("firebase/firestore");

// Helper function to convert various timestamp formats to Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
};

// Helper function to safely get field value with multiple possible field names
const getFieldValue = (item, fieldNames, defaultValue = 0) => {
  for (const fieldName of fieldNames) {
    if (item[fieldName] !== undefined && item[fieldName] !== null) {
      return Number(item[fieldName]) || defaultValue;
    }
  }
  return defaultValue;
};

// Fetch last 30 days environmental data from collection2
const fetchLast30DaysEnvironmentalData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log("Fetching environmental data from last 30 days...");
    
    // Try different timestamp field names
    const timestampFields = ["timestamp", "Timestamp", "createdAt", "date"];
    let data = [];

    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "collection2"),
          where(timestampField, ">=", Timestamp.fromDate(thirtyDaysAgo)),
          orderBy(timestampField, "desc")
        );

        const snapshot = await getDocs(q);
        data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: convertTimestamp(doc.data()[timestampField]),
        }));

        if (data.length > 0) {
          console.log(`Found ${data.length} environmental records using ${timestampField} field`);
          break;
        }
      } catch (error) {
        console.log(`Failed to query environmental data with ${timestampField}:`, error.message);
        continue;
      }
    }

    // If no data found with timestamp queries, get latest records
    if (data.length === 0) {
      console.log("No timestamped data found, fetching latest records...");
      const fallbackQuery = query(collection(db, "collection2"));
      const snapshot = await getDocs(fallbackQuery);
      data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(),
      }));
    }

    return data;
  } catch (error) {
    console.error("Error fetching environmental data:", error);
    return [];
  }
};

// Fetch last 30 days power data from Every2Seconds
const fetchLast30DaysPowerData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log("Fetching power data from last 30 days...");
    
    // Try different timestamp field names
    const timestampFields = ["Timestamp", "timestamp", "createdAt", "date"];
    let data = [];

    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "Every2Seconds"),
          where(timestampField, ">=", Timestamp.fromDate(thirtyDaysAgo)),
          orderBy(timestampField, "desc")
        );

        const snapshot = await getDocs(q);
        data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: convertTimestamp(doc.data()[timestampField]),
        }));

        if (data.length > 0) {
          console.log(`Found ${data.length} power records using ${timestampField} field`);
          break;
        }
      } catch (error) {
        console.log(`Failed to query power data with ${timestampField}:`, error.message);
        continue;
      }
    }

    // If no data found with timestamp queries, get latest records
    if (data.length === 0) {
      console.log("No timestamped power data found, fetching latest records...");
      const fallbackQuery = query(collection(db, "Every2Seconds"));
      const snapshot = await getDocs(fallbackQuery);
      data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(),
      }));
    }

    return data;
  } catch (error) {
    console.error("Error fetching power data:", error);
    return [];
  }
};

// Calculate analytics for last 30 days
const calculateLast30DaysAnalytics = async () => {
  try {
    console.log("Calculating last 30 days analytics...");
    
    const [environmentalData, powerData] = await Promise.all([
      fetchLast30DaysEnvironmentalData(),
      fetchLast30DaysPowerData()
    ]);

    // Environmental data analytics
    const envAnalytics = {
      totalRecords: environmentalData.length,
      avgTemperature: 0,
      avgHumidity: 0,
      avgLightIntensity: 0,
      maxTemperature: 0,
      minTemperature: 100,
      maxHumidity: 0,
      minHumidity: 100,
      temperatureTrend: [],
      humidityTrend: [],
      lightTrend: []
    };

    if (environmentalData.length > 0) {
      let tempSum = 0, humiditySum = 0, lightSum = 0;
      
      environmentalData.forEach(item => {
        const temp = getFieldValue(item, ['temperature', 'Temperature'], 0);
        const humidity = getFieldValue(item, ['humidity', 'Humidity'], 0);
        const light = getFieldValue(item, ['lux', 'light', 'Light'], 0);
        
        tempSum += temp;
        humiditySum += humidity;
        lightSum += light;
        
        envAnalytics.maxTemperature = Math.max(envAnalytics.maxTemperature, temp);
        envAnalytics.minTemperature = Math.min(envAnalytics.minTemperature, temp);
        envAnalytics.maxHumidity = Math.max(envAnalytics.maxHumidity, humidity);
        envAnalytics.minHumidity = Math.min(envAnalytics.minHumidity, humidity);
      });

      envAnalytics.avgTemperature = Number((tempSum / environmentalData.length).toFixed(2));
      envAnalytics.avgHumidity = Number((humiditySum / environmentalData.length).toFixed(2));
      envAnalytics.avgLightIntensity = Number((lightSum / environmentalData.length).toFixed(2));
    }

    // Power data analytics
    const powerAnalytics = {
      totalRecords: powerData.length,
      avgPower: 0,
      maxPower: 0,
      minPower: 10000,
      totalEnergyConsumed: 0,
      powerTrend: [],
      dailyConsumption: []
    };

    if (powerData.length > 0) {
      let powerSum = 0;
      
      powerData.forEach(item => {
        const power = getFieldValue(item, ['power', 'Power'], 0);
        powerSum += power;
        
        powerAnalytics.maxPower = Math.max(powerAnalytics.maxPower, power);
        powerAnalytics.minPower = Math.min(powerAnalytics.minPower, power);
      });

      powerAnalytics.avgPower = Number((powerSum / powerData.length).toFixed(2));
      // Estimate total energy (assuming readings are every 2 seconds)
      powerAnalytics.totalEnergyConsumed = Number((powerSum * 2 / 3600).toFixed(2)); // Convert to Wh
    }

    // Group data by day for trends
    const dailyData = {};
    
    // Process environmental data by day
    environmentalData.forEach(item => {
      const day = item.timestamp.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          tempReadings: [],
          humidityReadings: [],
          lightReadings: [],
          powerReadings: []
        };
      }
      
      dailyData[day].tempReadings.push(getFieldValue(item, ['temperature', 'Temperature'], 0));
      dailyData[day].humidityReadings.push(getFieldValue(item, ['humidity', 'Humidity'], 0));
      dailyData[day].lightReadings.push(getFieldValue(item, ['lux', 'light', 'Light'], 0));
    });

    // Process power data by day
    powerData.forEach(item => {
      const day = item.timestamp.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          tempReadings: [],
          humidityReadings: [],
          lightReadings: [],
          powerReadings: []
        };
      }
      
      dailyData[day].powerReadings.push(getFieldValue(item, ['power', 'Power'], 0));
    });

    // Calculate daily averages for trends
    const sortedDays = Object.keys(dailyData).sort();
    sortedDays.forEach(day => {
      const dayData = dailyData[day];
      
      if (dayData.tempReadings.length > 0) {
        envAnalytics.temperatureTrend.push({
          date: day,
          value: Number((dayData.tempReadings.reduce((a, b) => a + b, 0) / dayData.tempReadings.length).toFixed(2))
        });
      }
      
      if (dayData.humidityReadings.length > 0) {
        envAnalytics.humidityTrend.push({
          date: day,
          value: Number((dayData.humidityReadings.reduce((a, b) => a + b, 0) / dayData.humidityReadings.length).toFixed(2))
        });
      }
      
      if (dayData.lightReadings.length > 0) {
        envAnalytics.lightTrend.push({
          date: day,
          value: Number((dayData.lightReadings.reduce((a, b) => a + b, 0) / dayData.lightReadings.length).toFixed(2))
        });
      }
      
      if (dayData.powerReadings.length > 0) {
        const avgPower = dayData.powerReadings.reduce((a, b) => a + b, 0) / dayData.powerReadings.length;
        powerAnalytics.powerTrend.push({
          date: day,
          value: Number(avgPower.toFixed(2))
        });
        
        // Daily consumption (assuming readings every 2 seconds)
        const dailyConsumption = dayData.powerReadings.reduce((a, b) => a + b, 0) * 2 / 3600; // Convert to Wh
        powerAnalytics.dailyConsumption.push({
          date: day,
          value: Number(dailyConsumption.toFixed(2))
        });
      }
    });

    // Calculate efficiency metrics
    const efficiency = {
      efficiencyScore: 0,
      co2Saved: 0,
      energySaved: 0,
      costSavings: 0
    };

    if (powerAnalytics.avgPower > 0) {
      // Calculate efficiency based on power consumption patterns
      const baselineConsumption = 100; // Watts (assumed baseline)
      const actualConsumption = powerAnalytics.avgPower;
      
      if (actualConsumption < baselineConsumption) {
        efficiency.efficiencyScore = Math.min(100, ((baselineConsumption - actualConsumption) / baselineConsumption * 100));
        efficiency.energySaved = (baselineConsumption - actualConsumption) * 24 * 30 / 1000; // kWh saved in 30 days
        efficiency.co2Saved = efficiency.energySaved * 0.5; // kg CO2 saved (0.5 kg CO2 per kWh)
        efficiency.costSavings = efficiency.energySaved * 0.12; // $0.12 per kWh
      }
    }

    return {
      environmental: envAnalytics,
      power: powerAnalytics,
      efficiency,
      summary: {
        totalEnvironmentalRecords: environmentalData.length,
        totalPowerRecords: powerData.length,
        dataRange: `${sortedDays[0] || 'N/A'} to ${sortedDays[sortedDays.length - 1] || 'N/A'}`,
        daysWithData: sortedDays.length
      }
    };

  } catch (error) {
    console.error("Error calculating analytics:", error);
    return {
      environmental: { totalRecords: 0, avgTemperature: 0, avgHumidity: 0, avgLightIntensity: 0 },
      power: { totalRecords: 0, avgPower: 0, totalEnergyConsumed: 0 },
      efficiency: { efficiencyScore: 0, co2Saved: 0, energySaved: 0, costSavings: 0 },
      summary: { totalEnvironmentalRecords: 0, totalPowerRecords: 0, dataRange: 'No data', daysWithData: 0 }
    };
  }
};

// Fetch monthly data for linear charts (last 6 months)
const fetchMonthlyChartData = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    console.log("Fetching monthly chart data...");
    
    // Fetch environmental data
    let environmentalData = [];
    let powerData = [];
    
    const timestampFields = ["timestamp", "Timestamp", "createdAt", "date"];
    
    // Fetch environmental data from collection2
    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "collection2"),
          where(timestampField, ">=", Timestamp.fromDate(sixMonthsAgo)),
          orderBy(timestampField, "desc")
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          environmentalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          break;
        }
      } catch (error) {
        console.log(`Failed to query with ${timestampField}, trying next field...`);
      }
    }
    
    // Fetch power data from Every2Seconds
    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "Every2Seconds"),
          where(timestampField, ">=", Timestamp.fromDate(sixMonthsAgo)),
          orderBy(timestampField, "desc")
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          powerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          break;
        }
      } catch (error) {
        console.log(`Failed to query power data with ${timestampField}, trying next field...`);
      }
    }
    
    // Group data by month
    const monthlyData = {};
    
    // Process environmental data
    environmentalData.forEach(item => {
      const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
      const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          date: new Date(timestamp.getFullYear(), timestamp.getMonth(), 1),
          temperature: [],
          humidity: [],
          lightIntensity: [],
          power: []
        };
      }
      
      const temp = getFieldValue(item, ["temperature", "Temperature", "temp"], null);
      const humidity = getFieldValue(item, ["humidity", "Humidity", "hum"], null);
      const light = getFieldValue(item, ["lightIntensity", "LightIntensity", "light", "lux"], null);
      
      if (temp !== null) monthlyData[monthKey].temperature.push(temp);
      if (humidity !== null) monthlyData[monthKey].humidity.push(humidity);
      if (light !== null) monthlyData[monthKey].lightIntensity.push(light);
    });
    
    // Process power data
    powerData.forEach(item => {
      const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
      const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          date: new Date(timestamp.getFullYear(), timestamp.getMonth(), 1),
          temperature: [],
          humidity: [],
          lightIntensity: [],
          power: []
        };
      }
      
      const power = getFieldValue(item, ["power", "Power", "watt", "watts"], null);
      if (power !== null) monthlyData[monthKey].power.push(power);
    });
    
    // Calculate monthly averages
    const monthlyAverages = Object.values(monthlyData)
      .map(month => ({
        month: month.month,
        date: month.date,
        avgTemperature: month.temperature.length > 0 ? month.temperature.reduce((a, b) => a + b, 0) / month.temperature.length : 0,
        avgHumidity: month.humidity.length > 0 ? month.humidity.reduce((a, b) => a + b, 0) / month.humidity.length : 0,
        avgLightIntensity: month.lightIntensity.length > 0 ? month.lightIntensity.reduce((a, b) => a + b, 0) / month.lightIntensity.length : 0,
        avgPower: month.power.length > 0 ? month.power.reduce((a, b) => a + b, 0) / month.power.length : 0,
        totalEnergyConsumption: month.power.length > 0 ? (month.power.reduce((a, b) => a + b, 0) * 24 * 30) / 1000 : 0 // kWh estimation
      }))
      .sort((a, b) => a.date - b.date);
    
    return monthlyAverages;
    
  } catch (error) {
    console.error("Error fetching monthly chart data:", error);
    return [];
  }
};

// Fetch weekly data for bar charts (last 12 weeks)
const fetchWeeklyChartData = async () => {
  try {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));
    
    console.log("Fetching weekly chart data...");
    
    // Fetch environmental data
    let environmentalData = [];
    let powerData = [];
    
    const timestampFields = ["timestamp", "Timestamp", "createdAt", "date"];
    
    // Fetch environmental data from collection2
    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "collection2"),
          where(timestampField, ">=", Timestamp.fromDate(twelveWeeksAgo)),
          orderBy(timestampField, "desc")
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          environmentalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          break;
        }
      } catch (error) {
        console.log(`Failed to query with ${timestampField}, trying next field...`);
      }
    }
    
    // Fetch power data from Every2Seconds
    for (const timestampField of timestampFields) {
      try {
        const q = query(
          collection(db, "Every2Seconds"),
          where(timestampField, ">=", Timestamp.fromDate(twelveWeeksAgo)),
          orderBy(timestampField, "desc")
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          powerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          break;
        }
      } catch (error) {
        console.log(`Failed to query power data with ${timestampField}, trying next field...`);
      }
    }
    
    // Helper function to get week number
    const getWeekKey = (date) => {
      const onejan = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
    };
    
    // Helper function to get start of week
    const getWeekStart = (date) => {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    };
    
    // Group data by week
    const weeklyData = {};
    
    // Process environmental data
    environmentalData.forEach(item => {
      const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
      const weekKey = getWeekKey(timestamp);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          weekStart: getWeekStart(timestamp),
          temperature: [],
          humidity: [],
          lightIntensity: [],
          power: []
        };
      }
      
      const temp = getFieldValue(item, ["temperature", "Temperature", "temp"], null);
      const humidity = getFieldValue(item, ["humidity", "Humidity", "hum"], null);
      const light = getFieldValue(item, ["lightIntensity", "LightIntensity", "light", "lux"], null);
      
      if (temp !== null) weeklyData[weekKey].temperature.push(temp);
      if (humidity !== null) weeklyData[weekKey].humidity.push(humidity);
      if (light !== null) weeklyData[weekKey].lightIntensity.push(light);
    });
    
    // Process power data
    powerData.forEach(item => {
      const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
      const weekKey = getWeekKey(timestamp);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          weekStart: getWeekStart(timestamp),
          temperature: [],
          humidity: [],
          lightIntensity: [],
          power: []
        };
      }
      
      const power = getFieldValue(item, ["power", "Power", "watt", "watts"], null);
      if (power !== null) weeklyData[weekKey].power.push(power);
    });
    
    // Calculate weekly averages and totals
    const weeklyAverages = Object.values(weeklyData)
      .map(week => ({
        week: week.week,
        weekStart: week.weekStart,
        weekLabel: `Week of ${week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        avgTemperature: week.temperature.length > 0 ? week.temperature.reduce((a, b) => a + b, 0) / week.temperature.length : 0,
        maxTemperature: week.temperature.length > 0 ? Math.max(...week.temperature) : 0,
        minTemperature: week.temperature.length > 0 ? Math.min(...week.temperature) : 0,
        avgHumidity: week.humidity.length > 0 ? week.humidity.reduce((a, b) => a + b, 0) / week.humidity.length : 0,
        maxHumidity: week.humidity.length > 0 ? Math.max(...week.humidity) : 0,
        minHumidity: week.humidity.length > 0 ? Math.min(...week.humidity) : 0,
        avgLightIntensity: week.lightIntensity.length > 0 ? week.lightIntensity.reduce((a, b) => a + b, 0) / week.lightIntensity.length : 0,
        maxLightIntensity: week.lightIntensity.length > 0 ? Math.max(...week.lightIntensity) : 0,
        minLightIntensity: week.lightIntensity.length > 0 ? Math.min(...week.lightIntensity) : 0,
        avgPower: week.power.length > 0 ? week.power.reduce((a, b) => a + b, 0) / week.power.length : 0,
        maxPower: week.power.length > 0 ? Math.max(...week.power) : 0,
        minPower: week.power.length > 0 ? Math.min(...week.power) : 0,
        totalEnergyConsumption: week.power.length > 0 ? (week.power.reduce((a, b) => a + b, 0) * 24 * 7) / 1000 : 0, // kWh estimation for the week
        dataPoints: {
          environmental: week.temperature.length + week.humidity.length + week.lightIntensity.length,
          power: week.power.length
        }
      }))
      .sort((a, b) => a.weekStart - b.weekStart);
    
    return weeklyAverages;
    
  } catch (error) {
    console.error("Error fetching weekly chart data:", error);
    return [];
  }
};

// Enhanced comprehensive analytics function for last 30 days
const getComprehensiveLast30DaysAnalytics = async () => {
  try {
    console.log("Starting comprehensive 30-day analytics calculation...");
    
    // Fetch data from both collections
    const environmentalData = await fetchLast30DaysEnvironmentalData();
    const powerData = await fetchLast30DaysPowerData();
    
    console.log(`Environmental data points: ${environmentalData.length}`);
    console.log(`Power data points: ${powerData.length}`);
    
    // Process environmental data with enhanced metrics
    const envAnalytics = processEnvironmentalAnalytics(environmentalData);
    const powerAnalytics = processPowerAnalytics(powerData);
    
    // Generate daily analytics for trends
    const dailyAnalytics = generateDailyAnalytics(environmentalData, powerData);
    
    // Calculate energy efficiency and insights
    const efficiency = calculateEnhancedEfficiencyMetrics(powerAnalytics, envAnalytics);
    
    // Generate insights and recommendations
    const insights = generateInsights(envAnalytics, powerAnalytics, dailyAnalytics);
    
    return {
      environmental: envAnalytics,
      power: powerAnalytics,
      efficiency,
      insights,
      dailyTrends: dailyAnalytics,
      summary: {
        totalEnvironmentalRecords: environmentalData.length,
        totalPowerRecords: powerData.length,
        dataRange: getDaysWithData(environmentalData, powerData),
        daysWithData: Object.keys(dailyAnalytics).length,
        lastUpdated: new Date().toISOString(),
        dataQuality: calculateDataQuality(environmentalData, powerData)
      }
    };
  } catch (error) {
    console.error("Error calculating comprehensive analytics:", error);
    return getDefaultAnalyticsResponse();
  }
};

// Process environmental data with enhanced analytics
const processEnvironmentalAnalytics = (data) => {
  if (!data || data.length === 0) return getDefaultEnvironmentalAnalytics();
  
  const temperatures = [];
  const humidity = [];
  const lightIntensity = [];
  
  data.forEach(item => {
    const temp = getFieldValue(item, ["temperature", "Temperature", "temp"]);
    const hum = getFieldValue(item, ["humidity", "Humidity", "hum"]);
    const light = getFieldValue(item, ["lightIntensity", "LightIntensity", "light", "lux"]);
    
    if (temp > 0) temperatures.push(temp);
    if (hum > 0) humidity.push(hum);
    if (light >= 0) lightIntensity.push(light);
  });
  
  return {
    totalRecords: data.length,
    avgTemperature: calculateAverage(temperatures),
    maxTemperature: Math.max(...temperatures, 0),
    minTemperature: Math.min(...temperatures, 100),
    tempTrend: calculateTrend(temperatures),
    avgHumidity: calculateAverage(humidity),
    maxHumidity: Math.max(...humidity, 0),
    minHumidity: Math.min(...humidity, 100),
    humidityTrend: calculateTrend(humidity),
    avgLightIntensity: calculateAverage(lightIntensity),
    maxLightIntensity: Math.max(...lightIntensity, 0),
    minLightIntensity: Math.min(...lightIntensity, 10000),
    lightTrend: calculateTrend(lightIntensity),
    temperatureTrend: generateTrendData(data, ["temperature", "Temperature", "temp"]),
    humidityTrend: generateTrendData(data, ["humidity", "Humidity", "hum"]),
    lightIntensityTrend: generateTrendData(data, ["lightIntensity", "LightIntensity", "light", "lux"]),
    qualityMetrics: calculateEnvironmentalQuality(temperatures, humidity, lightIntensity),
    comfort: calculateComfortIndex(temperatures, humidity),
    alerts: generateEnvironmentalAlerts(temperatures, humidity, lightIntensity)
  };
};

// Process power data with enhanced analytics
const processPowerAnalytics = (data) => {
  if (!data || data.length === 0) return getDefaultPowerAnalytics();
  
  const powerValues = [];
  const voltageValues = [];
  const currentValues = [];
  
  data.forEach(item => {
    const power = getFieldValue(item, ["power", "Power", "watt", "watts"]);
    const voltage = getFieldValue(item, ["voltage", "Voltage", "V"]);
    const current = getFieldValue(item, ["current", "Current", "A", "amp"]);
    
    if (power > 0) powerValues.push(power);
    if (voltage > 0) voltageValues.push(voltage);
    if (current >= 0) currentValues.push(current);
  });
  
  const totalEnergyConsumed = calculateTotalEnergy(powerValues);
  const dailyConsumption = generateDailyEnergyConsumption(data);
  
  return {
    totalRecords: data.length,
    avgPower: calculateAverage(powerValues),
    maxPower: Math.max(...powerValues, 0),
    minPower: Math.min(...powerValues, 1000),
    powerTrend: calculateTrend(powerValues),
    avgVoltage: calculateAverage(voltageValues),
    avgCurrent: calculateAverage(currentValues),
    totalEnergyConsumed,
    dailyConsumption,
    powerTrend: generateTrendData(data, ["power", "Power", "watt", "watts"]),
    peakUsageHours: calculatePeakUsageHours(data),
    powerQuality: calculatePowerQuality(powerValues, voltageValues, currentValues),
    cost: calculateEnergyCost(totalEnergyConsumed),
    carbonFootprint: calculateCarbonFootprint(totalEnergyConsumed),
    alerts: generatePowerAlerts(powerValues, voltageValues)
  };
};

// Generate daily analytics for trend visualization
const generateDailyAnalytics = (environmentalData, powerData) => {
  const dailyData = {};
  
  // Process environmental data by day
  environmentalData.forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    const dayKey = timestamp.toISOString().split('T')[0];
    
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        environmental: { temperature: [], humidity: [], light: [] },
        power: { values: [], voltage: [], current: [] }
      };
    }
    
    const temp = getFieldValue(item, ["temperature", "Temperature", "temp"]);
    const hum = getFieldValue(item, ["humidity", "Humidity", "hum"]);
    const light = getFieldValue(item, ["lightIntensity", "LightIntensity", "light", "lux"]);
    
    if (temp > 0) dailyData[dayKey].environmental.temperature.push(temp);
    if (hum > 0) dailyData[dayKey].environmental.humidity.push(hum);
    if (light >= 0) dailyData[dayKey].environmental.light.push(light);
  });
  
  // Process power data by day
  powerData.forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    const dayKey = timestamp.toISOString().split('T')[0];
    
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        environmental: { temperature: [], humidity: [], light: [] },
        power: { values: [], voltage: [], current: [] }
      };
    }
    
    const power = getFieldValue(item, ["power", "Power", "watt", "watts"]);
    const voltage = getFieldValue(item, ["voltage", "Voltage", "V"]);
    const current = getFieldValue(item, ["current", "Current", "A", "amp"]);
    
    if (power > 0) dailyData[dayKey].power.values.push(power);
    if (voltage > 0) dailyData[dayKey].power.voltage.push(voltage);
    if (current >= 0) dailyData[dayKey].power.current.push(current);
  });
  
  // Calculate daily averages and insights
  Object.keys(dailyData).forEach(day => {
    const dayData = dailyData[day];
    dailyData[day] = {
      ...dayData,
      summary: {
        avgTemperature: calculateAverage(dayData.environmental.temperature),
        avgHumidity: calculateAverage(dayData.environmental.humidity),
        avgLight: calculateAverage(dayData.environmental.light),
        avgPower: calculateAverage(dayData.power.values),
        avgVoltage: calculateAverage(dayData.power.voltage),
        avgCurrent: calculateAverage(dayData.power.current),
        totalEnergyDay: calculateTotalEnergy(dayData.power.values) / 30, // Daily energy
        dataPoints: {
          environmental: dayData.environmental.temperature.length + dayData.environmental.humidity.length + dayData.environmental.light.length,
          power: dayData.power.values.length + dayData.power.voltage.length + dayData.power.current.length
        },
        qualityScore: calculateDailyQualityScore(dayData),
        alerts: generateDailyAlerts(dayData)
      }
    };
  });
  
  return dailyData;
};

// Enhanced helper functions
const calculateAverage = (values) => {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateTrend = (values) => {
  if (!values || values.length < 2) return 0;
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);
  return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
};

const generateTrendData = (data, fieldNames) => {
  const dailyAverages = {};
  
  data.forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    const dayKey = timestamp.toISOString().split('T')[0];
    
    if (!dailyAverages[dayKey]) {
      dailyAverages[dayKey] = [];
    }
    
    const value = getFieldValue(item, fieldNames);
    if (value > 0 || (fieldNames.some(f => f.includes('current')) && value >= 0)) {
      dailyAverages[dayKey].push(value);
    }
  });
  
  return Object.keys(dailyAverages)
    .sort()
    .slice(-14) // Last 14 days
    .map(day => ({
      date: day,
      value: calculateAverage(dailyAverages[day])
    }));
};

const calculateTotalEnergy = (powerValues) => {
  if (!powerValues || powerValues.length === 0) return 0;
  const avgPower = calculateAverage(powerValues);
  return (avgPower * 24 * 30) / 1000; // kWh for 30 days estimation
};

const generateDailyEnergyConsumption = (data) => {
  const dailyConsumption = {};
  
  data.forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    const dayKey = timestamp.toISOString().split('T')[0];
    
    if (!dailyConsumption[dayKey]) {
      dailyConsumption[dayKey] = [];
    }
    
    const power = getFieldValue(item, ["power", "Power", "watt", "watts"]);
    if (power > 0) dailyConsumption[dayKey].push(power);
  });
  
  return Object.keys(dailyConsumption)
    .sort()
    .slice(-14)
    .map(day => ({
      date: day,
      value: calculateTotalEnergy(dailyConsumption[day]) / 30 // Daily energy in kWh
    }));
};

const calculatePeakUsageHours = (data) => {
  const hourlyUsage = {};
  
  data.forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    const hour = timestamp.getHours();
    
    if (!hourlyUsage[hour]) {
      hourlyUsage[hour] = [];
    }
    
    const power = getFieldValue(item, ["power", "Power", "watt", "watts"]);
    if (power > 0) hourlyUsage[hour].push(power);
  });
  
  return Object.keys(hourlyUsage)
    .map(hour => ({
      hour: parseInt(hour),
      avgPower: calculateAverage(hourlyUsage[hour]),
      label: `${hour}:00`
    }))
    .sort((a, b) => b.avgPower - a.avgPower)
    .slice(0, 3); // Top 3 peak hours
};

const calculateEnvironmentalQuality = (temperatures, humidity, light) => {
  const tempScore = calculateTemperatureScore(calculateAverage(temperatures));
  const humidityScore = calculateHumidityScore(calculateAverage(humidity));
  const lightScore = calculateLightScore(calculateAverage(light));
  
  return {
    overall: Math.round((tempScore + humidityScore + lightScore) / 3),
    temperature: tempScore,
    humidity: humidityScore,
    light: lightScore,
    category: getQualityCategory((tempScore + humidityScore + lightScore) / 3)
  };
};

const calculateTemperatureScore = (avgTemp) => {
  if (avgTemp >= 20 && avgTemp <= 25) return 100;
  if (avgTemp >= 18 && avgTemp <= 27) return 80;
  if (avgTemp >= 15 && avgTemp <= 30) return 60;
  return 40;
};

const calculateHumidityScore = (avgHumidity) => {
  if (avgHumidity >= 40 && avgHumidity <= 60) return 100;
  if (avgHumidity >= 30 && avgHumidity <= 70) return 80;
  if (avgHumidity >= 20 && avgHumidity <= 80) return 60;
  return 40;
};

const calculateLightScore = (avgLight) => {
  if (avgLight >= 200 && avgLight <= 500) return 100;
  if (avgLight >= 100 && avgLight <= 700) return 80;
  if (avgLight >= 50 && avgLight <= 1000) return 60;
  return 40;
};

const getQualityCategory = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
};

const calculateComfortIndex = (temperatures, humidity) => {
  const avgTemp = calculateAverage(temperatures);
  const avgHum = calculateAverage(humidity);
  
  // Heat index calculation approximation
  if (avgTemp < 80) return { index: avgTemp, category: 'Comfortable' };
  
  const hi = -42.379 + 2.04901523 * avgTemp + 10.14333127 * avgHum 
    - 0.22475541 * avgTemp * avgHum - 0.00683783 * avgTemp * avgTemp 
    - 0.05481717 * avgHum * avgHum + 0.00122874 * avgTemp * avgTemp * avgHum 
    + 0.00085282 * avgTemp * avgHum * avgHum - 0.00000199 * avgTemp * avgTemp * avgHum * avgHum;
  
  if (hi < 80) return { index: Math.round(hi), category: 'Comfortable' };
  if (hi < 90) return { index: Math.round(hi), category: 'Caution' };
  if (hi < 105) return { index: Math.round(hi), category: 'Extreme Caution' };
  return { index: Math.round(hi), category: 'Danger' };
};

const calculatePowerQuality = (powerValues, voltageValues, currentValues) => {
  return {
    stability: calculateStability(powerValues),
    efficiency: calculateEfficiencyScore(powerValues, voltageValues, currentValues),
    reliability: calculateReliabilityScore(powerValues),
    category: getPowerQualityCategory(calculateStability(powerValues))
  };
};

const calculateStability = (values) => {
  if (!values || values.length < 2) return 100;
  const avg = calculateAverage(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficient = avg > 0 ? (stdDev / avg) * 100 : 0;
  return Math.max(0, Math.round(100 - coefficient));
};

const calculateEfficiencyScore = (powerValues, voltageValues, currentValues) => {
  const avgPower = calculateAverage(powerValues);
  const avgVoltage = calculateAverage(voltageValues);
  const avgCurrent = calculateAverage(currentValues);
  
  if (avgVoltage === 0 || avgCurrent === 0) return 85; // Default score
  
  const apparentPower = avgVoltage * avgCurrent;
  const powerFactor = apparentPower > 0 ? avgPower / apparentPower : 0.95;
  
  return Math.min(100, Math.round(powerFactor * 100));
};

const calculateReliabilityScore = (values) => {
  if (!values || values.length === 0) return 0;
  const nonZeroValues = values.filter(v => v > 0);
  return Math.round((nonZeroValues.length / values.length) * 100);
};

const getPowerQualityCategory = (stability) => {
  if (stability >= 95) return 'Excellent';
  if (stability >= 85) return 'Good';
  if (stability >= 70) return 'Fair';
  return 'Poor';
};

const calculateEnhancedEfficiencyMetrics = (powerAnalytics, envAnalytics) => {
  const baselineConsumption = 100; // Watts baseline
  const actualConsumption = powerAnalytics.avgPower;
  
  let efficiency = {
    efficiencyScore: 0,
    co2Saved: 0,
    energySaved: 0,
    costSavings: 0,
    category: 'Poor',
    recommendations: []
  };

  if (actualConsumption > 0) {
    if (actualConsumption < baselineConsumption) {
      efficiency.efficiencyScore = Math.min(100, Math.round(((baselineConsumption - actualConsumption) / baselineConsumption * 100)));
      efficiency.energySaved = (baselineConsumption - actualConsumption) * 24 * 30 / 1000; // kWh saved
      efficiency.co2Saved = efficiency.energySaved * 0.5; // kg CO2 saved
      efficiency.costSavings = efficiency.energySaved * 0.12; // $0.12 per kWh
    } else {
      efficiency.efficiencyScore = Math.max(0, Math.round((1 - (actualConsumption - baselineConsumption) / baselineConsumption) * 100));
    }
    
    if (efficiency.efficiencyScore >= 80) efficiency.category = 'Excellent';
    else if (efficiency.efficiencyScore >= 60) efficiency.category = 'Good';
    else if (efficiency.efficiencyScore >= 40) efficiency.category = 'Fair';
    
    // Generate recommendations
    if (actualConsumption > baselineConsumption) {
      efficiency.recommendations.push('Consider upgrading to energy-efficient appliances');
      efficiency.recommendations.push('Review usage patterns during peak hours');
    }
    
    if (envAnalytics.avgTemperature > 25) {
      efficiency.recommendations.push('Optimize cooling systems for energy savings');
    }
  }

  return efficiency;
};

const calculateEnergyCost = (totalEnergyKwh) => {
  const ratePerKwh = 0.12; // $0.12 per kWh
  return {
    monthly: totalEnergyKwh * ratePerKwh,
    annual: totalEnergyKwh * ratePerKwh * 12,
    currency: 'USD'
  };
};

const calculateCarbonFootprint = (totalEnergyKwh) => {
  const co2PerKwh = 0.5; // kg CO2 per kWh
  return {
    monthly: totalEnergyKwh * co2PerKwh,
    annual: totalEnergyKwh * co2PerKwh * 12,
    unit: 'kg CO2'
  };
};

const generateEnvironmentalAlerts = (temperatures, humidity, light) => {
  const alerts = [];
  const avgTemp = calculateAverage(temperatures);
  const avgHum = calculateAverage(humidity);
  const avgLight = calculateAverage(light);
  
  if (avgTemp > 30) alerts.push({ type: 'warning', message: 'High temperature detected', severity: 'medium' });
  if (avgTemp < 15) alerts.push({ type: 'warning', message: 'Low temperature detected', severity: 'medium' });
  if (avgHum > 70) alerts.push({ type: 'warning', message: 'High humidity levels', severity: 'medium' });
  if (avgHum < 30) alerts.push({ type: 'warning', message: 'Low humidity levels', severity: 'low' });
  if (avgLight < 100) alerts.push({ type: 'info', message: 'Low light conditions', severity: 'low' });
  
  return alerts;
};

const generatePowerAlerts = (powerValues, voltageValues) => {
  const alerts = [];
  const avgPower = calculateAverage(powerValues);
  const avgVoltage = calculateAverage(voltageValues);
  
  if (avgPower > 200) alerts.push({ type: 'warning', message: 'High power consumption', severity: 'high' });
  if (avgVoltage < 110 || avgVoltage > 130) alerts.push({ type: 'warning', message: 'Voltage fluctuation detected', severity: 'medium' });
  
  return alerts;
};

const calculateDataQuality = (envData, powerData) => {
  const totalExpected = 30 * 24 * 2; // 30 days, 24 hours, 2 collections
  const totalActual = envData.length + powerData.length;
  const completeness = Math.min(100, (totalActual / totalExpected) * 100);
  
  return {
    completeness: Math.round(completeness),
    environmentalPoints: envData.length,
    powerPoints: powerData.length,
    category: completeness >= 80 ? 'High' : completeness >= 60 ? 'Medium' : 'Low'
  };
};

const calculateDailyQualityScore = (dayData) => {
  const envPoints = dayData.environmental.temperature.length + dayData.environmental.humidity.length + dayData.environmental.light.length;
  const powerPoints = dayData.power.values.length + dayData.power.voltage.length + dayData.power.current.length;
  const totalPoints = envPoints + powerPoints;
  
  if (totalPoints >= 100) return 100;
  if (totalPoints >= 50) return 80;
  if (totalPoints >= 20) return 60;
  return 40;
};

const generateDailyAlerts = (dayData) => {
  const alerts = [];
  const avgTemp = calculateAverage(dayData.environmental.temperature);
  const avgPower = calculateAverage(dayData.power.values);
  
  if (avgTemp > 28) alerts.push('High temperature');
  if (avgPower > 150) alerts.push('High consumption');
  
  return alerts;
};

const getDaysWithData = (envData, powerData) => {
  const allDates = [];
  
  [...envData, ...powerData].forEach(item => {
    const timestamp = convertTimestamp(item.timestamp || item.Timestamp || item.createdAt || item.date);
    allDates.push(timestamp.toISOString().split('T')[0]);
  });
  
  const uniqueDates = [...new Set(allDates)].sort();
  
  if (uniqueDates.length === 0) return 'No data';
  if (uniqueDates.length === 1) return uniqueDates[0];
  
  return `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`;
};

const generateInsights = (envAnalytics, powerAnalytics, dailyAnalytics) => {
  const insights = {
    environmental: [],
    power: [],
    recommendations: [],
    trends: []
  };
  
  // Environmental insights
  if (envAnalytics.tempTrend > 5) {
    insights.environmental.push(`Temperature trending up (+${envAnalytics.tempTrend.toFixed(1)}%)`);
    insights.trends.push({ type: 'temperature', direction: 'up', value: envAnalytics.tempTrend });
  } else if (envAnalytics.tempTrend < -5) {
    insights.environmental.push(`Temperature trending down (${envAnalytics.tempTrend.toFixed(1)}%)`);
    insights.trends.push({ type: 'temperature', direction: 'down', value: Math.abs(envAnalytics.tempTrend) });
  }
  
  if (envAnalytics.avgHumidity > 70) {
    insights.environmental.push(`High humidity detected (${envAnalytics.avgHumidity.toFixed(1)}%)`);
    insights.recommendations.push('Consider using dehumidifiers');
  }
  
  if (envAnalytics.avgLightIntensity < 100) {
    insights.environmental.push('Low light conditions detected');
    insights.recommendations.push('Improve lighting for better productivity');
  }
  
  // Power insights
  if (powerAnalytics.powerTrend > 10) {
    insights.power.push(`Power consumption increasing (+${powerAnalytics.powerTrend.toFixed(1)}%)`);
    insights.recommendations.push('Review energy usage patterns');
    insights.trends.push({ type: 'power', direction: 'up', value: powerAnalytics.powerTrend });
  }
  
  if (powerAnalytics.avgPower > 150) {
    insights.power.push(`High power consumption (${powerAnalytics.avgPower.toFixed(1)}W)`);
    insights.recommendations.push('Consider energy-efficient alternatives');
  }
  
  if (powerAnalytics.powerQuality.stability < 80) {
    insights.power.push('Power stability issues detected');
    insights.recommendations.push('Check electrical connections');
  }
  
  // Peak usage insights
  if (powerAnalytics.peakUsageHours && powerAnalytics.peakUsageHours.length > 0) {
    const peakHour = powerAnalytics.peakUsageHours[0];
    insights.power.push(`Peak usage at ${peakHour.label} (${peakHour.avgPower.toFixed(1)}W)`);
  }
  
  return insights;
};

// Default response functions
const getDefaultEnvironmentalAnalytics = () => ({
  totalRecords: 0,
  avgTemperature: 0,
  maxTemperature: 0,
  minTemperature: 0,
  tempTrend: 0,
  avgHumidity: 0,
  maxHumidity: 0,
  minHumidity: 0,
  humidityTrend: 0,
  avgLightIntensity: 0,
  maxLightIntensity: 0,
  minLightIntensity: 0,
  lightTrend: 0,
  temperatureTrend: [],
  humidityTrend: [],
  lightIntensityTrend: [],
  qualityMetrics: { overall: 0, temperature: 0, humidity: 0, light: 0, category: 'No Data' },
  comfort: { index: 0, category: 'No Data' },
  alerts: []
});

const getDefaultPowerAnalytics = () => ({
  totalRecords: 0,
  avgPower: 0,
  maxPower: 0,
  minPower: 0,
  powerTrend: 0,
  avgVoltage: 0,
  avgCurrent: 0,
  totalEnergyConsumed: 0,
  dailyConsumption: [],
  powerTrend: [],
  peakUsageHours: [],
  powerQuality: { stability: 0, efficiency: 0, reliability: 0, category: 'No Data' },
  cost: { monthly: 0, annual: 0, currency: 'USD' },
  carbonFootprint: { monthly: 0, annual: 0, unit: 'kg CO2' },
  alerts: []
});

const getDefaultAnalyticsResponse = () => ({
  environmental: getDefaultEnvironmentalAnalytics(),
  power: getDefaultPowerAnalytics(),
  efficiency: { efficiencyScore: 0, co2Saved: 0, energySaved: 0, costSavings: 0, category: 'No Data', recommendations: [] },
  insights: { environmental: [], power: [], recommendations: [], trends: [] },
  dailyTrends: {},
  summary: { 
    totalEnvironmentalRecords: 0, 
    totalPowerRecords: 0, 
    dataRange: 'No data', 
    daysWithData: 0,
    lastUpdated: new Date().toISOString(),
    dataQuality: { completeness: 0, environmentalPoints: 0, powerPoints: 0, category: 'No Data' }
  }
});

module.exports = {
  fetchLast30DaysEnvironmentalData,
  fetchLast30DaysPowerData,
  calculateLast30DaysAnalytics,
  getComprehensiveLast30DaysAnalytics,
  fetchMonthlyChartData,
  fetchWeeklyChartData
};
