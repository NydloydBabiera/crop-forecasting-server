const { format, formatInTimeZone } = require("date-fns-tz");
const pool = require("./db");

async function recordCrop(cropData) {
  const { crop_name, temperature, humidity, soil_moisture, npk } = cropData;

  const isCropExists = await getExistingCropConditions(crop_name);
  const now = new Date().toISOString();

  // if (isCropExists) {
  //   return;
  // }
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

async function filterCropForecastByDate(start, end) {
  const result = await pool.query(
    `
    SELECT
      CASE WHEN r.sensor_readings_id IS NULL THEN c.crop_name ELSE '' END as crop_name,
      r.crop_id,
      r.sensor_readings_id,

      ROUND(AVG(r.temperature)::numeric, 2)     AS temperature,
      ROUND(AVG(r.humidity)::numeric, 2) AS humidity,
      ROUND(AVG(r.soil_moisture)::numeric, 2) AS soil_moisture,
      ROUND(AVG(r.npk)::numeric, 2)      AS npk,

      CASE
        WHEN GROUPING(r.sensor_readings_id) = 0 THEN 1   -- individual readings
        WHEN GROUPING(r.crop_id) = 0 THEN 2       -- crop average (yellow)
        ELSE 3                                    -- overall average (green)
      END AS sort_order,

      CASE
        WHEN GROUPING(r.sensor_readings_id) = 0 THEN 'READING'
        WHEN GROUPING(r.crop_id) = 0 THEN 'CROP_AVG'
        ELSE 'OVERALL_AVG'
      END AS row_type

    FROM sensor_readings r
    JOIN crop_forecasting_data c ON c.crop_id = r.crop_id
    WHERE c.created_at BETWEEN $1 AND $2
    GROUP BY GROUPING SETS (
      (c.crop_name, r.crop_id, r.sensor_readings_id),
      (c.crop_name, r.crop_id),
      ()                                       
    )

    ORDER BY
      r.crop_id NULLS LAST,
      sort_order,
      r.sensor_readings_id;
    `,
    [start, end]
  );

  return result.rows;
}

async function getExistingCropConditions(cropName) {
  const now = new Date();
  const formattedDate = formatInTimeZone(now, "Asia/Manila", "yyyy-MM-dd");
  const query = `
    SELECT * FROM crop_forecasting_data WHERE crop_name = $1 and created_at::date = $2::date;
  `;
  const values = [cropName, formattedDate];
  const result = await pool.query(query, values);
  return result?.rows.length > 0;
}

async function recordSensorReadings(sensorData) {
  const { temperature, humidity, soil_moisture, npk, is_firstreading } = sensorData;
  const query = `
    INSERT INTO sensor_readings 
    (temperature, humidity, soil_moisture, npk, is_firstreading)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;
  const values = [temperature, humidity, soil_moisture, npk, is_firstreading];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getSensorReadings() {
  const result = await pool.query(
    "SELECT * FROM sensor_readings ORDER BY created_at DESC;"
  );
  return result.rows;
}

async function disableCurrentReading() {
  const query = `
    UPDATE schedule_reading
    SET is_active = false
    WHERE is_active = true
    RETURNING *
  `;

  const result = await pool.query(query);

  return result
}

async function addScheduleReading(timeCount) {
  const query = `
    INSERT INTO schedule_reading 
    (time_count, is_active)
    VALUES ($1, $2)
    RETURNING *;
  `;

  await disableCurrentReading();

  const values = [timeCount, true];
  const result = await pool.query(query, values);
  return result?.rows[0];
}

async function getScheduledReading() {
  const result = await pool.query(
    "SELECT * FROM schedule_reading WHERE is_active = true;"
  );
  return result?.rows[0];
}

async function sensorReadings() {
  const result = await pool.query(
    `SELECT *
    FROM sensor_readings
    WHERE sensor_readings_id >= (
        SELECT MAX(sensor_readings_id)
        FROM sensor_readings
        WHERE is_firstreading = true
    )
    ORDER BY sensor_readings_id desc;`
  );
  return result?.rows;
}

async function updateReadingsForecastId(cropId,sensorReadingsId) {
  const query = `
    UPDATE sensor_readings
    SET crop_id = $1
    where sensor_readings_id = $2
    RETURNING *
  `;

  const values = [cropId, sensorReadingsId];
  const result = await pool.query(query, values);
  return result?.rows[0];
}

module.exports = {
  recordCrop,
  getAllCropForecast,
  recordSensorReadings,
  getSensorReadings,
  addScheduleReading,
  getScheduledReading,
  sensorReadings,
  filterCropForecastByDate,
  updateReadingsForecastId
};
