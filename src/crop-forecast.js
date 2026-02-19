const { updateReadingsForecastId } = require("./data-access");
const dotenv = require("dotenv");
dotenv.config();

const crops = [
  {
    name: "Eggplant",
    temperature: [25, 32],
    humidity: [70, 85],
    soilMoisture: [60, 70],
    npk: [4.2, 185],
  },
  {
    name: "Sweet Potatoes",
    temperature: [21, 28],
    humidity: [70, 85],
    soilMoisture: [60, 70],
    npk: [4.2, 185],
  },
  {
    name: "Okra",
    temperature: [25, 35],
    humidity: [70, 90],
    soilMoisture: [60, 70],
    npk: [4.2, 185],
  },
  {
    name: "Ampalaya",
    temperature: [24, 30],
    humidity: [70, 85],
    soilMoisture: [60, 70],
    npk: [4.2, 185],
  },
  {
    name: "String Beans",
    temperature: [22, 30],
    humidity: [70, 80],
    soilMoisture: [55, 65],
    npk: [4.2, 185],
  },
  {
    name: "Potatoes",
    temperature: [18, 25],
    humidity: [70, 80],
    soilMoisture: [65, 75],
    npk: [8.5, 185],
  },
  {
    name: "Corn",
    temperature: [24, 30],
    humidity: [70, 80],
    soilMoisture: [65, 75],
    npk: [4.2, 185],
  },
  {
    name: "Rice",
    temperature: [24, 35],
    humidity: [80, 90],
    soilMoisture: [80, 90],
    npk: [4.2, 185],
  },
  {
    name: "Tomatoes",
    temperature: [21, 27],
    humidity: [70, 85],
    soilMoisture: [60, 70],
    npk: [4.2, 185],
  },
  {
    name: "Mung Beans",
    temperature: [25, 30],
    humidity: [70, 85],
    soilMoisture: [50, 60],
    npk: [4.2, 185],
  },
];

// Function to check if a value is inside a range
const inRange = (val, [min, max]) => val >= min && val <= max;

/**
 * Get best matching crop based on sensor data
 * @param {Object} sensorData { temperature, humidity, soil_moisture, npk }
 * @returns {Object} { crop: "Crop Name", matchPercent: 0–100 }
 */
function cropForecast(sensorData) {
  const { temperature, humidity, soil_moisture, npk } = sensorData;

  let bestMatch = null;
  let highestScore = process.env.prediction_score;
  let cropPredictions = [];

  crops.forEach((crop) => {
    console.log("🚀 ~ cropForecast ~ crop:", crop.name);

    let score = 0;
    if (inRange(temperature, crop.temperature)) score += 25;
    if (inRange(humidity, crop.humidity)) score += 25;
    if (inRange(soil_moisture, crop.soilMoisture)) score += 25;
    if (inRange(npk, crop.npk)) score += 25;

    if (score > highestScore) {
      // highestScore = score;
      bestMatch = crop.name;
      console.log("🚀 ~ cropForecast ~ score:", score);
      console.log("🚀 ~ cropForecast ~ crop.name:", crop.name);
      cropPredictions.push(crop.name);
    }
  });

  return bestMatch
    ? {
        crop: cropPredictions.length ? cropPredictions.join(", ") : "",
        crops: cropPredictions,
        matchPercent: highestScore,
      }
    : { crop: "No suitable crop found", matchPercent: 0 };
}

module.exports = { cropForecast };
