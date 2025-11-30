const { format, formatInTimeZone } = require("date-fns-tz");
const pool = require("./db");

async function recordCrop(cropData) {
  const { crop_name, temperature, humidity, soil_moisture, npk } = cropData;

  const isCropExists = await getExistingCropConditions(crop_name);
  const now = new Date().toISOString();

  if (isCropExists) {
    return;
  }
  const query = `
    INSERT INTO crop_forecasting_data 
    (crop_name, temperature, humidity, soil_moisture, npk)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;
  const values = [crop_name, temperature, humidity, soil_moisture, npk];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getAllCropForecast() {
  const result = await pool.query(
    "SELECT * FROM crop_forecasting_data ORDER BY created_at ASC;"
  );
  return result.rows;
}

async function getExistingCropConditions(cropName) {
  const now = new Date();
  const formattedDate = formatInTimeZone(now, "Asia/Manila", "yyyy-MM-dd");
  console.log("Formatted Date:", formattedDate);
  const query = `
    SELECT * FROM crop_forecasting_data WHERE crop_name = $1 and created_at::date = $2::date;
  `;
  const values = [cropName, formattedDate];
  const result = await pool.query(query, values);
  return result?.rows.length > 0;
}

async function recordSensorReadings(sensorData) {
  const { temperature, humidity, soil_moisture, npk } = sensorData;
  const query = `
    INSERT INTO sensor_readings 
    (temperature, humidity, soil_moisture, npk)
    VALUES ($1,$2,$3,$4)
    RETURNING *;
  `;
  const values = [temperature, humidity, soil_moisture, npk];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getSensorReadings() {
  const result = await pool.query(
    "SELECT * FROM sensor_readings ORDER BY created_at DESC;"
  );
  return result.rows;
}

module.exports = {
  recordCrop,
  getAllCropForecast,
  recordSensorReadings,
  getSensorReadings,
};
