import { useEffect, useState } from "react";
import { db } from "../config/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function FirebaseDataChart() {
  const [twoSecondData, setTwoSecondData] = useState([]);
  const [twoMinuteData, setTwoMinuteData] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState("2minute");
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [chartType, setChartType] = useState("line");
  const [selectedMetrics, setSelectedMetrics] = useState(["temperature", "humidity", "power"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get date range based on filter period
  const getDateRange = () => {
    const now = new Date();
    let startDate;
    
    if (filterPeriod === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterPeriod === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, endDate: now };
  };

  // Fetch Firebase data with real-time listener
  const fetchFirebaseData = (collectionName, setData) => {
    setLoading(true);
    setError("");
    
    try {
      const { startDate, endDate } = getDateRange();
      
      const q = query(
        collection(db, collectionName),
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        where("timestamp", "<=", Timestamp.fromDate(endDate)),
        orderBy("timestamp", "desc"),
        limit(selectedInterval === "2second" ? 1000 : 500)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({ 
            id: doc.id, 
            ...docData,
            // Ensure timestamp is properly handled
            timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate() : new Date(docData.timestamp)
          });
        });
        setData(data);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching data:", error);
        setError(`Error fetching ${collectionName}: ${error.message}`);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up listener:", error);
      setError(`Error setting up listener: ${error.message}`);
      setLoading(false);
      return null;
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    const currentData = selectedInterval === "2second" ? twoSecondData : twoMinuteData;
    
    if (!currentData || currentData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort data by timestamp
    const sortedData = [...currentData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = sortedData.map(item => {
      const date = new Date(item.timestamp);
      return filterPeriod === "today" ? 
        date.toLocaleTimeString() : 
        date.toLocaleDateString() + " " + date.toLocaleTimeString();
    });

    const datasets = [];
    const colors = {
      temperature: { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
      humidity: { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
      power: { border: 'rgb(255, 205, 86)', background: 'rgba(255, 205, 86, 0.2)' },
      co2: { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
      light: { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
      voltage: { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' },
      current: { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' }
    };

    const metricLabels = {
      temperature: 'Temperature (°C)',
      humidity: 'Humidity (%)',
      power: 'Power (W)',
      co2: 'CO₂ (ppm)',
      light: 'Light (lux)',
      voltage: 'Voltage (V)',
      current: 'Current (A)'
    };

    selectedMetrics.forEach(metric => {
      if (sortedData.some(item => item[metric] !== undefined)) {
        datasets.push({
          label: metricLabels[metric] || metric,
          data: sortedData.map(item => item[metric] || 0),
          borderColor: colors[metric]?.border || 'rgb(99, 99, 99)',
          backgroundColor: colors[metric]?.background || 'rgba(99, 99, 99, 0.2)',
          tension: 0.1,
          fill: chartType === "area"
        });
      }
    });

    return { labels, datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Environmental Data - ${selectedInterval === "2second" ? "2 Second" : "2 Minute"} Interval (${filterPeriod})`
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
      x: {
        ticks: {
          maxTicksLimit: 10
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  // Firebase data listeners
  useEffect(() => {
    let unsubscribe2Second, unsubscribe2Minute;

    if (selectedInterval === "2second") {
      unsubscribe2Second = fetchFirebaseData("Every2Seconds", setTwoSecondData);
    } else if (selectedInterval === "2minute") {
      unsubscribe2Minute = fetchFirebaseData("Every2Minute", setTwoMinuteData);
    }

    return () => {
      if (unsubscribe2Second) unsubscribe2Second();
      if (unsubscribe2Minute) unsubscribe2Minute();
    };
  }, [selectedInterval, filterPeriod]);

  const currentData = selectedInterval === "2second" ? twoSecondData : twoMinuteData;
  const chartData = prepareChartData();

  return (
    <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 8, marginBottom: 20 }}>
      <h2>Firebase Real-time Environmental Data</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: 16, padding: 8, backgroundColor: '#ffebee', borderRadius: 4 }}>
          {error}
        </div>
      )}
      
      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Data Interval:</label>
          <select 
            value={selectedInterval} 
            onChange={(e) => setSelectedInterval(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="2second">2 Second Interval</option>
            <option value="2minute">2 Minute Interval</option>
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Filter Period:</label>
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>

        <div>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Chart Type:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
        
        {loading && <span style={{ color: '#666', fontStyle: 'italic' }}>Loading...</span>}
        <span style={{ color: '#666', fontSize: '0.9em' }}>
          ({currentData.length} records)
        </span>
      </div>

      {/* Metrics Selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 'bold', marginRight: 8 }}>Metrics to Display:</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {["temperature", "humidity", "power", "co2", "light", "voltage", "current"].map(metric => (
            <label key={metric} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMetrics([...selectedMetrics, metric]);
                  } else {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                  }
                }}
              />
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 400, marginBottom: 24 }}>
        {chartData.datasets.length > 0 ? (
          chartType === "line" ? 
            <Line data={chartData} options={chartOptions} /> :
            <Bar data={chartData} options={chartOptions} />
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            color: '#666'
          }}>
            {loading ? "Loading chart data..." : "No data available for the selected period"}
          </div>
        )}
      </div>

      {/* Statistics */}
      {currentData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {selectedMetrics.map(metric => {
            const values = currentData.map(item => item[metric]).filter(val => val !== undefined && val !== null);
            if (values.length === 0) return null;
            
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            
            return (
              <div key={metric} style={{ 
                border: '1px solid #ddd', 
                padding: 12, 
                borderRadius: 6,
                backgroundColor: '#f9f9f9'
              }}>
                <h4 style={{ margin: '0 0 8px 0', textTransform: 'capitalize' }}>{metric}</h4>
                <div style={{ fontSize: '0.9em' }}>
                  <div>Avg: {avg.toFixed(2)}</div>
                  <div>Max: {max.toFixed(2)}</div>
                  <div>Min: {min.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FirebaseDataChart;
