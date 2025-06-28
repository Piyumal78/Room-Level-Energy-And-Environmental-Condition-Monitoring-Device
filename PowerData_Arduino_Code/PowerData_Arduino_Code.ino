<<<<<<< HEAD
#if defined(ESP32) 
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>  // For token status callback
#include <math.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <TimeLib.h>

// Pin Definitions
const int voltagePin = A0;      // Shared A0 pin for both voltage and current sensors
const int currentSensorPin = D1; // Digital pin to switch between voltage and current sensors

// Constants
const float voltageCalibration = 230.0 / 1024.0; // Adjust for your ZMPT101B sensor (scaling factor)
const float currentCalibration = 30.0 / 1024.0;  // Adjust for ACS712 sensor (scaling factor)

// Sampling Settings
const int samples = 2000;       // Number of samples
const int sampleInterval = 1;   // Sampling interval in microseconds

// Wi-Fi credentials
#define WIFI_SSID "Dialog 4G 586"
#define WIFI_PASSWORD "9595119D"

// Firebase credentials
#define API_KEY "AIzaSyDnap4gRt1dgAZHsAvBVpP7qafrU8S9nYg"
#define FIREBASE_PROJECT_ID "environmental-conditions"
#define USER_EMAIL "heshanchanuka7@gmail.com"
#define USER_PASSWORD "heshanC2525"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// NTP setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every minute

// Time offset (in seconds) for Sri Lankan local time (GMT+5:30)
int timeOffset = 5 * 3600 + 30 * 60; // GMT+5:30

// Variables to manage timing
unsigned long previousMillis2s = 0;
unsigned long previousMillis2m = 0;
const unsigned long interval2s = 2000;  // 2 seconds
const unsigned long interval2m = 120000; // 2 minutes

// Function to generate ISO 8601 formatted timestamp
String getFormattedTimestamp(time_t rawTime) {
  time_t localTime = rawTime + timeOffset; // Apply GMT+5:30 offset
  char buffer[30];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02d.000Z", 
          year(localTime), month(localTime), day(localTime), 
          hour(localTime), minute(localTime), second(localTime));
  return String(buffer);
}

