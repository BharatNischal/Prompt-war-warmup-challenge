import { describe, it, expect, vi } from 'vitest';
import { getWeatherForecast, formatWeatherForGemini } from '../../server/services/weather.js';

// Mock config
vi.mock('../../server/config.js', () => ({
  default: {
    weatherApiKey: '',
    gcpProjectId: '',
    nodeEnv: 'test',
  },
}));

describe('Weather Service', () => {
  describe('getWeatherForecast', () => {
    it('returns demo forecast when no API key configured', async () => {
      const result = await getWeatherForecast(16.5, 80.6);
      expect(result.available).toBe(true);
      expect(result.isDemoData).toBe(true);
      expect(result.forecast).toHaveLength(8);
    });

    it('demo forecast has correct structure', async () => {
      const result = await getWeatherForecast(16.5, 80.6);
      const item = result.forecast[0];
      expect(item).toHaveProperty('datetime');
      expect(item).toHaveProperty('temp');
      expect(item).toHaveProperty('feelsLike');
      expect(item).toHaveProperty('humidity');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('windSpeed');
      expect(item).toHaveProperty('rainMm');
      expect(item).toHaveProperty('cloudCover');
    });

    it('demo forecast shows escalating storm pattern', async () => {
      const result = await getWeatherForecast(16.5, 80.6);
      const first = result.forecast[0];
      const last = result.forecast[result.forecast.length - 1];
      expect(last.windSpeed).toBeGreaterThan(first.windSpeed);
      expect(last.rainMm).toBeGreaterThan(first.rainMm);
    });

    it('returns IN country code for Indian coordinates', async () => {
      const result = await getWeatherForecast(16.5, 80.6);
      expect(result.country).toBe('IN');
    });

    it('returns XX country code for non-Indian coordinates', async () => {
      const result = await getWeatherForecast(-33.8, 151.2); // Sydney
      expect(result.country).toBe('XX');
    });

    it('demo forecast datetime format is correct', async () => {
      const result = await getWeatherForecast(16.5, 80.6);
      const dt = result.forecast[0].datetime;
      // Should be in "YYYY-MM-DD HH:MM:SS" format
      expect(dt).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });

  describe('formatWeatherForGemini', () => {
    it('formats available weather data as text summary', () => {
      const weatherData = {
        available: true,
        location: 'Vijayawada',
        country: 'IN',
        forecast: [
          {
            datetime: '2026-03-28 09:00:00',
            temp: 29.1,
            feelsLike: 33.2,
            humidity: 71,
            description: 'scattered clouds',
            windSpeed: 6.1,
            rainMm: 0,
          },
        ],
      };

      const text = formatWeatherForGemini(weatherData);
      expect(text).toContain('Vijayawada');
      expect(text).toContain('29.1°C');
      expect(text).toContain('scattered clouds');
      expect(text).toContain('humidity 71%');
      expect(text).toContain('wind 6.1m/s');
    });

    it('returns fallback message when weather unavailable', () => {
      const text = formatWeatherForGemini({ available: false });
      expect(text).toContain('unavailable');
    });

    it('formats multiple forecast entries', () => {
      const weatherData = {
        available: true,
        location: 'Test City',
        country: 'IN',
        forecast: [
          { datetime: '2026-03-28 09:00:00', temp: 28, feelsLike: 32, humidity: 70, description: 'clear', windSpeed: 5, rainMm: 0 },
          { datetime: '2026-03-28 12:00:00', temp: 35, feelsLike: 40, humidity: 50, description: 'clouds', windSpeed: 8, rainMm: 2 },
        ],
      };

      const text = formatWeatherForGemini(weatherData);
      expect(text).toContain('28°C');
      expect(text).toContain('35°C');
      expect(text).toContain('rain 2mm');
    });
  });
});
