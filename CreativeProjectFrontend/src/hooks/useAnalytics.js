import { useState, useEffect } from 'react';

const useAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    environmental: {
      totalRecords: 0,
      avgTemperature: 0,
      avgHumidity: 0,
      avgLightIntensity: 0,
      maxTemperature: 0,
      minTemperature: 0,
      maxHumidity: 0,
      minHumidity: 0,
      temperatureTrend: [],
      humidityTrend: [],
      lightTrend: []
    },
    power: {
      totalRecords: 0,
      avgPower: 0,
      maxPower: 0,
      minPower: 0,
      totalEnergyConsumed: 0,
      powerTrend: [],
      dailyConsumption: []
    },
    efficiency: {
      efficiencyScore: 0,
      co2Saved: 0,
      energySaved: 0,
      costSavings: 0
    },
    summary: {
      totalEnvironmentalRecords: 0,
      totalPowerRecords: 0,
      dataRange: 'No data',
      daysWithData: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3006/analytics/last30days');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setAnalyticsData(result.data);
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    analyticsData,
    loading,
    error,
    refetch: fetchAnalytics
  };
};

export default useAnalytics;
