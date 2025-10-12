// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let sensorData = { humidity: 0, temperature: 0 };

// REST endpoint (for ESP32)
app.post("/api/sensor", (req, res) => {
  const { temperature, humidity } = req.body;
  sensorData = { temperature, humidity };
  console.log("Received:", sensorData);

  // Broadcast to all connected clients
  io.emit("sensor-update", sensorData);

  res.json({ status: "ok" });
});

// Optional: allow client to fetch current data manually
app.get("/api/sensor", (req, res) => {
  res.json(sensorData);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  // Send current data on connection
  socket.emit("sensor-update", sensorData);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

server.listen(5000, () => console.log("Server running on port 5000"));