void setup() {
  // Start Serial Monitor
  Serial.begin(115200);
  delay(500);

  // Initialize the digital pin to control sensor selection
  pinMode(currentSensorPin, OUTPUT);
  digitalWrite(currentSensorPin, LOW);  // Start with voltage sensor

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize NTP
  timeClient.begin();
  Serial.println("Synchronizing time with NTP server...");
  int retryCount = 0;

  while (!timeClient.update()) {
    delay(500);
    retryCount++;
    if (retryCount > 20) { // Increase the number of retries
      Serial.println("Failed to synchronize time with NTP server. Switching to an alternative...");
      timeClient.setPoolServerName("time.google.com"); // Switch to Google's NTP server
      retryCount = 0;
    }
  }
  
  if (timeClient.getEpochTime() > 0) {
    Serial.println("Time synchronized successfully!");
    Serial.print("Current UTC Time: ");
    Serial.println(timeClient.getFormattedTime());
  } else {
    Serial.println("NTP synchronization failed after multiple attempts.");
  }

  // Configure Firebase
  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback; // Optional debug callback

  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void updateCollection(String collectionName, time_t rawTime) {
  // Generate unique document ID with local time
  char documentID[20];
  sprintf(documentID, "%04d%02d%02d_%02d%02d%02d", 
          year(rawTime), month(rawTime), day(rawTime), 
          hour(rawTime), minute(rawTime), second(rawTime));

  // Firestore document path
  String documentPath = collectionName + "/" + String(documentID);

  // Create FirebaseJson object for data
  FirebaseJson content;

  float voltageSum = 0.0;
  float currentSum = 0.0;

  // Collect samples and compute squared values
  for (int i = 0; i < samples; i++) {
    // First, read voltage (ZMPT101B)
    digitalWrite(currentSensorPin, LOW);  // Set to read voltage
    int rawVoltage = analogRead(voltagePin);
    float voltage = (rawVoltage - 512) * voltageCalibration; // Remove DC offset and scale to voltage
    voltageSum += voltage * voltage; // Square voltage

    // Then, read current (ACS712)
    digitalWrite(currentSensorPin, HIGH);  // Set to read current
    int rawCurrent = analogRead(voltagePin);
    float current = (rawCurrent - 512) * currentCalibration; // Remove DC offset and scale to current
    currentSum += current * current; // Square current

    delayMicroseconds(sampleInterval); // Sampling interval
  }

  // Calculate RMS values
  float voltageRMS = sqrt(voltageSum / samples); // True RMS for voltage
  float currentRMS = sqrt(currentSum / samples); // True RMS for current

  // Calculate Real Power (assuming pure resistive load)
  float realPower = voltageRMS * currentRMS;

  // Calculate Power Factor (cosine of the phase angle between voltage and current)
  float powerFactor = realPower / (voltageRMS * currentRMS);

  // Add sensor data to JSON object
  content.set("fields/Voltage/doubleValue", voltageRMS);
  content.set("fields/Current/doubleValue", currentRMS);
  content.set("fields/Power/doubleValue", realPower);
  content.set("fields/PowerFactor/doubleValue", powerFactor);
  content.set("fields/Timestamp/stringValue", getFormattedTimestamp(rawTime));

  Serial.println("Updating Firestore document...");

  // Update Firestore document
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", 
      documentPath.c_str(), content.raw())) {
    Serial.println("Document created successfully in " + collectionName);
  } else {
    Serial.print("Document creation failed in " + collectionName + ": ");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {
  // Update NTP time
  timeClient.update();

  // Get current time
  time_t rawTime = timeClient.getEpochTime();

  unsigned long currentMillis = millis();

  // Update Every2Seconds collection every 2 seconds
  if (currentMillis - previousMillis2s >= interval2s) {
    previousMillis2s = currentMillis;
    updateCollection("Every2Seconds", rawTime);
  }

  // Update Every2Minutes collection every 2 minutes
  if (currentMillis - previousMillis2m >= interval2m) {
    previousMillis2m = currentMillis;
    updateCollection("Every2Minutes", rawTime);
  }
}
=======
#if defined(ESP32) 
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>  // For token status callback
#include <math.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <TimeLib.h>

// Pin Definitions
const int voltagePin = A0;      // Shared A0 pin for both voltage and current sensors
const int currentSensorPin = D1; // Digital pin to switch between voltage and current sensors

// Constants
const float voltageCalibration = 230.0 / 1024.0; // Adjust for your ZMPT101B sensor (scaling factor)
const float currentCalibration = 30.0 / 1024.0;  // Adjust for ACS712 sensor (scaling factor)

// Sampling Settings
const int samples = 2000;       // Number of samples
const int sampleInterval = 1;   // Sampling interval in microseconds

// Wi-Fi credentials
#define WIFI_SSID "Dialog 4G 586"
#define WIFI_PASSWORD "9595119D"

// Firebase credentials
#define API_KEY "AIzaSyDnap4gRt1dgAZHsAvBVpP7qafrU8S9nYg"
#define FIREBASE_PROJECT_ID "environmental-conditions"
#define USER_EMAIL "heshanchanuka7@gmail.com"
#define USER_PASSWORD "heshanC2525"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// NTP setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every minute

// Time offset (in seconds) for Sri Lankan local time (GMT+5:30)
int timeOffset = 5 * 3600 + 30 * 60; // GMT+5:30

// Variables to manage timing
unsigned long previousMillis2s = 0;
unsigned long previousMillis2m = 0;
const unsigned long interval2s = 2000;  // 2 seconds
const unsigned long interval2m = 120000; // 2 minutes

// Function to generate ISO 8601 formatted timestamp
String getFormattedTimestamp(time_t rawTime) {
  time_t localTime = rawTime + timeOffset; // Apply GMT+5:30 offset
  char buffer[30];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02d.000Z", 
          year(localTime), month(localTime), day(localTime), 
          hour(localTime), minute(localTime), second(localTime));
  return String(buffer);
}

