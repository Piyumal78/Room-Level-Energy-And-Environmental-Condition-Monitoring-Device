"use client"

import { useEffect, useState } from "react"
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
  Loader2,
} from "lucide-react"
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, Timestamp } from "firebase/firestore"
import { db } from "../config/firebase"

function EnergyAuditDashboard() {
  // State for year and month selection
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState(12)
  const [activeTab, setActiveTab] = useState("weekly")
  const [showPopup, setShowPopup] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real-time data states
  const [environmentalData, setEnvironmentalData] = useState([])
  const [humidity, setHumidity] = useState([0])
  const [temperature, setTemperature] = useState([0])
  const [lightIntensity, setLightIntensity] = useState([0])
  const [power, setPower] = useState([0])

  // Historical data states
  const [weeklyData, setWeeklyData] = useState({
    week1: { Humidity: 0, Temperature: 0, Power: 0, Light: 0 },
    week2: { Humidity: 0, Temperature: 0, Power: 0, Light: 0 },
    week3: { Humidity: 0, Temperature: 0, Power: 0, Light: 0 },
    week4: { Humidity: 0, Temperature: 0, Power: 0, Light: 0 },
  })

  const [monthlyData, setMonthlyData] = useState({
    Jan: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Feb: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Mar: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Apr: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    May: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Jun: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Jul: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Aug: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Sep: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Oct: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Nov: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
    Dec: { Temperature: 0, Humidity: 0, Power: 0, Light: 0 },
  })

  // Loading states
  const [dataLoading, setDataLoading] = useState(false)
  const [realTimeConnected, setRealTimeConnected] = useState(false)

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
    avgHumidity: 0,
  })

  // Helper function to safely get field value with multiple possible field names
  const getFieldValue = (item, fieldNames, defaultValue = 0) => {
    for (const fieldName of fieldNames) {
      if (item[fieldName] !== undefined && item[fieldName] !== null) {
        return Number(item[fieldName]) || defaultValue
      }
    }
    return defaultValue
  }

  // Helper function to convert Firestore timestamp to Date
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return new Date()
    if (timestamp.toDate) return timestamp.toDate()
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000)
    return new Date(timestamp)
  }

  // Fetch data from Every2Second collection with improved error handling
  const fetchEvery2SecondData = async (startDate, endDate) => {
    try {
      console.log("Fetching Every2Second data from:", startDate.toISOString(), "to:", endDate.toISOString())

      // Try different timestamp field names
      const timestampFields = ["timestamp", "Timestamp", "createdAt", "date"]
      let data = []

      for (const timestampField of timestampFields) {
        try {
          const q = query(
            collection(db, "Every2Second"),
            where(timestampField, ">=", Timestamp.fromDate(startDate)),
            where(timestampField, "<=", Timestamp.fromDate(endDate)),
            orderBy(timestampField, "desc"),
            limit(50000),
          )

          const querySnapshot = await getDocs(q)
          data = []
          querySnapshot.forEach((doc) => {
            const docData = doc.data()
            data.push({
              id: doc.id,
              ...docData,
              timestamp: convertTimestamp(docData[timestampField]),
            })
          })

          if (data.length > 0) {
            console.log(`Successfully fetched ${data.length} records using ${timestampField} field`)
            break
          }
        } catch (error) {
          console.log(`Failed to query with ${timestampField}:`, error.message)
          continue
        }
      }

      return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    } catch (error) {
      console.error("Error fetching Every2Second data:", error)
      return []
    }
  }

  // Process weekly data with improved field handling
  const processWeeklyData = (data) => {
    const weeklyData = {}
    const now = new Date()

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)

      const weekData = data.filter((item) => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= weekStart && itemDate < weekEnd
      })

      if (weekData.length > 0) {
        weeklyData[`week${4 - i}`] = {
          Temperature:
            weekData.reduce((sum, item) => sum + getFieldValue(item, ["Temperature", "temperature", "temp"]), 0) /
            weekData.length,
          Humidity:
            weekData.reduce((sum, item) => sum + getFieldValue(item, ["Humidity", "humidity", "hum"]), 0) /
            weekData.length,
          Power:
            weekData.reduce((sum, item) => sum + getFieldValue(item, ["Power", "power", "watt", "watts"]), 0) /
            weekData.length,
          Light:
            weekData.reduce((sum, item) => sum + getFieldValue(item, ["Light", "light", "lightIntensity", "lux"]), 0) /
            weekData.length,
        }
      } else {
        weeklyData[`week${4 - i}`] = { Temperature: 0, Humidity: 0, Power: 0, Light: 0 }
      }
    }

    return weeklyData
  }

  // Process monthly data with improved field handling
  const processMonthlyData = (data) => {
    const monthlyData = {}
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let month = 0; month < 12; month++) {
      const monthData = data.filter((item) => {
        const itemDate = new Date(item.timestamp)
        return itemDate.getMonth() === month && itemDate.getFullYear() === year
      })

      if (monthData.length > 0) {
        monthlyData[monthNames[month]] = {
          Temperature:
            monthData.reduce((sum, item) => sum + getFieldValue(item, ["Temperature", "temperature", "temp"]), 0) /
            monthData.length,
          Humidity:
            monthData.reduce((sum, item) => sum + getFieldValue(item, ["Humidity", "humidity", "hum"]), 0) /
            monthData.length,
          Power:
            monthData.reduce((sum, item) => sum + getFieldValue(item, ["Power", "power", "watt", "watts"]), 0) /
            monthData.length,
          Light:
            monthData.reduce((sum, item) => sum + getFieldValue(item, ["Light", "light", "lightIntensity", "lux"]), 0) /
            monthData.length,
        }
      } else {
        monthlyData[monthNames[month]] = { Temperature: 0, Humidity: 0, Power: 0, Light: 0 }
      }
    }

    return monthlyData
  }

  // Real-time data listener with improved error handling
  useEffect(() => {
    let unsubscribe = null

    const setupRealTimeListener = async () => {
      try {
        // Try collection2 first
        const collection2Ref = collection(db, "collection2")
        const latestQuery = query(collection2Ref, orderBy("Timestamp", "desc"), limit(1))

        unsubscribe = onSnapshot(
          latestQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const latestData = snapshot.docs[0].data()
              setEnvironmentalData([latestData])
              setHumidity([getFieldValue(latestData, ["Humidity", "humidity", "hum"])])
              setTemperature([getFieldValue(latestData, ["Temperature", "temperature", "temp"])])
              setLightIntensity([getFieldValue(latestData, ["Light", "light", "lightIntensity", "lux"])])
              setPower([getFieldValue(latestData, ["Power", "power", "watt", "watts"])])
              setRealTimeConnected(true)
              console.log("Real-time data updated from collection2:", latestData)
            } else {
              // Fallback to Every2Second collection
              console.log("No data in collection2, trying Every2Second...")
              setupFallbackListener()
            }
          },
          (error) => {
            console.error("Error in collection2 listener:", error)
            setupFallbackListener()
          },
        )
      } catch (error) {
        console.error("Error setting up collection2 listener:", error)
        setupFallbackListener()
      }
    }

    const setupFallbackListener = () => {
      try {
        const every2SecondRef = collection(db, "Every2Second")
        const fallbackQuery = query(every2SecondRef, orderBy("timestamp", "desc"), limit(1))

        const fallbackUnsubscribe = onSnapshot(
          fallbackQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const latestData = snapshot.docs[0].data()
              setEnvironmentalData([latestData])
              setHumidity([getFieldValue(latestData, ["Humidity", "humidity", "hum"])])
              setTemperature([getFieldValue(latestData, ["Temperature", "temperature", "temp"])])
              setLightIntensity([getFieldValue(latestData, ["Light", "light", "lightIntensity", "lux"])])
              setPower([getFieldValue(latestData, ["Power", "power", "watt", "watts"])])
              setRealTimeConnected(true)
              console.log("Real-time data updated from Every2Second:", latestData)
            }
          },
          (error) => {
            console.error("Error in Every2Second fallback listener:", error)
            setRealTimeConnected(false)
          },
        )

        unsubscribe = fallbackUnsubscribe
      } catch (error) {
        console.error("Error setting up fallback listener:", error)
        setRealTimeConnected(false)
      }
    }

    setupRealTimeListener()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Fetch historical data for charts
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setDataLoading(true)
      try {
        console.log("Fetching historical data for charts...")

        // Get date ranges
        const now = new Date()
        const startOfMonth = new Date(year, month - 1, 1)
        const endOfMonth = new Date(year, month, 0, 23, 59, 59)
        const startOfYear = new Date(year, 0, 1)
        const endOfYear = new Date(year, 11, 31, 23, 59, 59)

        // Fetch data for weekly and monthly analysis
        const [weeklyRawData, monthlyRawData] = await Promise.all([
          fetchEvery2SecondData(startOfMonth, endOfMonth),
          fetchEvery2SecondData(startOfYear, endOfYear),
        ])

        console.log("Historical data fetched:", {
          weeklyCount: weeklyRawData.length,
          monthlyCount: monthlyRawData.length,
        })

        // Process data
        const processedWeeklyData = processWeeklyData(weeklyRawData)
        const processedMonthlyData = processMonthlyData(monthlyRawData)

        setWeeklyData(processedWeeklyData)
        setMonthlyData(processedMonthlyData)

        console.log("Processed data:", { weekly: processedWeeklyData, monthly: processedMonthlyData })
      } catch (error) {
        console.error("Error fetching historical data:", error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchHistoricalData()
  }, [year, month])

  // Analytics calculations
  useEffect(() => {
    const calculateAnalytics = async () => {
      try {
        setAnalyticsData((prev) => ({ ...prev, isLoading: true }))

        // Get last 30 days of data for analytics
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        const analyticsData = await fetchEvery2SecondData(startDate, endDate)

        if (analyticsData.length > 0) {
          const avgPower =
            analyticsData.reduce((sum, item) => sum + getFieldValue(item, ["Power", "power", "watt", "watts"]), 0) /
            analyticsData.length
          const avgTemp =
            analyticsData.reduce((sum, item) => sum + getFieldValue(item, ["Temperature", "temperature", "temp"]), 0) /
            analyticsData.length
          const avgHumidity =
            analyticsData.reduce((sum, item) => sum + getFieldValue(item, ["Humidity", "humidity", "hum"]), 0) /
            analyticsData.length

          // Calculate efficiency score
          let efficiencyScore = 100
          if (avgPower > 150) efficiencyScore -= 30
          else if (avgPower > 100) efficiencyScore -= 15

          if (avgTemp < 18 || avgTemp > 26) efficiencyScore -= 20
          else if (avgTemp < 20 || avgTemp > 24) efficiencyScore -= 10

          if (avgHumidity < 30 || avgHumidity > 70) efficiencyScore -= 20
          else if (avgHumidity < 40 || avgHumidity > 60) efficiencyScore -= 10

          efficiencyScore = Math.max(0, Math.min(100, efficiencyScore))

          // Calculate environmental impact
          const baselinePower = 200
          const powerSaved = Math.max(0, baselinePower - avgPower)
          const energySaved = (powerSaved * 24 * 30) / 1000
          const co2Saved = energySaved * 0.5
          const costSavings = energySaved * 0.12

          setAnalyticsData({
            efficiencyScore: Math.round(efficiencyScore),
            co2Saved: co2Saved.toFixed(1),
            energySaved: energySaved.toFixed(1),
            costSavings: costSavings.toFixed(2),
            powerDataCount: analyticsData.length,
            envDataCount: analyticsData.length,
            avgPower: avgPower.toFixed(1),
            avgTemp: avgTemp.toFixed(1),
            avgHumidity: avgHumidity.toFixed(1),
            isLoading: false,
          })
        } else {
          setAnalyticsData((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error("Error calculating analytics:", error)
        setAnalyticsData((prev) => ({ ...prev, isLoading: false }))
      }
    }

    calculateAnalytics()
  }, [year, month])

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Trigger re-fetch of historical data
      const now = new Date()
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59)
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31, 23, 59, 59)

      const [weeklyRawData, monthlyRawData] = await Promise.all([
        fetchEvery2SecondData(startOfMonth, endOfMonth),
        fetchEvery2SecondData(startOfYear, endOfYear),
      ])

      const processedWeeklyData = processWeeklyData(weeklyRawData)
      const processedMonthlyData = processMonthlyData(monthlyRawData)

      setWeeklyData(processedWeeklyData)
      setMonthlyData(processedMonthlyData)

      console.log("Data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  // Export function
  const handleExport = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/generate-annual-report",
        {
          year,
        },
        { responseType: "blob" },
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `annual-report-${year}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error("Error exporting report:", error)
      alert("Failed to export report.")
    }
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
        label: "Power (W/10)",
        data: [
          weeklyData.week1?.Power / 10 || 0,
          weeklyData.week2?.Power / 10 || 0,
          weeklyData.week3?.Power / 10 || 0,
          weeklyData.week4?.Power / 10 || 0,
        ],
        backgroundColor: "rgba(255, 215, 0, 0.8)",
        borderColor: "rgba(255, 215, 0, 1)",
        borderWidth: 1,
      },
      {
        label: "Humidity (%)",
        data: [
          weeklyData.week1?.Humidity || 0,
          weeklyData.week2?.Humidity || 0,
          weeklyData.week3?.Humidity || 0,
          weeklyData.week4?.Humidity || 0,
        ],
        backgroundColor: "rgba(220, 20, 60, 0.8)",
        borderColor: "rgba(220, 20, 60, 1)",
        borderWidth: 1,
      },
      {
        label: "Temperature (°C)",
        data: [
          weeklyData.week1?.Temperature || 0,
          weeklyData.week2?.Temperature || 0,
          weeklyData.week3?.Temperature || 0,
          weeklyData.week4?.Temperature || 0,
        ],
        backgroundColor: "rgba(65, 105, 225, 0.8)",
        borderColor: "rgba(65, 105, 225, 1)",
        borderWidth: 1,
      },
    ],
  }

  const lineData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: "Power (W/10)",
        data: Object.values(monthlyData).map((item) => item.Power / 10),
        borderColor: "#1E90FF",
        backgroundColor: "rgba(30, 144, 255, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Temperature (°C)",
        data: Object.values(monthlyData).map((item) => item.Temperature),
        borderColor: "#DC253C",
        backgroundColor: "rgba(220, 37, 60, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Humidity (%)",
        data: Object.values(monthlyData).map((item) => item.Humidity),
        borderColor: "#0000FF",
        backgroundColor: "rgba(0, 0, 255, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  }

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
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || ""
            if (label) {
              label += ": "
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2)
            }
            return label
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  }

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
                disabled={isRefreshing || dataLoading}
                className={`flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm ${
                  isRefreshing || dataLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
              >
                {isRefreshing || dataLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{dataLoading ? "Loading..." : "Refresh"}</span>
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
          <div
            className={`border-0 ${realTimeConnected ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-orange-500 to-red-600"} text-white rounded-lg shadow-lg`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={`w-4 h-4 ${realTimeConnected ? "bg-white" : "bg-yellow-200"} rounded-full`}></div>
                    <div
                      className={`absolute inset-0 w-4 h-4 ${realTimeConnected ? "bg-white" : "bg-yellow-200"} rounded-full animate-ping`}
                    ></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {realTimeConnected ? "System Online - Real-time" : "Connecting to Real-time Data..."}
                    </h2>
                    <p className={`${realTimeConnected ? "text-green-100" : "text-orange-100"}`}>
                      Last updated:{" "}
                      {environmentalData[0]?.Timestamp
                        ? new Date(environmentalData[0]?.Timestamp).toLocaleString()
                        : "Connecting..."}
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 text-white border border-white/30 px-2 py-1 rounded-md text-xs font-medium">
                  {realTimeConnected ? "Live Data - Firebase" : "Reconnecting..."}
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
                    {temperature[0]?.toFixed(1) || "0.0"}°C
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((temperature[0] / 40) * 100, 100)}%` }}
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
                    {humidity[0]?.toFixed(1) || "0.0"}%
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(humidity[0], 100)}%` }}
                    ></div>
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
                  <div className="text-3xl font-bold text-yellow-600">{lightIntensity[0]?.toFixed(0) || "0"}</div>
                  <p className="text-sm text-yellow-700">LUX</p>
                  <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((lightIntensity[0] / 1000) * 100, 100)}%` }}
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
                    {power[0]?.toFixed(1) || "0.0"}
                  </div>
                  <p className="text-sm text-green-700">Watts</p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((power[0] / 200) * 100, 100)}%` }}
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
                onChange={(e) => setYear(Number.parseInt(e.target.value))}
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
                onChange={(e) => setMonth(Number.parseInt(e.target.value))}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-lg font-semibold">
                      Weekly Energy Report - {month}/{year}
                    </span>
                  </div>
                  {dataLoading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading data...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Power consumption and environmental conditions by week 
                </p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <LineChart className="h-5 w-5" />
                    <span className="text-lg font-semibold">Annual Energy Trends - {year}</span>
                  </div>
                  {dataLoading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing historical data...</span>
                    </div>
                  )}
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
                  <p className="text-sm text-gray-500">Based on last 30 days </p>
                </div>
                <div className="p-4 pt-0">
                  <div className="text-center">
                    {analyticsData.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-500">Analyzing data...</span>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`text-4xl font-bold mb-2 ${
                            analyticsData.efficiencyScore >= 80
                              ? "text-green-600"
                              : analyticsData.efficiencyScore >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {analyticsData.efficiencyScore}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                          <div
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              analyticsData.efficiencyScore >= 80
                                ? "bg-green-600"
                                : analyticsData.efficiencyScore >= 60
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                            }`}
                            style={{ width: `${analyticsData.efficiencyScore}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {analyticsData.efficiencyScore >= 80
                            ? "Excellent efficiency rating"
                            : analyticsData.efficiencyScore >= 60
                              ? "Good efficiency rating"
                              : "Needs improvement"}
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
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
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
                          * Based on {analyticsData.powerDataCount} data points
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Averages Card */}
              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">30-Day Averages</div>
                  <p className="text-sm text-gray-500">Based on last 30 days </p>
                </div>
                <div className="p-4 pt-0">
                  {analyticsData.isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Thermometer className="h-4 w-4 mr-1 text-blue-500" />
                          Avg Temperature
                        </span>
                        <span className="font-semibold">{analyticsData.avgTemp}°C</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Droplets className="h-4 w-4 mr-1 text-red-500" />
                          Avg Humidity
                        </span>
                        <span className="font-semibold">{analyticsData.avgHumidity}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center">
                          <Zap className="h-4 w-4 mr-1 text-green-500" />
                          Avg Power
                        </span>
                        <span className="font-semibold">{analyticsData.avgPower}W</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Collection Status */}
              <div className="border-0 shadow-lg bg-white rounded-lg">
                <div className="p-4">
                  <div className="text-lg font-semibold">Data Collection Status</div>
                  <p className="text-sm text-gray-500">Firebase collection monitoring</p>
                </div>
                <div className="p-4 pt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Real-time Collection</span>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 ${realTimeConnected ? "bg-green-500 animate-pulse" : "bg-red-500"} rounded-full`}
                        ></div>
                        <span className={`font-semibold ${realTimeConnected ? "text-green-600" : "text-red-600"}`}>
                          {realTimeConnected ? "Connected" : "Disconnected"}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Historical Collection</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-semibold text-blue-600">Every2Second</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Data Points (30 days)</span>
                      <span className="font-semibold text-gray-600">{analyticsData.powerDataCount}</span>
                    </div>
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
                Best practices for optimal energy consumption and environmental conditions based on real-time monitoring
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border-l-4 border-l-blue-500 bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Thermometer className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Temperature Control</h3>
                  </div>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Maintain 20-24°C for optimal comfort</li>
                    <li>• Current: {temperature[0]?.toFixed(1) || "0.0"}°C</li>
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
                    <li>• Current: {humidity[0]?.toFixed(1) || "0.0"}%</li>
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
                    <li>• Current: {lightIntensity[0]?.toFixed(0) || "0"} LUX</li>
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
                    <li>• Current: {power[0]?.toFixed(1) || "0.0"} W</li>
                    <li>• Identify energy-hungry devices</li>
                    <li>• Schedule high-power activities</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">💡 Data-Driven Insights</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Real-time monitoring from collection2 provides instant feedback</li>
                  <li>• Historical analysis from Every2Second shows trends and patterns</li>
                  <li>• Weekly reports help identify consumption patterns</li>
                  <li>• Monthly trends reveal seasonal variations</li>
                  <li>• Set up alerts for threshold breaches to prevent waste</li>
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

export default EnergyAuditDashboard
