#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>  // For token status callback
#include <DHT.h>                 // Include the DHT sensor library
#include <BH1750.h>
#include <Wire.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <TimeLib.h>

// Define DHT sensor parameters
#define DHTPIN D4       // Pin where the DHT sensor is connected
#define DHTTYPE DHT22   // DHT22 sensor type
DHT dht(DHTPIN, DHTTYPE); // Initialize the DHT sensor instance

// BH1750 sensor SDA and SCL pins
#define SDA_PIN D2
#define SCL_PIN D1

// Wi-Fi credentials
#define WIFI_SSID "Dialog 4G 586"
#define WIFI_PASSWORD "9595119D"

// Firebase credentials
#define API_KEY "AIzaSyDnap4gRt1dgAZHsAvBVpP7qafrU8S9nYg"
#define FIREBASE_PROJECT_ID "environmental-conditions"

// User credentials
#define USER_EMAIL "heshanchanuka7@gmail.com"
#define USER_PASSWORD "heshanC2525"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// BH1750 light sensor
BH1750 lightMeter;

// NTP setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every minute

void setup() {
  // Start Serial Monitor
  Serial.begin(115200);
  delay(500);

  // Initialize DHT Sensor
  dht.begin();
  Serial.println("DHT22 sensor initialized.");

  // Initialize BH1750 Light Sensor
  Wire.begin(SDA_PIN, SCL_PIN);
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 sensor initialized.");
  } else {
    Serial.println("BH1750 Initialization Failed. Check connections!");
    while (1); // Stop execution
  }

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

void loop() {
  // Firestore document path
  String documentPath = "environmentalData/Data"; // Use 'Data' as the document ID

  // Create FirebaseJson object for data
  FirebaseJson content;

  // Read DHT22 sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float lux = lightMeter.readLightLevel();

  // Update NTP time
  timeClient.update();

  // Get current time in ISO 8601 format
  time_t rawTime = timeClient.getEpochTime();
  char timestamp[25];
  sprintf(timestamp, "%04d-%02d-%02dT%02d:%02d:%02dZ", 
          year(rawTime), month(rawTime), day(rawTime), 
          hour(rawTime), minute(rawTime), second(rawTime));

  // Check for valid sensor data
  if (!isnan(temperature) && !isnan(humidity) && !isnan(lux)) {
    // Add sensor data to JSON object
    content.set("fields/Temperature/doubleValue", temperature);
    content.set("fields/Humidity/doubleValue", humidity);
    content.set("fields/Light/doubleValue", lux);
    content.set("fields/Timestamp/timestampValue", String(timestamp)); // Add formatted timestamp

    Serial.println("Updating Firestore document...");

    // Update Firestore document
    if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", 
        documentPath.c_str(), content.raw(), "Temperature,Humidity,Light,Timestamp")) {
      Serial.println("Firestore document updated successfully!");
    } else {
      Serial.print("Firestore update failed: ");
      Serial.println(fbdo.errorReason());
    }
  } else {
    Serial.println("Sensor reading failed. Check connections!");
  }

  delay(2000); // Delay before the next loop
}
