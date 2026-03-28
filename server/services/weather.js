import config from '../config.js';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetches a 5-day weather forecast for given coordinates.
 * Returns structured data ready for Gemini context injection.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>} Forecast data
 */
export async function getWeatherForecast(lat, lon) {
  if (!config.weatherApiKey) {
    console.warn('⚠️  No weather API key configured. Using demo forecast data.');
    return getDemoForecast(lat, lon);
  }

  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${config.weatherApiKey}&units=metric`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.warn(`⚠️  Weather API returned ${response.status}: ${body.message || response.statusText}`);
      console.warn('   Falling back to demo forecast data.');
      return getDemoForecast(lat, lon);
    }

    const data = await response.json();

    // Transform to a concise format for Gemini
    const forecast = data.list.slice(0, 16).map((item) => ({
      datetime: item.dt_txt,
      temp: item.main.temp,
      feelsLike: item.main.feels_like,
      humidity: item.main.humidity,
      description: item.weather[0]?.description || '',
      windSpeed: item.wind.speed,
      rainMm: item.rain?.['3h'] || 0,
      cloudCover: item.clouds.all,
    }));

    return {
      available: true,
      location: data.city?.name || 'Unknown',
      country: data.city?.country || '',
      forecast,
    };
  } catch (error) {
    console.warn(`⚠️  Weather fetch failed: ${error.message}. Using demo forecast.`);
    return getDemoForecast(lat, lon);
  }
}

/**
 * Returns a realistic demo weather forecast showing an approaching cyclone.
 * Used when OpenWeatherMap API is unavailable or returns an error.
 * This ensures Gemini always has weather context to provide life-saving recommendations.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {object}
 */
function getDemoForecast(lat, lon) {
  const now = new Date();
  const formatDt = (hoursOffset) => {
    const d = new Date(now.getTime() + hoursOffset * 3600000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };

  return {
    available: true,
    location: 'Demo Location',
    country: lat > 0 && lon > 60 ? 'IN' : 'XX',
    isDemoData: true,
    forecast: [
      { datetime: formatDt(3),  temp: 29.1, feelsLike: 33.2, humidity: 71, description: 'scattered clouds', windSpeed: 6.1,  rainMm: 0,    cloudCover: 45 },
      { datetime: formatDt(6),  temp: 34.5, feelsLike: 39.8, humidity: 58, description: 'broken clouds',    windSpeed: 7.3,  rainMm: 0,    cloudCover: 68 },
      { datetime: formatDt(9),  temp: 36.2, feelsLike: 41.1, humidity: 52, description: 'overcast clouds',  windSpeed: 8.9,  rainMm: 0,    cloudCover: 82 },
      { datetime: formatDt(12), temp: 32.8, feelsLike: 37.4, humidity: 63, description: 'overcast clouds',  windSpeed: 10.2, rainMm: 0.5,  cloudCover: 90 },
      { datetime: formatDt(24), temp: 27.5, feelsLike: 31.2, humidity: 78, description: 'light rain',       windSpeed: 14.5, rainMm: 4.2,  cloudCover: 95 },
      { datetime: formatDt(30), temp: 28.1, feelsLike: 32.8, humidity: 85, description: 'moderate rain',    windSpeed: 22.3, rainMm: 18.7, cloudCover: 100 },
      { datetime: formatDt(36), temp: 25.4, feelsLike: 28.9, humidity: 92, description: 'heavy intensity rain', windSpeed: 35.6, rainMm: 42.5, cloudCover: 100 },
      { datetime: formatDt(48), temp: 23.2, feelsLike: 26.1, humidity: 96, description: 'heavy intensity rain', windSpeed: 48.2, rainMm: 65.3, cloudCover: 100 },
    ],
  };
}

/**
 * Formats weather data into a concise text summary for Gemini context
 * @param {object} weatherData
 * @returns {string}
 */
export function formatWeatherForGemini(weatherData) {
  if (!weatherData.available) {
    return 'Weather data unavailable. Please estimate conditions based on the images and sensor data provided.';
  }

  let summary = `📍 Weather Forecast for ${weatherData.location}, ${weatherData.country}:\n`;
  for (const f of weatherData.forecast) {
    summary += `  ${f.datetime}: ${f.temp}°C (feels ${f.feelsLike}°C), ${f.description}, `;
    summary += `humidity ${f.humidity}%, wind ${f.windSpeed}m/s, rain ${f.rainMm}mm\n`;
  }
  return summary;
}
