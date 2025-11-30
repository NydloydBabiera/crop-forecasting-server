// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const { cropForecast } = require("./crop-forecast");
const { recordCrop, getAllCropForecast, recordSensorReadings, getSensorReadings } = require("./data-access");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let sensorData = { humidity: 0, temperature: 0, soil_moisture: 0, npk: 0 };

// REST endpoint (for ESP32)
app.post("/api/sensor", async (req, res) => {
  const { temperature, humidity, soil_moisture, npk } = req.body;
  sensorData = { temperature, humidity, soil_moisture, npk };
  sensorData.cropPrediction = cropForecast(sensorData);

  console.log("Received sensor data:", sensorData);
  // Broadcast to all connected clients
  io.emit("sensor-update", sensorData);
  sensorData.crop_name = sensorData.cropPrediction.crop;
  // record crop data in the database
  await recordCrop(sensorData);
  
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

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  // Send current data on connection
  socket.emit("sensor-update", sensorData);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

server.listen(5000, () => console.log("Server running on port 5000"));