void setup() {
  // Start Serial Monitor
  Serial.begin(115200);
  delay(500);

  // Initialize the digital pin to control sensor selection
  pinMode(currentSensorPin, OUTPUT);
  digitalWrite(currentSensorPin, LOW);  // Start with voltage sensor

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize NTP
  timeClient.begin();
  Serial.println("Synchronizing time with NTP server...");
  int retryCount = 0;

  while (!timeClient.update()) {
    delay(500);
    retryCount++;
    if (retryCount > 20) { // Increase the number of retries
      Serial.println("Failed to synchronize time with NTP server. Switching to an alternative...");
      timeClient.setPoolServerName("time.google.com"); // Switch to Google's NTP server
      retryCount = 0;
    }
  }
  
  if (timeClient.getEpochTime() > 0) {
    Serial.println("Time synchronized successfully!");
    Serial.print("Current UTC Time: ");
    Serial.println(timeClient.getFormattedTime());
  } else {
    Serial.println("NTP synchronization failed after multiple attempts.");
  }

  // Configure Firebase
  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback; // Optional debug callback

  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void updateCollection(String collectionName, time_t rawTime) {
  // Generate unique document ID with local time
  char documentID[20];
  sprintf(documentID, "%04d%02d%02d_%02d%02d%02d", 
          year(rawTime), month(rawTime), day(rawTime), 
          hour(rawTime), minute(rawTime), second(rawTime));

  // Firestore document path
  String documentPath = collectionName + "/" + String(documentID);

  // Create FirebaseJson object for data
  FirebaseJson content;

  float voltageSum = 0.0;
  float currentSum = 0.0;

  // Collect samples and compute squared values
  for (int i = 0; i < samples; i++) {
    // First, read voltage (ZMPT101B)
    digitalWrite(currentSensorPin, LOW);  // Set to read voltage
    int rawVoltage = analogRead(voltagePin);
    float voltage = (rawVoltage - 512) * voltageCalibration; // Remove DC offset and scale to voltage
    voltageSum += voltage * voltage; // Square voltage

    // Then, read current (ACS712)
    digitalWrite(currentSensorPin, HIGH);  // Set to read current
    int rawCurrent = analogRead(voltagePin);
    float current = (rawCurrent - 512) * currentCalibration; // Remove DC offset and scale to current
    currentSum += current * current; // Square current

    delayMicroseconds(sampleInterval); // Sampling interval
  }

  // Calculate RMS values
  float voltageRMS = sqrt(voltageSum / samples); // True RMS for voltage
  float currentRMS = sqrt(currentSum / samples); // True RMS for current

  // Calculate Real Power (assuming pure resistive load)
  float realPower = voltageRMS * currentRMS;

  // Calculate Power Factor (cosine of the phase angle between voltage and current)
  float powerFactor = realPower / (voltageRMS * currentRMS);

  // Add sensor data to JSON object
  content.set("fields/Voltage/doubleValue", voltageRMS);
  content.set("fields/Current/doubleValue", currentRMS);
  content.set("fields/Power/doubleValue", realPower);
  content.set("fields/PowerFactor/doubleValue", powerFactor);
  content.set("fields/Timestamp/stringValue", getFormattedTimestamp(rawTime));

  Serial.println("Updating Firestore document...");

  // Update Firestore document
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", 
      documentPath.c_str(), content.raw())) {
    Serial.println("Document created successfully in " + collectionName);
  } else {
    Serial.print("Document creation failed in " + collectionName + ": ");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {
  // Update NTP time
  timeClient.update();

  // Get current time
  time_t rawTime = timeClient.getEpochTime();

  unsigned long currentMillis = millis();

  // Update Every2Seconds collection every 2 seconds
  if (currentMillis - previousMillis2s >= interval2s) {
    previousMillis2s = currentMillis;
    updateCollection("Every2Seconds", rawTime);
  }

  // Update Every2Minutes collection every 2 minutes
  if (currentMillis - previousMillis2m >= interval2m) {
    previousMillis2m = currentMillis;
    updateCollection("Every2Minutes", rawTime);
  }
}
>>>>>>> 7774244943c2b1052cd428e8a4c7d095c495d110
