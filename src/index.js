const express = require("express")
const cors = require("cors")
const mqtt = require("mqtt")
require("dotenv").config()

const app = express();
app.use(cors());
app.use(express.json());

let sensorData = { soil: 0, humidity: 0 };
console.log(process.env.MQTT_BROKER)
// Connect to MQTT Broker
const client = mqtt.connect(`${process.env.MQTT_BROKER}`);

client.on("connect", () => {
  console.log("Connected to MQTT broker");
  client.subscribe("esp32/sensor", (err) => {
    if (!err) console.log("Subscribed to esp32/sensor");
  });
});

client.on("message", (topic, message) => {
  if (topic === "esp32/sensor") {
    try {
      sensorData = JSON.parse(message.toString());
      console.log("Received:", sensorData);
    } catch (e) {
      console.error("Invalid JSON:", e);
    }
  }
});

// React client fetches this data
app.get("/api/sensor", (req, res) => {
  res.json(sensorData);
});

app.listen(5000, () => console.log("Server running on port 5000"));