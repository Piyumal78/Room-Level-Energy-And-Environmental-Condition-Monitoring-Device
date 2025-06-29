"use client"

import React, { useEffect, useState } from "react";
import axios from "axios"
import { Bar, Line } from "react-chartjs-2"
import "chart.js/auto"
import {
  Thermometer,
  Droplets,
  Sun,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  HelpCircle,
  Bell,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart,
  PieChart,
  Lightbulb,
} from "lucide-react"
import { ref, get } from "firebase/database";
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

function EnergyAuditDashboard() {
  // State for year and month selection
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState(12)
  const [activeTab, setActiveTab] = useState("weekly")
  const [showPopup, setShowPopup] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [annualReport, setAnnualReport] = useState(null)

  // Mock real-time data - replace with your actual data
  const [environmentalData, setEnvironmentalData] = useState([])
  const [humidity, setHumidity] = useState([])
  const [temperature, setTemperature] = useState([])
  const [lightIntensity, setLightIntensity] = useState([])
  const [power, setPower] = useState([])

  // Mock data for charts - replace with your actual data
  const [weeklyAverageOfEachMonth, setWeeklyAverageOfEachMonth] = useState([])
  const [weeklyAverageOfPowerData, setWeeklyAverageOfPowerData] = useState([])
  const [monthlyAveragesOfEachMonth, setMonthlyAveragesOfEachMonth] = useState([])
  const [monthlyAverageOfPowerData, setMonthlyAverageOfPowerData] = useState([])
  
  // Analytics data states
  const [analyticsData, setAnalyticsData] = useState({
    efficiencyScore: 0,
    co2Saved: 0,
    energySaved: 0,
    costSavings: 0,
    isLoading: true,
    powerDataCount: 0,
    envDataCount: 0,
    avgPower: 0,
    avgTemp: 0,
    avgHumidity: 0
  })

  useEffect(() => {
    const annualEnergyReport = async () => {
      try {
        console.log("Year:", year, "Month:", month);
        const response = await axios.get("http://localhost:3000/events", {
          params: { year, month },
        });
        console.log(response.data);
        setAnnualReport(response.data);
        setMonthlyAveragesOfEachMonth(response.data.monthlyAveragesOfEachMonth);
        setWeeklyAverageOfEachMonth(response.data.weeklyAverages);
        setWeeklyAverageOfPowerData(response.data.powerWeeklyAverages);
        setMonthlyAverageOfPowerData(
          response.data.powerMonthlyAveragesOfEachMonth
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response?.data) {
          console.log(error.response.data);
        }
      }
    };

    annualEnergyReport();
  }, [year, month]);

  useEffect(() => {
    async function fetchRealTimeEnvData() {
      try {
        // reference to collection
        const environmentalDataCollection = collection(db, "collection1");
        const powerDataCollection = collection(db, "Every2Seconds");

        // latest document
        const latestEnvDocQuery = query(
          environmentalDataCollection,
          orderBy("Timestamp", "desc"),
          limit(1)
        );

        const latestPowerDocQuery = query(
          powerDataCollection,
          orderBy("Timestamp", "desc"),
          limit(1)
        );

        // Set up a real-time listener for environmental data
        const unsubscribeEnv = onSnapshot(latestEnvDocQuery, (snapshot) => {
          if (snapshot.docChanges().length > 0) {
            if (snapshot.empty) {
              console.log("No matching documents.");
            } else {
              const envList = snapshot.docs
                .filter((doc) => doc.exists()) // Filter out deleted documents
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
              setEnvironmentalData(envList);
              setHumidity(envList.map((user) => user.Humidity));
              setTemperature(envList.map((user) => user.Temperature));
              setLightIntensity(envList.map((user) => user.Light));
              // console.log("Fetched environmental document:", envList);
            }
          }
        });

        // Set up a real-time listener for power data
        const unsubscribePower = onSnapshot(latestPowerDocQuery, (snapshot) => {
          if (snapshot.empty) {
            console.log("No matching documents.");
          } else {
            const powerList = snapshot.docs
              .filter((doc) => doc.exists()) // Filter out deleted documents
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
            setPower(powerList.map((user) => user.Power));
            // console.log("Fetched power document:", powerList);
          }
        });

        // Clean the listeners on component unmount
        return () => {
          unsubscribeEnv();
          unsubscribePower();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchRealTimeEnvData();
  }, []);

  // Analytics calculations
  useEffect(() => {
    const calculateAnalytics = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, isLoading: true }))
        
        // Fetch historical data for analysis (last 30 days)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        
        const envDataCollection = collection(db, "collection1")
        const powerDataCollection = collection(db, "Every2Seconds")
        
        // Query last 30 days of data
        const envQuery = query(
          envDataCollection,
          orderBy("Timestamp", "desc"),
          limit(1000) // Adjust based on your data volume
        )
        
        const powerQuery = query(
          powerDataCollection,
          orderBy("Timestamp", "desc"),
          limit(1000)
        )
        
        const [envSnapshot, powerSnapshot] = await Promise.all([
          getDocs(envQuery),
          getDocs(powerQuery)
        ])
        
        const envData = envSnapshot.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().Timestamp
        }))
        
        const powerData = powerSnapshot.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().Timestamp
        }))
        
        // Filter data for last 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        const recentEnvData = envData.filter(item => {
          const itemTime = new Date(item.timestamp).getTime()
          return itemTime >= thirtyDaysAgo
        })
        
        const recentPowerData = powerData.filter(item => {
          const itemTime = new Date(item.timestamp).getTime()
          return itemTime >= thirtyDaysAgo
        })
        
        // Calculate analytics
        const avgPower = recentPowerData.length > 0 ? 
          recentPowerData.reduce((sum, item) => sum + (item.Power || 0), 0) / recentPowerData.length : 0
        const avgTemp = recentEnvData.length > 0 ? 
          recentEnvData.reduce((sum, item) => sum + (item.Temperature || 0), 0) / recentEnvData.length : 0
        const avgHumidity = recentEnvData.length > 0 ? 
          recentEnvData.reduce((sum, item) => sum + (item.Humidity || 0), 0) / recentEnvData.length : 0
        
        console.log("Analytics calculation:", { avgPower, avgTemp, avgHumidity, powerDataCount: recentPowerData.length, envDataCount: recentEnvData.length })
        
        // Efficiency Score Calculation (0-100%)
        let efficiencyScore = 100
        
        // Power efficiency (lower is better)
        if (avgPower > 150) efficiencyScore -= 30
        else if (avgPower > 100) efficiencyScore -= 15
        
        // Temperature efficiency (optimal range 20-24°C)
        if (avgTemp < 18 || avgTemp > 26) efficiencyScore -= 20
        else if (avgTemp < 20 || avgTemp > 24) efficiencyScore -= 10
        
        // Humidity efficiency (optimal range 40-60%)
        if (avgHumidity < 30 || avgHumidity > 70) efficiencyScore -= 20
        else if (avgHumidity < 40 || avgHumidity > 60) efficiencyScore -= 10
        
        efficiencyScore = Math.max(0, Math.min(100, efficiencyScore))
        
        // Environmental Impact Calculations
        const baselinePower = 200 // Baseline power consumption (watts)
        const powerSaved = Math.max(0, baselinePower - avgPower)
        const energySaved = (powerSaved * 24 * 30) / 1000 // kWh for 30 days
        const co2Saved = energySaved * 0.5 // kg CO2 per kWh (average)
        const costSavings = energySaved * 0.12 // $0.12 per kWh (average rate)
        
        setAnalyticsData({
          efficiencyScore: Math.round(efficiencyScore),
          co2Saved: co2Saved.toFixed(1),
          energySaved: energySaved.toFixed(1),
          costSavings: costSavings.toFixed(2),
          powerDataCount: recentPowerData.length,
          envDataCount: recentEnvData.length,
          avgPower: avgPower.toFixed(1),
          avgTemp: avgTemp.toFixed(1),
          avgHumidity: avgHumidity.toFixed(1),
          isLoading: false
        })
        
      } catch (error) {
        console.error("Error calculating analytics:", error)
        setAnalyticsData(prev => ({ 
          ...prev, 
          isLoading: false,
          efficiencyScore: 0,
          co2Saved: "0.0",
          energySaved: "0.0",
          costSavings: "0.00"
        }))
      }
    }
    
    // Run analytics calculation when we have data or when dependencies change
    calculateAnalytics()
  }, [power, temperature, humidity, year, month])

  // Fetch data from backend on mount and refresh
  const fetchData = async () => {
  setIsRefreshing(true)
  try {
    const res = await axios.get("http://localhost:3000/latest")
    setTemperature([res.data.temperature])
    setHumidity([res.data.humidity])
    setLightIntensity([res.data.lightIntensity])
    setPower([res.data.power])
    setEnvironmentalData([res.data.environmentalData])
  } catch (error) {
    console.error("Error fetching data from backend:", error)
  }
  setIsRefreshing(false)
}
  // Simulate data refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Example: adjust "latest/environmentalData" etc. to your actual Firebase paths
      const tempSnap = await get(ref(database, "latest/temperature"))
      const humiditySnap = await get(ref(database, "latest/humidity"))
      const lightSnap = await get(ref(database, "latest/lightIntensity"))
      const powerSnap = await get(ref(database, "latest/power"))
      const envSnap = await get(ref(database, "latest/environmentalData"))

      setTemperature([tempSnap.val()])
      setHumidity([humiditySnap.val()])
      setLightIntensity([lightSnap.val()])
      setPower([powerSnap.val()])
      setEnvironmentalData(
        envSnap.exists() ? [envSnap.val()] : [{ Timestamp: new Date().toISOString() }]
      )
    } catch (error) {
      console.error("Error fetching data from Firebase:", error)
    }
    setIsRefreshing(false)
  }

  // Helper functions for status indicators
  const getStatusColor = (value, type) => {
    switch (type) {
      case "temperature":
        return value > 25 ? "text-red-500" : value < 18 ? "text-blue-500" : "text-green-500"
      case "humidity":
        return value > 70 ? "text-orange-500" : value < 40 ? "text-yellow-500" : "text-green-500"
      case "power":
        return value > 150 ? "text-red-500" : value < 100 ? "text-green-500" : "text-yellow-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = (value, type) => {
    switch (type) {
      case "temperature":
        return value > 25 ? (
          <TrendingUp className="h-4 w-4 text-red-500" />
        ) : value < 18 ? (
          <TrendingDown className="h-4 w-4 text-blue-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )
      case "humidity":
        return value > 70 ? (
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )
      case "power":
        return value > 150 ? (
          <TrendingUp className="h-4 w-4 text-red-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-green-500" />
        )
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Chart data
  const barData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Power",
        data: [
          weeklyAverageOfPowerData?.week1?.Power / 100 || 0,
          weeklyAverageOfPowerData?.week2?.Power / 100 || 0,
          weeklyAverageOfPowerData?.week3?.Power / 100 || 0,
          weeklyAverageOfPowerData?.week4?.Power / 100 || 0,
        ],
        backgroundColor: "#FFD700",
      },
      {
        label: "Humidity",
        data: [
          weeklyAverageOfEachMonth?.week1?.Humidity || 0,
          weeklyAverageOfEachMonth?.week2?.Humidity || 0,
          weeklyAverageOfEachMonth?.week3?.Humidity || 0,
          weeklyAverageOfEachMonth?.week4?.Humidity || 0,
        ],
        backgroundColor: "#DC143C",
      },
      {
        label: "Temperature",
        data: [
          weeklyAverageOfEachMonth?.week1?.Temperature || 0,
          weeklyAverageOfEachMonth?.week2?.Temperature || 0,
          weeklyAverageOfEachMonth?.week3?.Temperature || 0,
          weeklyAverageOfEachMonth?.week4?.Temperature || 0,
        ],
        backgroundColor: "#4169E1",
      },
    ],
  }

  // Line Chart
  const lineData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
    datasets: [
      {
        label: "Power",
        data:
          monthlyAverageOfPowerData && typeof monthlyAverageOfPowerData === "object"
            ? Object.values(monthlyAverageOfPowerData).map((item) => item.Power / 100)
            : [],
        borderColor: "#1E90FF",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Temperature",
        data:
          monthlyAveragesOfEachMonth && typeof monthlyAveragesOfEachMonth === "object"
            ? Object.values(monthlyAveragesOfEachMonth).map((item) => item.Temperature)
            : [],
        borderColor: "#DC253C",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Humidity",
        data:
          monthlyAveragesOfEachMonth && typeof monthlyAveragesOfEachMonth === "object"
            ? Object.values(monthlyAveragesOfEachMonth).map((item) => item.Humidity)
            : [],
        borderColor: "#0000FF",
        fill: false,
        tension: 0.4,
      },
    ],
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const handleExport = async () => {
    try {
      const response = await axios.post("http://localhost:3000/generate-annual-report", {
        year,
      }, { responseType: "blob" }); // If your backend returns a file

      // Download the file if backend returns a file (e.g., PDF, CSV)
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `annual-report-${year}.pdf`); // Change extension if needed
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report.");
    }
  };

  const generateAndDownloadReport = async (year) => {
    // 1. Generate the report
    await fetch("http://localhost:3000/generate-annual-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }), // send year if your backend expects it
    });
    // 2. Download the report
    window.open(`http://localhost:3000/download-report/${year}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 font-sans">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    AudITFlow
                  </h1>
                  <p className="text-sm text-gray-500">Energy Monitoring System</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm ${
                  isRefreshing ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              <button className="p-1.5 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                <Bell className="h-4 w-4" />
              </button>

              <button className="p-1.5 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Real-time Status Banner */}
        <div className="mb-8">
          <div className="border-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-white rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">System Online</h2>
                    <p className="text-green-100">
                      Last updated:{" "}
                      {environmentalData[0]?.Timestamp
                        ? new Date(environmentalData[0]?.Timestamp).toLocaleString()
                        : new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 text-white border border-white/30 px-2 py-1 rounded-md text-xs font-medium">
                  Live Data
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Temperature Card */}
          <div className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <div className="text-sm font-medium text-blue-700">Temperature</div>
              <Thermometer className="h-5 w-5 text-blue-600" />
            </div>
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${getStatusColor(temperature[0], "temperature")}`}>
                    {temperature[0]?.toFixed(1)}°C
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(temperature[0] / 40) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {getStatusIcon(temperature[0], "temperature")}
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <div className="text-sm font-medium text-red-700">Humidity</div>
              <Droplets className="h-5 w-5 text-red-600" />
            </div>
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${getStatusColor(humidity[0], "humidity")}`}>
                    {humidity[0]?.toFixed(1)}%
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: `${humidity[0]}%` }}></div>
                  </div>
                </div>
                {getStatusIcon(humidity[0], "humidity")}
              </div>
            </div>
          </div>

          {/* Light Intensity Card */}
          <div className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <div className="text-sm font-medium text-yellow-700">Light Intensity</div>
              <Sun className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-600">{lightIntensity[0]?.toFixed(0)}</div>
                  <p className="text-sm text-yellow-700">LUX</p>
                  <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ width: `${(lightIntensity[0] / 1000) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <Lightbulb className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Power Card */}
          <div className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <div className="text-sm font-medium text-green-700">Power Consumption</div>
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${getStatusColor(power[0], "power")}`}>
                    {power[0]?.toFixed(1)}
                  </div>
                  <p className="text-sm text-green-700">Watts</p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(power[0] / 200) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {getStatusIcon(power[0], "power")}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="grid w-full max-w-md grid-cols-3 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md ${
                  activeTab === "weekly" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Weekly</span>
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md ${
                  activeTab === "monthly" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LineChart className="h-4 w-4" />
                <span>Monthly</span>
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md ${
                  activeTab === "analytics"
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span>Analytics</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <select
                className="border border-gray-300 rounded-md p-2 shadow-sm"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Select Year</option>
                 <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>

              <select
                className="border border-gray-300 rounded-md p-2 shadow-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Select Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>

          {/* Weekly Tab Content */}
          {activeTab === "weekly" && (
            <div className="border-0 shadow-lg bg-white rounded-lg">
              <div className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-lg font-semibold">
                    Weekly Energy Report - {month}/{year}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Power consumption and environmental conditions by week</p>
              </div>
              <div className="p-4 pt-0">
                <div className="h-80 w-full">
                  <Bar data={barData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Monthly Tab Content */}
          {activeTab === "monthly" && (
            <div className="border-0 shadow-lg bg-white rounded-lg">
              <div className="p-4">
                <div className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span className="text-lg font-semibold">Annual Energy Trends</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Monthly averages for power consumption and environmental metrics
                </p>
              </div>
              <div className="p-4 pt-0">
                <div className="h-80 w-full">
                  <Line data={lineData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab Content */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">Energy Efficiency Score</div>
                  <p className="text-sm text-gray-500">Based on current consumption patterns (last 30 days)</p>
                </div>
                <div className="p-4 pt-0">
                  <div className="text-center">
                    {analyticsData.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-500">Analyzing data...</span>
                      </div>
                    ) : (
                      <>
                        <div className={`text-4xl font-bold mb-2 ${
                          analyticsData.efficiencyScore >= 80 ? 'text-green-600' :
                          analyticsData.efficiencyScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {analyticsData.efficiencyScore}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                          <div 
                            className={`h-3 rounded-full ${
                              analyticsData.efficiencyScore >= 80 ? 'bg-green-600' :
                              analyticsData.efficiencyScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${analyticsData.efficiencyScore}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {analyticsData.efficiencyScore >= 80 ? 'Excellent efficiency rating' :
                           analyticsData.efficiencyScore >= 60 ? 'Good efficiency rating' : 'Needs improvement'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">Environmental Impact</div>
                  <p className="text-sm text-gray-500">Calculated savings vs baseline consumption</p>
                </div>
                <div className="p-4 pt-0">
                  {analyticsData.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-500">Calculating impact...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">CO₂ Saved</span>
                        <span className="font-semibold text-green-600">{analyticsData.co2Saved} kg</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Energy Saved</span>
                        <span className="font-semibold text-blue-600">{analyticsData.energySaved} kWh</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cost Savings</span>
                        <span className="font-semibold text-green-600">${analyticsData.costSavings}</span>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          * Calculated based on {analyticsData.powerDataCount} power readings and {analyticsData.envDataCount} environmental readings from the last 30 days
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Analytics Cards */}
              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">Current Averages</div>
                  <p className="text-sm text-gray-500">30-day rolling averages</p>
                </div>
                <div className="p-4 pt-0">
                  {analyticsData.isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Thermometer className="h-4 w-4 mr-1 text-blue-500" />
                          Avg Temperature
                        </span>
                        <span className="font-semibold">{analyticsData.avgTemp || 'N/A'}°C</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Droplets className="h-4 w-4 mr-1 text-red-500" />
                          Avg Humidity
                        </span>
                        <span className="font-semibold">{analyticsData.avgHumidity || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Zap className="h-4 w-4 mr-1 text-green-500" />
                          Avg Power
                        </span>
                        <span className="font-semibold">{analyticsData.avgPower || 'N/A'}W</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">Performance Insights</div>
                  <p className="text-sm text-gray-500">AI-powered recommendations</p>
                </div>
                <div className="p-4 pt-0">
                  <div className="space-y-3">
                    {analyticsData.efficiencyScore < 60 && (
                      <div className="flex items-start space-x-2 p-2 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">High Energy Usage Detected</p>
                          <p className="text-xs text-red-600">Consider adjusting temperature settings or checking for energy-hungry devices.</p>
                        </div>
                      </div>
                    )}
                    
                    {(temperature[0] < 18 || temperature[0] > 26) && (
                      <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded-lg">
                        <Thermometer className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Temperature Optimization</p>
                          <p className="text-xs text-yellow-600">Current temperature is outside optimal range (20-24°C).</p>
                        </div>
                      </div>
                    )}
                    
                    {(humidity[0] < 40 || humidity[0] > 60) && (
                      <div className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg">
                        <Droplets className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Humidity Management</p>
                          <p className="text-xs text-blue-600">Consider using a humidifier/dehumidifier for optimal comfort.</p>
                        </div>
                      </div>
                    )}
                    
                    {analyticsData.efficiencyScore >= 80 && (
                      <div className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Excellent Performance!</p>
                          <p className="text-xs text-green-600">Your energy usage is optimized. Keep up the great work!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guidelines Button */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setShowPopup(true)}
            className="rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 flex items-center"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            Guidelines
          </button>
        </div>

        {/* Guidelines Popup */}
        {showPopup && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-2xl font-bold">Energy Efficiency Guidelines</h2>
                </div>
                <button onClick={() => setShowPopup(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Best practices for optimal energy consumption and environmental conditions
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border-l-4 border-l-blue-500 bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Thermometer className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Temperature Control</h3>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Maintain 20-24°C for optimal comfort</li>
                    <li>• Avoid extreme temperature fluctuations</li>
                    <li>• Use programmable thermostats</li>
                  </ul>
                </div>

                <div className="border-l-4 border-l-red-500 bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Droplets className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Humidity Management</h3>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Keep humidity between 40-60%</li>
                    <li>• Prevent mold growth and discomfort</li>
                    <li>• Use dehumidifiers when necessary</li>
                  </ul>
                </div>

                <div className="border-l-4 border-l-yellow-500 bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sun className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Lighting Optimization</h3>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Use natural light when possible</li>
                    <li>• Install LED bulbs for efficiency</li>
                    <li>• Implement motion sensors</li>
                  </ul>
                </div>

                <div className="border-l-4 border-l-green-500 bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Power Management</h3>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Monitor consumption regularly</li>
                    <li>• Identify energy-hungry devices</li>
                    <li>• Schedule high-power activities</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Set up automated alerts for unusual consumption patterns</li>
                  <li>• Regular maintenance of HVAC systems improves efficiency</li>
                  <li>• Consider smart plugs for better device monitoring</li>
                  <li>• Review energy reports monthly to identify trends</li>
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPopup(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardAverages() {
  const [weeklyAverageOfPowerData, setWeeklyAverageOfPowerData] = useState({});
  const [weeklyAverageOfEachMonth, setWeeklyAverageOfEachMonth] = useState({});
  const [monthlyAverageOfPowerData, setMonthlyAverageOfPowerData] = useState({});
  const [monthlyAveragesOfEachMonth, setMonthlyAveragesOfEachMonth] = useState({});

  useEffect(() => {
    // Fetch weekly averages
    axios.get("http://localhost:3000/weekly-averages")
      .then(res => {
        setWeeklyAverageOfPowerData(res.data.power);
        setWeeklyAverageOfEachMonth(res.data.env);
      })
      .catch(console.error);

    // Fetch monthly averages
    axios.get("http://localhost:3000/monthly-averages")
      .then(res => {
        setMonthlyAverageOfPowerData(res.data.power);
        setMonthlyAveragesOfEachMonth(res.data.env);
      })
      .catch(console.error);
  }, []);

  // ...render your dashboard using the above state variables
}

export default EnergyAuditDashboard;
