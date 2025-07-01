import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase"; // Make sure this points to your Firebase config

function useRealTimeData() {
  const [environmentalData, setEnvironmentalData] = useState([]);
  const [humidity, setHumidity] = useState([0]);
  const [temperature, setTemperature] = useState([0]);
  const [lightIntensity, setLightIntensity] = useState([0]);
  const [power, setPower] = useState([0]);
  const [realTimeConnected, setRealTimeConnected] = useState(false);

  useEffect(() => {
    const environmentalDataCollection = collection(db, "collection1");
    const powerDataCollection = collection(db, "Every2Seconds");

    // Try different timestamp field names for environmental data
    const timestampFields = ["timestamp", "Timestamp"];
    let envUnsubscribe = null;

    const setupEnvListener = (timestampField) => {
      try {
        const latestEnvDocQuery = query(
          environmentalDataCollection,
          orderBy(timestampField, "desc"),
          limit(1)
        );

        return onSnapshot(latestEnvDocQuery, (snapshot) => {
          if (snapshot.docChanges().length > 0) {
            if (!snapshot.empty) {
              const envList = snapshot.docs
                .filter((doc) => doc.exists())
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

              setEnvironmentalData(envList);

              // Read values from the first document (since limit(1) returns one)
              const env = envList[0] || {};

              // Prioritize lowercase field names as per actual data structure
              setHumidity([env.humidity ?? env.Humidity ?? 0]);
              setTemperature([env.temperature ?? env.Temperature ?? 0]);
              setLightIntensity([env.lux ?? env.light ?? env.Light ?? 0]);
              setRealTimeConnected(true);

              console.log("Fetched environmental document:", envList);
            } else {
              console.log("No matching documents in environmental collection.");
              setRealTimeConnected(false);
            }
          }
        }, (error) => {
          console.error(`Error with ${timestampField} listener:`, error);
          setRealTimeConnected(false);
        });
      } catch (error) {
        console.error(`Failed to setup listener with ${timestampField}:`, error);
        return null;
      }
    };

    // Try to setup environmental data listener with different timestamp field names
    for (const timestampField of timestampFields) {
      envUnsubscribe = setupEnvListener(timestampField);
      if (envUnsubscribe) {
        console.log(`Environmental data listener setup with ${timestampField} field`);
        break;
      }
    }

    // Setup power data listener
    let powerUnsubscribe = null;
    try {
      const latestPowerDocQuery = query(
        powerDataCollection,
        orderBy("Timestamp", "desc"), // Power collection typically uses "Timestamp"
        limit(1)
      );

      powerUnsubscribe = onSnapshot(latestPowerDocQuery, (snapshot) => {
        if (!snapshot.empty) {
          const powerList = snapshot.docs
            .filter((doc) => doc.exists())
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

          const powerDoc = powerList[0] || {};
          setPower([powerDoc.power ?? powerDoc.Power ?? 0]);
          console.log("Fetched power document:", powerList);
        } else {
          console.log("No matching documents in power collection.");
        }
      }, (error) => {
        console.error("Error with power listener:", error);
      });
    } catch (error) {
      console.error("Failed to setup power listener:", error);
    }

    // Cleanup function
    return () => {
      if (envUnsubscribe) {
        envUnsubscribe();
      }
      if (powerUnsubscribe) {
        powerUnsubscribe();
      }
    };
  }, []);

  return { 
    environmentalData, 
    humidity, 
    temperature, 
    lightIntensity, 
    power,
    realTimeConnected 
  };
}

export default useRealTimeData;
