// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const { cropForecast } = require("./crop-forecast");
const { recordCrop, getAllCropForecast, recordSensorReadings, getSensorReadings, getScheduledReading, addScheduleReading, sensorReadings, filterCropForecastByDate, updateReadingsForecastId } = require("./data-access");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let sensorData = { humidity: 0, temperature: 0, soil_moisture: 0, npk: 0 };

async function recordInitialScheduledReading(sensorReadings) {
  
}

// REST endpoint (for ESP32)
app.post("/api/sensor", async (req, res) => {
  const { temperature, humidity, soil_moisture, npk } = req.body;
  sensorData = { temperature, humidity, soil_moisture, npk };
  // sensorData.cropPrediction = cropForecast(sensorData);

  console.log("Received sensor data:", sensorData);
  
  // fetch 1 row of latest minute counter
  const timeReading = await getScheduledReading();
  console.log("🚀 ~ timeReading:", timeReading.time_count)

  sensorData.is_firstreading = false;
  const readingsCount = await sensorReadings();
  // console.log("🚀 ~ readingsCount:", readingsCount)
  // fetch latest readings starting from the initial readings and count it
  console.log("🚀 ~ readingsCount.length:", readingsCount.length)
  if(readingsCount.length >= timeReading.time_count || readingsCount.length === 0){
    const averageReadings = readingsCount.reduce(
      (acc, curr) => {
        acc.temperature += parseFloat(curr.temperature);
        acc.humidity += parseFloat(curr.humidity);
        acc.soil_moisture += parseFloat(curr.soil_moisture);
        acc.npk += parseFloat(curr.npk);
        acc.count += 1;
        return acc;
      },
      { temperature: 0, humidity: 0, soil_moisture: 0, npk: 0, count: 0 }
    );

    const averages = {
      temperature: (averageReadings.temperature / averageReadings.count).toFixed(2),
      humidity: (averageReadings.humidity / averageReadings.count).toFixed(2),
      soil_moisture: (averageReadings.soil_moisture / averageReadings.count).toFixed(2),
      npk: (averageReadings.npk / averageReadings.count).toFixed(2),
    };

    console.log("🚀 ~ averages:", averages)
    sensorData.is_firstreading = true;
    sensorData.cropPrediction = cropForecast(averages);
    sensorData.crop_name = sensorData.cropPrediction.crop;

    if(sensorData.cropPrediction.matchPercent > process.env.prediction_score){
      const crop = await recordCrop(sensorData);
      console.log("🚀 ~ crop:", crop)
      readingsCount.map(async (reading) =>{ 
        await updateReadingsForecastId(crop.crop_id, reading.sensor_readings_id)
      })
    }
    
    console.log("🚀 ~ sensorData.cropPrediction:", sensorData.cropPrediction)
    // await recordCrop(sensorData);
  }

  console.log("🚀 ~ sensorData.is_firstreading:", sensorData.is_firstreading)
  
  // Broadcast to all connected clients
  io.emit("sensor-update", sensorData);
  // sensorData.crop_name = sensorData.cropPrediction.crop;

  
  await recordSensorReadings(sensorData);

  res.json({ status: "ok" });
});

// Optional: allow client to fetch current data manually
app.get("/api/sensor", (req, res) => {
  res.json(sensorData);
});

app.get("/getAllCropForecast", async (req, res) => {
  try {
    const crops = await getAllCropForecast();
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/getSensorReadings", async (req, res) => {
  try {
    const crops = await getSensorReadings();
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/getScheduledReading", async (req, res) => {
  try {
    const schedule = await getScheduledReading();
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/addScheduleReading", async (req, res) => {
  try {
    const { timeCount } = req.body;
    console.log("🚀 ~ timeCount:", timeCount)
    const schedule = await addScheduleReading(timeCount);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/filterCropForecastByDate", async (req, res) => {
  try {
    const { start, end } = req.query;
    console.log("🚀 ~ req.query:", req.query)
    const filteredCropForest = await filterCropForecastByDate(start, end);
    res.json(filteredCropForest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  // Send current data on connection
  socket.emit("sensor-update", sensorData);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

server.listen(5000, () => console.log("Server running on port 5000"));
