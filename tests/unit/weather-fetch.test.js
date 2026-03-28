import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need separate tests for the weather service when API key IS configured
// This tests the fetch path (lines 19-56 in weather.js)

describe('Weather Service — with API key', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('fetches real weather when API key is present', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        weatherApiKey: 'test-api-key-123',
        gcpProjectId: '',
        nodeEnv: 'test',
      },
    }));

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        list: [
          {
            dt_txt: '2026-03-28 09:00:00',
            main: { temp: 30, feels_like: 34, humidity: 70 },
            weather: [{ description: 'clear sky' }],
            wind: { speed: 5 },
            rain: { '3h': 0 },
            clouds: { all: 20 },
          },
        ],
        city: { name: 'Vijayawada', country: 'IN' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { getWeatherForecast } = await import('../../server/services/weather.js');
    const result = await getWeatherForecast(16.5, 80.6);

    expect(result.available).toBe(true);
    expect(result.location).toBe('Vijayawada');
    expect(result.country).toBe('IN');
    expect(result.forecast[0].temp).toBe(30);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('falls back to demo on non-OK response', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        weatherApiKey: 'test-api-key-123',
        gcpProjectId: '',
        nodeEnv: 'test',
      },
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ message: 'Invalid API key' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { getWeatherForecast } = await import('../../server/services/weather.js');
    const result = await getWeatherForecast(16.5, 80.6);

    expect(result.available).toBe(true);
    expect(result.isDemoData).toBe(true);
  });

  it('falls back to demo on fetch error', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        weatherApiKey: 'test-api-key-123',
        gcpProjectId: '',
        nodeEnv: 'test',
      },
    }));

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { getWeatherForecast } = await import('../../server/services/weather.js');
    const result = await getWeatherForecast(16.5, 80.6);

    expect(result.available).toBe(true);
    expect(result.isDemoData).toBe(true);
  });

  it('handles JSON parse failure on error response', async () => {
    vi.mock('../../server/config.js', () => ({
      default: {
        weatherApiKey: 'test-api-key-123',
        gcpProjectId: '',
        nodeEnv: 'test',
      },
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { getWeatherForecast } = await import('../../server/services/weather.js');
    const result = await getWeatherForecast(16.5, 80.6);

    expect(result.isDemoData).toBe(true);
  });
});
